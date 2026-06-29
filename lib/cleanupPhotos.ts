import { createAdminClient } from "./supabase/admin";

const PHOTO_LIMIT = 1800;  // dispara limpeza acima deste número
const PHOTO_TARGET = 1500; // quantas fotos manter após a limpeza

export async function cleanupOldPhotosIfNeeded(): Promise<void> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const admin = createAdminClient();

  const { count } = await admin
    .from("fotos")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) <= PHOTO_LIMIT) return;

  const { data: oldPhotos } = await admin
    .from("fotos")
    .select("id, url")
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
