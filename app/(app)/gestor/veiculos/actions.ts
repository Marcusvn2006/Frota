"use server";

import { createClient } from "@/lib/supabase/server";
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

const veiculoSchema = z.object({
  modelo: z.string().min(2, "Modelo deve ter pelo menos 2 caracteres"),
  cor: z.string().min(2, "Cor deve ter pelo menos 2 caracteres"),
  placa: z
    .string()
    .min(7, "Placa deve ter 7 ou 8 caracteres")
    .max(8, "Placa deve ter 7 ou 8 caracteres")
    .transform((v) => v.toUpperCase().replace(/\s/g, "")),
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

  const { error } = await supabase
    .from("veiculos")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") return { error: "Esta placa já está cadastrada." };
    return { error: "Erro ao atualizar veículo." };
  }

  revalidatePath("/gestor/veiculos");
  revalidatePath(`/gestor/veiculos/${id}/editar`);
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
