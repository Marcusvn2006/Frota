"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sincronizarVencimento } from "@/lib/vencimentos";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type PerfilFormState =
  | { error: string; success?: never }
  | { success: string; error?: never }
  | null;

function vazioParaNull(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s || null;
}

const perfilSchema = z.object({
  cnh_numero: z.string().nullable(),
  cnh_categoria: z.string().nullable(),
  cnh_validade: z.string().min(1, "Informe a validade da CNH"),
});

export async function salvarPerfilAction(
  _prev: PerfilFormState,
  formData: FormData
): Promise<PerfilFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const parsed = perfilSchema.safeParse({
    cnh_numero: vazioParaNull(formData.get("cnh_numero")),
    cnh_categoria: vazioParaNull(formData.get("cnh_categoria")),
    cnh_validade: (formData.get("cnh_validade") as string | null)?.trim() ?? "",
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("motoristas")
    .update(parsed.data)
    .eq("usuario_id", user.id);

  if (error) return { error: "Erro ao salvar. Tente novamente." };

  // vencimentos é restrita ao gestor por RLS (preocupação operacional interna),
  // então a sincronização do alerta de CNH precisa do client admin — a posse
  // já foi validada pelo UPDATE acima (.eq("usuario_id", user.id)).
  const admin = createAdminClient();
  const { error: syncError } = await sincronizarVencimento(
    admin,
    "motorista",
    user.id,
    "cnh",
    parsed.data.cnh_validade
  );
  if (syncError) return { error: "Dados salvos, mas houve um erro ao atualizar o alerta de vencimento." };

  revalidatePath("/perfil");
  revalidatePath("/home");
  revalidatePath("/gestor/vencimentos");
  return { success: "Dados salvos com sucesso." };
}

const trocarSenhaSchema = z
  .object({
    password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  });

export async function trocarSenhaAction(
  _prev: PerfilFormState,
  formData: FormData
): Promise<PerfilFormState> {
  const parsed = trocarSenhaSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return { error: "Erro ao atualizar a senha. Tente novamente." };

  return { success: "Senha atualizada com sucesso." };
}
