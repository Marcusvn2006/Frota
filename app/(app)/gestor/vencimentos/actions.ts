"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
