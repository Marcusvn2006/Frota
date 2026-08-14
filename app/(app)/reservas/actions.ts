"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export type ReservaFormState =
  | { error: string; success?: never }
  | { success: string; error?: never }
  | null;

// Converte "YYYY-MM-DDTHH:mm" (input local BRT) → ISO com timezone BRT
function toBRT(local: string): string {
  return local + ":00-03:00";
}

// Extrai destinos do FormData (destino_0, destino_1, …)
function getDestinos(formData: FormData): string[] {
  const map: Record<number, string> = {};
  formData.forEach((value, key) => {
    if (key.startsWith("destino_")) {
      const idx = parseInt(key.replace("destino_", ""), 10);
      if (typeof value === "string" && value.trim()) {
        map[idx] = value.trim();
      }
    }
  });
  return Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)
    .map((k) => map[k]);
}

const reservaSchema = z
  .object({
    motorista: z.string().min(2, "Nome do motorista deve ter pelo menos 2 caracteres"),
    inicio: z.string().min(1, "Data/hora de início obrigatória"),
    fim: z.string().min(1, "Data/hora de fim obrigatória"),
  })
  .refine((d) => new Date(d.fim) > new Date(d.inicio), {
    message: "O horário de fim deve ser após o início",
    path: ["fim"],
  })
  // Margem de 1 min: evita falsear "está no passado" pelo tempo entre o
  // usuário abrir o formulário (defaultValue calculado então) e enviar.
  .refine((d) => new Date(toBRT(d.inicio)) > new Date(Date.now() - 60_000), {
    message: "A data/hora de início não pode estar no passado",
    path: ["inicio"],
  });

// ─── Funcionário cria reserva (pendente, sem veículo) ─────────────────────────

