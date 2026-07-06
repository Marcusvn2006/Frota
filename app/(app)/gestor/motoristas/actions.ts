"use server";

import { createClient } from "@/lib/supabase/server";
import { sincronizarVencimento } from "@/lib/vencimentos";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

export type MotoristaFormState =
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

const motoristaSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cnh_numero: z.string().nullable(),
  cnh_categoria: z.string().nullable(),
  cnh_validade: z.string().nullable(),
});

// ─── Criar (sempre terceirizado — quem tem login é sincronizado automaticamente) ──

export async function criarMotoristaAction(
  _prev: MotoristaFormState,
  formData: FormData
): Promise<MotoristaFormState> {
  const supabase = await getGestorClient();
  if (!supabase) return { error: "Acesso negado." };

  const parsed = motoristaSchema.safeParse({
    nome: formData.get("nome"),
    cnh_numero: vazioParaNull(formData.get("cnh_numero")),
    cnh_categoria: vazioParaNull(formData.get("cnh_categoria")),
    cnh_validade: vazioParaNull(formData.get("cnh_validade")),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { data: motorista, error } = await supabase
    .from("motoristas")
    .insert({ ...parsed.data })
    .select("id")
    .single();

  if (error || !motorista) return { error: "Erro ao cadastrar motorista. Tente novamente." };

  await sincronizarVencimento(supabase, "motorista", motorista.id, "cnh", parsed.data.cnh_validade);

  revalidatePath("/gestor/motoristas");
  revalidatePath("/gestor/vencimentos");
  redirect("/gestor/motoristas");
}

// ─── Editar ───────────────────────────────────────────────────────────────────
//
// Motoristas com usuario_id (sincronizados de um login) têm o nome travado na
// tela (campo readOnly) para não divergir de usuarios.nome — mas a action em
// si aceita o valor enviado, que nesse caso é sempre o mesmo já existente.

export async function editarMotoristaAction(
  id: string,
  _prev: MotoristaFormState,
  formData: FormData
): Promise<MotoristaFormState> {
  const supabase = await getGestorClient();
  if (!supabase) return { error: "Acesso negado." };

  const parsed = motoristaSchema.safeParse({
    nome: formData.get("nome"),
    cnh_numero: vazioParaNull(formData.get("cnh_numero")),
    cnh_categoria: vazioParaNull(formData.get("cnh_categoria")),
    cnh_validade: vazioParaNull(formData.get("cnh_validade")),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("motoristas")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { error: "Erro ao atualizar motorista." };

  await sincronizarVencimento(supabase, "motorista", id, "cnh", parsed.data.cnh_validade);

  revalidatePath("/gestor/motoristas");
  revalidatePath(`/gestor/motoristas/${id}/editar`);
  revalidatePath("/gestor/vencimentos");
  return { success: "Motorista atualizado com sucesso." };
}

// ─── Excluir (somente terceirizados — login sincroniza a própria linha) ──────

export async function excluirMotoristaAction(id: string): Promise<void> {
  const supabase = await getGestorClient();
  if (!supabase) return;

  const { data: motorista } = await supabase
    .from("motoristas")
    .select("usuario_id")
    .eq("id", id)
    .single();

  if (motorista && !motorista.usuario_id) {
    await supabase.from("motoristas").delete().eq("id", id);
  }

  revalidatePath("/gestor/motoristas");
  redirect("/gestor/motoristas");
}
