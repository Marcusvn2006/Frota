"use server";

import { createClient } from "@/lib/supabase/server";
import { sincronizarVencimento } from "@/lib/vencimentos";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export type VeiculoFormState =
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

// AAA0000 (antigo) ou AAA0A00 (Mercosul), após remover espaços/hífens.
const PLACA_REGEX = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/;

const veiculoSchema = z.object({
  modelo: z.string().min(2, "Modelo deve ter pelo menos 2 caracteres"),
  cor: z.string().min(2, "Cor deve ter pelo menos 2 caracteres"),
  placa: z
    .string()
    .transform((v) => v.toUpperCase().replace(/[\s-]/g, ""))
    .refine((v) => PLACA_REGEX.test(v), {
      message: "Placa inválida. Use o formato AAA0000 ou AAA0A00 (Mercosul).",
    }),
});

const vencimentosVeiculoSchema = z.object({
  ipva_validade: z.string().nullable(),
  licenciamento_validade: z.string().nullable(),
  revisao_validade: z.string().nullable(),
  seguro_validade: z.string().nullable(),
});

// ─── Criar ───────────────────────────────────────────────────────────────────

export async function criarVeiculoAction(
  _prev: VeiculoFormState,
  formData: FormData
): Promise<VeiculoFormState> {
  const supabase = await getGestorClient();
  if (!supabase) return { error: "Acesso negado." };

  const parsed = veiculoSchema.safeParse({
    modelo: formData.get("modelo"),
    cor: formData.get("cor"),
    placa: formData.get("placa"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const parsedVencimentos = vencimentosVeiculoSchema.safeParse({
    ipva_validade: vazioParaNull(formData.get("ipva_validade")),
    licenciamento_validade: vazioParaNull(formData.get("licenciamento_validade")),
    revisao_validade: vazioParaNull(formData.get("revisao_validade")),
    seguro_validade: vazioParaNull(formData.get("seguro_validade")),
  });

  if (!parsedVencimentos.success) return { error: parsedVencimentos.error.issues[0].message };

  const { data: novoVeiculo, error } = await supabase
    .from("veiculos")
    .insert({ ...parsed.data, ...parsedVencimentos.data })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Esta placa já está cadastrada." };
    return { error: "Erro ao cadastrar veículo. Tente novamente." };
  }

  await Promise.all([
    sincronizarVencimento(supabase, "veiculo", novoVeiculo.id, "ipva", parsedVencimentos.data.ipva_validade),
    sincronizarVencimento(supabase, "veiculo", novoVeiculo.id, "licenciamento", parsedVencimentos.data.licenciamento_validade),
    sincronizarVencimento(supabase, "veiculo", novoVeiculo.id, "revisao", parsedVencimentos.data.revisao_validade),
    sincronizarVencimento(supabase, "veiculo", novoVeiculo.id, "seguro", parsedVencimentos.data.seguro_validade),
  ]);

  revalidatePath("/gestor/veiculos");
  revalidatePath("/gestor/vencimentos");
  redirect("/gestor/veiculos");
}

// ─── Editar ───────────────────────────────────────────────────────────────────

export async function editarVeiculoAction(
  id: string,
  _prev: VeiculoFormState,
  formData: FormData
): Promise<VeiculoFormState> {
  const supabase = await getGestorClient();
  if (!supabase) return { error: "Acesso negado." };

  const parsed = veiculoSchema.safeParse({
    modelo: formData.get("modelo"),
    cor: formData.get("cor"),
    placa: formData.get("placa"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const parsedVencimentos = vencimentosVeiculoSchema.safeParse({
    ipva_validade: vazioParaNull(formData.get("ipva_validade")),
    licenciamento_validade: vazioParaNull(formData.get("licenciamento_validade")),
    revisao_validade: vazioParaNull(formData.get("revisao_validade")),
    seguro_validade: vazioParaNull(formData.get("seguro_validade")),
  });

  if (!parsedVencimentos.success) return { error: parsedVencimentos.error.issues[0].message };

  const { error } = await supabase
    .from("veiculos")
    .update({ ...parsed.data, ...parsedVencimentos.data })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: "Esta placa já está cadastrada." };
    return { error: "Erro ao atualizar veículo." };
  }

  await Promise.all([
    sincronizarVencimento(supabase, "veiculo", id, "ipva", parsedVencimentos.data.ipva_validade),
    sincronizarVencimento(supabase, "veiculo", id, "licenciamento", parsedVencimentos.data.licenciamento_validade),
    sincronizarVencimento(supabase, "veiculo", id, "revisao", parsedVencimentos.data.revisao_validade),
    sincronizarVencimento(supabase, "veiculo", id, "seguro", parsedVencimentos.data.seguro_validade),
  ]);

  revalidatePath("/gestor/veiculos");
  revalidatePath(`/gestor/veiculos/${id}/editar`);
  revalidatePath("/gestor/vencimentos");
  return { success: "Veículo atualizado com sucesso." };
}

// ─── Excluir ──────────────────────────────────────────────────────────────────

export async function excluirVeiculoAction(id: string): Promise<void> {
  const supabase = await getGestorClient();
  if (!supabase) return;

  await supabase.from("veiculos").delete().eq("id", id);

  revalidatePath("/gestor/veiculos");
  redirect("/gestor/veiculos");
}

// ─── Manutenção ───────────────────────────────────────────────────────────────

const manutencaoSchema = z.object({
  motivo: z.string().min(3, "Descreva o motivo da manutenção (mín. 3 caracteres)"),
});

export async function ativarManutencaoAction(
  id: string,
  _prev: VeiculoFormState,
  formData: FormData
): Promise<VeiculoFormState> {
  const supabase = await getGestorClient();
  if (!supabase) return { error: "Acesso negado." };

  const parsed = manutencaoSchema.safeParse({
    motivo: formData.get("motivo"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("veiculos")
    .update({ em_manutencao: true, manutencao_motivo: parsed.data.motivo })
    .eq("id", id);

  if (error) return { error: "Erro ao atualizar status." };

  // Abre o registro de histórico — fechado (com custo) ao remover da
  // manutenção, em desativarManutencaoAction.
  const { error: manutError } = await supabase
    .from("manutencoes")
    .insert({ veiculo_id: id, motivo: parsed.data.motivo });

  if (manutError) {
    // Sem isso, o veículo ficaria marcado em_manutencao sem nenhum registro
    // de histórico aberto — desativarManutencaoAction depois não acharia o
    // que fechar, e o custo/motivo dessa manutenção se perderia de vez.
    await supabase
      .from("veiculos")
      .update({ em_manutencao: false, manutencao_motivo: null })
      .eq("id", id);
    return { error: "Erro ao registrar o histórico de manutenção. Tente novamente." };
  }

  revalidatePath("/gestor/veiculos");
  revalidatePath(`/gestor/veiculos/${id}/editar`);
  revalidatePath("/manutencao");
  return { success: "Veículo enviado para manutenção." };
}

const finalizarManutencaoSchema = z.object({
  motivo: z.string().min(3, "Descreva o que foi feito (mín. 3 caracteres)"),
  custo: z.coerce.number().min(0, "Informe quanto foi pago"),
});

export async function desativarManutencaoAction(
  id: string,
  _prev: VeiculoFormState,
  formData: FormData
): Promise<VeiculoFormState> {
  const supabase = await getGestorClient();
  if (!supabase) return { error: "Acesso negado." };

  const parsed = finalizarManutencaoSchema.safeParse({
    motivo: formData.get("motivo"),
    custo: formData.get("custo"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Fecha o registro de histórico aberto primeiro — se não existir um (dado
  // inconsistente por causa de algum estado anterior), não libera o veículo
  // silenciosamente sem gravar custo/motivo em lugar nenhum.
  const { data: fechado, error: manutError } = await supabase
    .from("manutencoes")
    .update({
      motivo: parsed.data.motivo,
      custo: parsed.data.custo,
      data_fim: new Date().toISOString(),
    })
    .eq("veiculo_id", id)
    .is("data_fim", null)
    .select("id")
    .maybeSingle();

  if (manutError) return { error: "Erro ao registrar o histórico de manutenção." };
  if (!fechado) {
    return { error: "Nenhum registro de manutenção em aberto encontrado para este veículo." };
  }

  const { error: veiculoError } = await supabase
    .from("veiculos")
    .update({ em_manutencao: false, manutencao_motivo: null })
    .eq("id", id);

  if (veiculoError) return { error: "Erro ao atualizar status do veículo." };

  revalidatePath("/gestor/veiculos");
  revalidatePath(`/gestor/veiculos/${id}/editar`);
  revalidatePath("/manutencao");
  revalidatePath("/gestor/relatorios");
  return { success: "Manutenção concluída." };
}

// ─── Limpar flag precisa_atencao ─────────────────────────────────────────────

export async function limparAtencaoAction(id: string): Promise<void> {
  const supabase = await getGestorClient();
  if (!supabase) return;

  await supabase
    .from("veiculos")
    .update({ precisa_atencao: false })
    .eq("id", id);

  revalidatePath("/gestor/veiculos");
  revalidatePath(`/gestor/veiculos/${id}/editar`);
}
