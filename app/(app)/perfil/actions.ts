"use server";

import { createClient } from "@/lib/supabase/server";
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

  await sincronizarVencimento(supabase, "motorista", user.id, "cnh", parsed.data.cnh_validade);

  revalidatePath("/perfil");
  revalidatePath("/home");
  return { success: "Dados salvos com sucesso." };
}
