import { createAdminClient } from "./supabase/admin";

const PHOTO_LIMIT = 1800;  // dispara limpeza acima deste número (por empresa)
const PHOTO_TARGET = 1500; // quantas fotos manter após a limpeza (por empresa)

/**
 * Mantém o volume de fotos sob controle por empresa: quando uma empresa passa
 * de PHOTO_LIMIT fotos, apaga as mais antigas até PHOTO_TARGET. Escopado por
 * empresa (fotos.veiculo_id → veiculos.empresa_id) para nunca apagar fotos de
 * outra empresa. Sem empresaId (ex.: contexto sem sessão) não faz nada.
 */
export async function cleanupOldPhotosIfNeeded(empresaId?: string): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  if (!empresaId) return;

  const admin = createAdminClient();

  const { data: veiculos } = await admin
    .from("veiculos")
    .select("id")
    .eq("empresa_id", empresaId);
  const veiculoIds = (veiculos ?? []).map((v) => v.id);
  if (veiculoIds.length === 0) return;

  const { count } = await admin
    .from("fotos")
    .select("id", { count: "exact", head: true })
    .in("veiculo_id", veiculoIds);

  if ((count ?? 0) <= PHOTO_LIMIT) return;

  const { data: oldPhotos } = await admin
    .from("fotos")
    .select("id, url")
    .in("veiculo_id", veiculoIds)
    .order("created_at", { ascending: true })
    .limit(PHOTO_LIMIT - PHOTO_TARGET); // deleta ~300 de cada vez

  if (!oldPhotos?.length) return;

  const paths = oldPhotos.map((f) => f.url).filter(Boolean) as string[];
  if (paths.length) {
    await admin.storage.from("fotos-vistoria").remove(paths);
  }

  await admin
    .from("fotos")
    .delete()
    .in("id", oldPhotos.map((f) => f.id));
}
