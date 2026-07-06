"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type LimpezaState = {
  deletadas: number;
  falhasStorage: number;
  timestamp: string;
} | null;

export async function limparFotosAntigasAction(
  _prev: LimpezaState
): Promise<LimpezaState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("papel, empresa_id")
    .eq("id", user.id)
    .single();
  if (perfil?.papel !== "gestor") redirect("/home");

  const admin = createAdminClient();
  const corte = new Date();
  corte.setMonth(corte.getMonth() - 6);

  // Só apaga fotos da própria empresa: fotos.veiculo_id → veiculos.empresa_id.
  const { data: veiculosEmpresa } = await admin
    .from("veiculos")
    .select("id")
    .eq("empresa_id", perfil.empresa_id);
  const veiculoIds = (veiculosEmpresa ?? []).map((v) => v.id);

  if (veiculoIds.length === 0) {
    return { deletadas: 0, falhasStorage: 0, timestamp: new Date().toISOString() };
  }

  const { data: fotos } = await admin
    .from("fotos")
    .select("id, url")
    .lt("tirada_em", corte.toISOString())
    .in("veiculo_id", veiculoIds);

  if (!fotos || fotos.length === 0) {
    return { deletadas: 0, falhasStorage: 0, timestamp: new Date().toISOString() };
  }

  // fotos.url é salvo como caminho relativo ao bucket (ex.:
  // "<checklistId>/painel_saida_123.jpg"). Versões antigas podem ter
  // gravado a URL pública inteira — nesse caso, extrai só o caminho.
  const publicPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fotos-vistoria/`;
  const paths: string[] = [];
  const ids: string[] = [];

  for (const foto of fotos) {
    ids.push(foto.id);
    const filePath = foto.url.startsWith(publicPrefix)
      ? foto.url.slice(publicPrefix.length)
      : foto.url;
    if (filePath) paths.push(filePath);
  }

  // Remove do Storage (em lotes de 100)
  let falhasStorage = 0;
  for (let i = 0; i < paths.length; i += 100) {
    const lote = paths.slice(i, i + 100);
    const { error } = await admin.storage.from("fotos-vistoria").remove(lote);
    if (error) falhasStorage += lote.length;
  }

  // Remove do banco independentemente (evita registros órfãos)
  await admin.from("fotos").delete().in("id", ids);

  revalidatePath("/gestor/storage");
  return {
    deletadas: fotos.length,
    falhasStorage,
    timestamp: new Date().toISOString(),
  };
}
