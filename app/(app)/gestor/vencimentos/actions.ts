"use server";

import { createClient } from "@/lib/supabase/server";
import { sincronizarVencimento } from "@/lib/vencimentos";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { EntidadeVencimento, TipoVencimento } from "@/lib/types/database.types";

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

export type AtualizarDataFormState = { error: string } | { success: true } | null;

const dataSchema = z.string().min(1, "Informe a nova data");

export async function atualizarDataVencimentoAction(
  entidadeTipo: EntidadeVencimento,
  entidadeId: string,
  tipo: TipoVencimento,
  _prev: AtualizarDataFormState,
  formData: FormData
): Promise<AtualizarDataFormState> {
  const supabase = await getGestorClient();
  if (!supabase) return { error: "Acesso negado." };

  const parsed = dataSchema.safeParse(formData.get("data_vencimento"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let updateError: { message: string } | null = null;

  if (entidadeTipo === "veiculo") {
    const payload: Partial<
      Record<"ipva_validade" | "licenciamento_validade" | "revisao_validade" | "seguro_validade", string>
    > = {};
    if (tipo === "ipva") payload.ipva_validade = parsed.data;
    else if (tipo === "licenciamento") payload.licenciamento_validade = parsed.data;
    else if (tipo === "revisao") payload.revisao_validade = parsed.data;
    else if (tipo === "seguro") payload.seguro_validade = parsed.data;
    const { error } = await supabase.from("veiculos").update(payload).eq("id", entidadeId);
    updateError = error;
  } else {
    const { error } = await supabase
      .from("motoristas")
      .update({ cnh_validade: parsed.data })
      .eq("id", entidadeId);
    updateError = error;
  }

  if (updateError) return { error: "Erro ao atualizar data. Tente novamente." };

  const { error: syncError } = await sincronizarVencimento(
    supabase,
    entidadeTipo,
    entidadeId,
    tipo,
    parsed.data
  );
  if (syncError) return { error: "Erro ao sincronizar vencimento." };

  revalidatePath("/gestor/vencimentos");
  revalidatePath("/home");
  return { success: true };
}

export async function resolverVencimentoAction(id: string): Promise<void> {
  const supabase = await getGestorClient();
  if (!supabase) return;

  await supabase.from("vencimentos").update({ resolvido: true }).eq("id", id);

  revalidatePath("/gestor/vencimentos");
  revalidatePath("/home");
}

export async function reabrirVencimentoAction(id: string): Promise<void> {
  const supabase = await getGestorClient();
  if (!supabase) return;

  await supabase.from("vencimentos").update({ resolvido: false }).eq("id", id);

  revalidatePath("/gestor/vencimentos");
  revalidatePath("/home");
}
