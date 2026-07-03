"use server";

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_EMPRESA_ID } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export type MultaFormState =
  | { error: string; success?: never }
  | { success: string; error?: never }
  | null;

async function getGestorClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("usuarios")
    .select("papel")
    .eq("id", user.id)
    .single();

  return data?.papel === "gestor" ? supabase : null;
}

function vazioParaNull(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
}

const multaSchema = z.object({
  placa: z
    .string()
    .transform((v) => v.toUpperCase().replace(/[\s-]/g, ""))
    .refine((v) => v.length >= 7, { message: "Informe a placa do veículo" }),
  data_infracao: z.string().min(1, "Informe a data da infração"),
  hora_infracao: z.string().min(1, "Informe a hora da infração"),
  valor: z.coerce.number().positive("Valor deve ser maior que zero"),
  descricao: z.string().min(3, "Descreva o motivo da multa"),
  prazo_pagamento: z.string().nullable(),
});

// ─── Criar (com sugestão automática de motorista) ─────────────────────────────

export async function criarMultaAction(
  _prev: MultaFormState,
  formData: FormData
): Promise<MultaFormState> {
  const supabase = await getGestorClient();
  if (!supabase) return { error: "Acesso negado." };

  const parsed = multaSchema.safeParse({
    placa: formData.get("placa"),
    data_infracao: formData.get("data_infracao"),
    hora_infracao: formData.get("hora_infracao"),
    valor: formData.get("valor"),
    descricao: formData.get("descricao"),
    prazo_pagamento: vazioParaNull(formData.get("prazo_pagamento")),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data: veiculo } = await supabase
    .from("veiculos")
    .select("id")
    .eq("placa", parsed.data.placa)
    .single();

  if (!veiculo) return { error: "Nenhum veículo encontrado com essa placa." };

  // Busca a reserva (aprovada ou concluída) que cobria o veículo no
  // momento da infração, pra sugerir automaticamente o motorista.
  // Sem correspondência, a multa fica sem motorista_id — o gestor
  // atribui manualmente depois pela própria tela de multas.
  const infracaoISO = `${parsed.data.data_infracao}T${parsed.data.hora_infracao}:00-03:00`;

  const { data: reservaCorrespondente } = await supabase
    .from("reservas")
    .select("motorista_id")
    .eq("veiculo_id", veiculo.id)
    .in("status", ["aprovada", "concluida"])
    .lte("inicio", infracaoISO)
    .gte("fim", infracaoISO)
    .order("inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("multas").insert({
    empresa_id: DEFAULT_EMPRESA_ID,
    veiculo_id: veiculo.id,
    motorista_id: reservaCorrespondente?.motorista_id ?? null,
    data_infracao: parsed.data.data_infracao,
    hora_infracao: parsed.data.hora_infracao,
    valor: parsed.data.valor,
    descricao: parsed.data.descricao,
    prazo_pagamento: parsed.data.prazo_pagamento,
  });

  if (error) return { error: "Erro ao cadastrar multa. Tente novamente." };

  revalidatePath("/gestor/multas");
  revalidatePath("/home");
  redirect("/gestor/multas");
}

// ─── Trocar/atribuir motorista ─────────────────────────────────────────────────

export async function trocarMotoristaMultaAction(
  id: string,
  _prev: MultaFormState,
  formData: FormData
): Promise<MultaFormState> {
  const supabase = await getGestorClient();
  if (!supabase) return { error: "Acesso negado." };

  const motoristaId = (formData.get("motorista_id") as string) || null;

  const { error } = await supabase
    .from("multas")
    .update({ motorista_id: motoristaId })
    .eq("id", id);

  if (error) return { error: "Erro ao atualizar motorista." };

  revalidatePath("/gestor/multas");
  revalidatePath("/home");
  revalidatePath("/minhas-multas");
  return { success: "Motorista atualizado." };
}

// ─── Resolver / reabrir ─────────────────────────────────────────────────────────

export async function resolverMultaAction(id: string): Promise<void> {
  const supabase = await getGestorClient();
  if (!supabase) return;

  await supabase.from("multas").update({ resolvida: true }).eq("id", id);

  revalidatePath("/gestor/multas");
  revalidatePath("/home");
  revalidatePath("/minhas-multas");
}

export async function reabrirMultaAction(id: string): Promise<void> {
  const supabase = await getGestorClient();
  if (!supabase) return;

  await supabase.from("multas").update({ resolvida: false }).eq("id", id);

  revalidatePath("/gestor/multas");
  revalidatePath("/home");
  revalidatePath("/minhas-multas");
}