export async function criarReservaAction(
  _prev: ReservaFormState,
  formData: FormData
): Promise<ReservaFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const parsed = reservaSchema.safeParse({
    motorista: formData.get("motorista"),
    inicio: formData.get("inicio"),
    fim: formData.get("fim"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const destinos = getDestinos(formData);
  if (destinos.length === 0) return { error: "Adicione pelo menos um destino." };

  const { data: reserva, error } = await supabase
    .from("reservas")
    .insert({
      solicitante_id: user.id,
      motorista_id: user.id,
      motorista: parsed.data.motorista,
      inicio: toBRT(parsed.data.inicio),
      fim: toBRT(parsed.data.fim),
      status: "pendente",
      origem: "solicitacao",
    })
    .select("id")
    .single();

  if (error || !reserva) return { error: "Erro ao criar reserva. Tente novamente." };

  const { error: destinosError } = await supabase.from("reserva_destinos").insert(
    destinos.map((d, i) => ({ reserva_id: reserva.id, destino: d, ordem: i + 1 }))
  );

  if (destinosError) {
    // Sem isso, a reserva ficaria "fantasma": criada, aprovável pelo gestor,
    // mas sem nenhum destino registrado. Deleta via admin porque o RLS de
    // DELETE em reservas só permite gestor — o funcionário não conseguiria
    // desfazer a própria reserva recém-criada com o client autenticado.
    await createAdminClient().from("reservas").delete().eq("id", reserva.id);
    return { error: "Erro ao salvar os destinos. Tente novamente." };
  }

  revalidatePath("/reservas");
  revalidatePath("/minhas-reservas");
  return { success: "Solicitação enviada! Aguarde a aprovação do gestor." };
}

// ─── Gestor cria reserva diretamente (aprovada, com veículo) ─────────────────

const reservaGestorSchema = reservaSchema.and(
  z.object({ veiculo_id: z.string().uuid("Selecione um veículo") })
);

export async function criarReservaGestorAction(
  _prev: ReservaFormState,
  formData: FormData
): Promise<ReservaFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .single();
  if (perfil?.papel !== "gestor") return { error: "Acesso negado." };

  const parsed = reservaGestorSchema.safeParse({
    motorista: formData.get("motorista"),
    inicio: formData.get("inicio"),
    fim: formData.get("fim"),
    veiculo_id: formData.get("veiculo_id"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const destinos = getDestinos(formData);
  if (destinos.length === 0) return { error: "Adicione pelo menos um destino." };

  const inicioISO = toBRT(parsed.data.inicio);
  const fimISO = toBRT(parsed.data.fim);

  // Verificar conflito. O banco tem uma trava (EXCLUDE, migration 005) que
  // impede duas reservas aprovadas sobrepostas para o mesmo veículo, então
  // não há caminho de "forçar": o conflito é sempre definitivo.
  const { data: conflitos } = await supabase
    .from("reservas")
    .select("id")
    .eq("veiculo_id", parsed.data.veiculo_id)
    .eq("status", "aprovada")
    .lt("inicio", fimISO)
    .gt("fim", inicioISO);

  if (conflitos && conflitos.length > 0) {
    return {
      error:
        "Este veículo já tem uma reserva aprovada que conflita com este período. Escolha outro veículo ou ajuste o horário.",
    };
  }

  const motoristaId = (formData.get("motorista_id") as string) || null;

  const { data: reserva, error } = await supabase
    .from("reservas")
    .insert({
      solicitante_id: user.id,
      motorista_id: motoristaId,
      motorista: parsed.data.motorista,
      inicio: inicioISO,
      fim: fimISO,
      veiculo_id: parsed.data.veiculo_id,
      status: "aprovada",
      origem: "gestor",
    })
    .select("id")
    .single();

  if (error || !reserva) {
    // 23P01 = exclusion_violation — a trava do banco (migration 005) impede
    // duas reservas aprovadas sobrepostas para o mesmo veículo, mesmo com
    // forcar=1. Não é um erro genérico: o conflito é real e definitivo.
    if (error?.code === "23P01") {
      return {
        error:
          "Não é possível: este veículo já tem outra reserva aprovada que conflita com este período. Cancele ou altere a reserva conflitante primeiro.",
      };
    }
    return { error: "Erro ao criar reserva. Tente novamente." };
  }

  const { error: destinosError } = await supabase.from("reserva_destinos").insert(
    destinos.map((d, i) => ({ reserva_id: reserva.id, destino: d, ordem: i + 1 }))
  );

  if (destinosError) {
    await createAdminClient().from("reservas").delete().eq("id", reserva.id);
    return { error: "Erro ao salvar os destinos. Tente novamente." };
  }

  revalidatePath("/reservas");
  redirect("/reservas");
}

// ─── Gestor aprova + atribui veículo ─────────────────────────────────────────

export async function aprovarReservaAction(
  id: string,
  _prev: ReservaFormState,
  formData: FormData
): Promise<ReservaFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .single();
  if (perfil?.papel !== "gestor") return { error: "Acesso negado." };

  const veiculo_id = formData.get("veiculo_id") as string;
  if (!veiculo_id) return { error: "Selecione um veículo." };

  const { data: reserva } = await supabase
    .from("reservas")
    .select("inicio, fim, motorista, solicitante_id, motorista_id, status")
    .eq("id", id)
    .single();
  if (!reserva) return { error: "Reserva não encontrada." };
  if (reserva.status !== "pendente") {
    return { error: "Esta solicitação não está mais pendente e não pode ser aprovada." };
  }

  // Verificar conflito (excluindo a própria reserva). A trava do banco
  // (EXCLUDE, migration 005) torna qualquer conflito definitivo — não há
  // caminho de "forçar".
  const { data: conflitos } = await supabase
    .from("reservas")
    .select("id")
    .eq("veiculo_id", veiculo_id)
    .eq("status", "aprovada")
    .neq("id", id)
    .lt("inicio", reserva.fim)
    .gt("fim", reserva.inicio);

  if (conflitos && conflitos.length > 0) {
    return {
      error:
        "Este veículo já tem uma reserva aprovada que conflita com este período. Escolha outro veículo ou cancele a reserva conflitante primeiro.",
    };
  }

  // Se ainda não tem motorista_id, assume que o motorista é o próprio solicitante
  const novoMotoristaId = reserva.motorista_id ?? reserva.solicitante_id ?? null;

  const { error } = await supabase
    .from("reservas")
    .update({ status: "aprovada", veiculo_id, motorista_id: novoMotoristaId })
    .eq("id", id)
    .eq("status", "pendente");

  if (error) {
    // 23P01 = exclusion_violation — mesmo com forcar=1, a trava do banco
    // (migration 005) impede duas reservas aprovadas sobrepostas.
    if (error.code === "23P01") {
      return {
        error:
          "Não é possível: este veículo já tem outra reserva aprovada que conflita com este período. Cancele ou altere a reserva conflitante primeiro.",
      };
    }
    return { error: "Erro ao aprovar reserva." };
  }

  revalidatePath("/reservas");
  revalidatePath(`/reservas/${id}`);
  return { success: "Reserva aprovada com sucesso." };
}

// ─── Gestor recusa ────────────────────────────────────────────────────────────

export async function recusarReservaAction(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .single();
  if (perfil?.papel !== "gestor") return;

  const motivo = (formData.get("motivo") as string | null)?.trim() || null;

  await supabase
    .from("reservas")
    .update({ status: "recusada", motivo_recusa: motivo })
    .eq("id", id);

  revalidatePath("/reservas");
  revalidatePath(`/reservas/${id}`);
}

// ─── Funcionário cancela própria solicitação pendente ────────────────────────

export async function cancelarPropriaSolicitacaoAction(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // UPDATE via admin (contorna RLS, que só permite gestor atualizar), mas a
  // posse e o estado "pendente" são reforçados dentro do próprio WHERE — não
  // num SELECT anterior — para o UPDATE ser atômico. Sem isso, um gestor
  // poderia aprovar a reserva entre o SELECT de checagem e este UPDATE,
  // fazendo o funcionário "cancelar" (recusar) uma reserva já aprovada.
  const admin = createAdminClient();
  await admin
    .from("reservas")
    .update({ status: "recusada" })
    .eq("id", id)
    .eq("status", "pendente")
    .eq("solicitante_id", user.id);

  revalidatePath("/reservas");
  revalidatePath("/minhas-reservas");
  redirect("/minhas-reservas");
}

// ─── Gestor cancela ───────────────────────────────────────────────────────────

export async function cancelarReservaAction(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .single();
  if (perfil?.papel !== "gestor") return;

  await supabase
    .from("reservas")
    .update({ status: "recusada" })
    .eq("id", id)
    .in("status", ["pendente", "aprovada"]);

  revalidatePath("/reservas");
  redirect("/reservas");
}
