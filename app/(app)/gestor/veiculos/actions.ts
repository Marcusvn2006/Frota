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

const veiculoSchema = z.object({
  modelo: z.string().min(2, "Modelo deve ter pelo menos 2 caracteres"),
  cor: z.string().min(2, "Cor deve ter pelo menos 2 caracteres"),
  placa: z
    .string()
    .min(7, "Placa deve ter 7 ou 8 caracteres")
    .max(8, "Placa deve ter 7 ou 8 caracteres")
    .transform((v) => v.toUpperCase().replace(/\s/g, "")),
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

  const { error } = await supabase.from("veiculos").insert(parsed.data);

  if (error) {
    if (error.code === "23505") return { error: "Esta placa já está cadastrada." };
    return { error: "Erro ao cadastrar veículo. Tente novamente." };
  }

  revalidatePath("/gestor/veiculos");
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

  revalidatePath("/gestor/veiculos");
  revalidatePath(`/gestor/veiculos/${id}/editar`);
  revalidatePath("/manutencao");
  return { success: "Veículo enviado para manutenção." };
}

export async function desativarManutencaoAction(id: string): Promise<void> {
  const supabase = await getGestorClient();
  if (!supabase) return;

  await supabase
    .from("veiculos")
    .update({ em_manutencao: false, manutencao_motivo: null })
    .eq("id", id);

  revalidatePath("/gestor/veiculos");
  revalidatePath(`/gestor/veiculos/${id}/editar`);
  revalidatePath("/manutencao");
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
