"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cleanupOldPhotosIfNeeded } from "@/lib/cleanupPhotos";

export type ChecklistFormState =
  | { error: string; success?: never }
  | { success: string; error?: never }
  | null;

export async function iniciarChecklistAction(reservaId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Trigger on_checklist_created auto-creates the 18 items
  await supabase.from("checklists").insert({ reserva_id: reservaId });
  // Duplicate key error (already exists) is safe to ignore

  redirect(`/checklist/${reservaId}`);
}

export async function salvarSaidaAction(
  checklistId: string,
  reservaId: string,
  prevState: ChecklistFormState,
  formData: FormData
): Promise<ChecklistFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch veiculo_id from DB — never trust client-supplied value
  const { data: clData } = await supabase
    .from("checklists")
    .select("reserva:reservas!checklists_reserva_id_fkey(veiculo_id)")
    .eq("id", checklistId)
    .single();
  const veiculoId =
    (clData?.reserva as { veiculo_id: string | null } | null)?.veiculo_id ??
    null;

  const km_saida = formData.get("km_saida") as string;
  const hora_saida = formData.get("hora_saida") as string;

  if (!km_saida || !hora_saida) {
    return { error: "Preencha o km e a hora de saída." };
  }

  const { error: clError } = await supabase
    .from("checklists")
    .update({
      km_saida: parseFloat(km_saida),
      hora_saida,
    })
    .eq("id", checklistId);

  if (clError) return { error: clError.message };

  // Update each of the 18 checklist items
  const itemIds = formData.getAll("item_id") as string[];
  for (const itemId of itemIds) {
    const ok = formData.get(`item_${itemId}_ok`) === "true";
    const obs = (formData.get(`item_${itemId}_obs`) as string) || null;
    await supabase
      .from("checklist_itens")
      .update({ ok, obs: ok ? null : obs })
      .eq("id", itemId);
  }

  // Upload painel_saida photo (optional)
  const foto = formData.get("painel_saida") as File | null;
  if (foto && foto.size > 0 && veiculoId) {
    const bytes = await foto.arrayBuffer();
    const path = `${checklistId}/painel_saida_${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("fotos-vistoria")
      .upload(path, bytes, { contentType: foto.type || "image/jpeg" });
    if (!upErr) {
      await supabase.from("fotos").insert({
        checklist_id: checklistId,
        veiculo_id: veiculoId,
        tipo: "painel_saida",
        url: path,
      });
      await cleanupOldPhotosIfNeeded().catch(() => {});
    }
  }

  revalidatePath(`/checklist/${reservaId}`);
  redirect(`/checklist/${reservaId}`);
}

export async function salvarChegadaAction(
  checklistId: string,
  reservaId: string,
  prevState: ChecklistFormState,
  formData: FormData
): Promise<ChecklistFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch veiculo_id from DB — never trust client-supplied value
  const { data: clData } = await supabase
    .from("checklists")
    .select("reserva:reservas!checklists_reserva_id_fkey(veiculo_id)")
    .eq("id", checklistId)
    .single();
  const veiculoId =
    (clData?.reserva as { veiculo_id: string | null } | null)?.veiculo_id ??
    null;

  const km_chegada = formData.get("km_chegada") as string;
  const hora_chegada = formData.get("hora_chegada") as string;

  if (!km_chegada || !hora_chegada) {
    return { error: "Preencha o km e a hora de chegada." };
  }

  const abasteceu = formData.get("abasteceu") === "1";
  const litros = abasteceu
    ? parseFloat(formData.get("litros") as string) || null
    : null;
  const valor = abasteceu
    ? parseFloat(formData.get("valor") as string) || null
    : null;

  // Upload painel_chegada photo (optional)
  const painelChegada = formData.get("painel_chegada") as File | null;
  if (painelChegada && painelChegada.size > 0 && veiculoId) {
    const bytes = await painelChegada.arrayBuffer();
    const path = `${checklistId}/painel_chegada_${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("fotos-vistoria")
      .upload(path, bytes, { contentType: painelChegada.type || "image/jpeg" });
    if (!upErr) {
      await supabase.from("fotos").insert({
        checklist_id: checklistId,
        veiculo_id: veiculoId,
        tipo: "painel_chegada",
        url: path,
      });
      await cleanupOldPhotosIfNeeded().catch(() => {});
    }
  }

  // Upload cupom photo if abasteceu (optional)
  if (abasteceu) {
    const cupom = formData.get("cupom") as File | null;
    if (cupom && cupom.size > 0 && veiculoId) {
      const bytes = await cupom.arrayBuffer();
      const path = `${checklistId}/cupom_${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("fotos-vistoria")
        .upload(path, bytes, { contentType: cupom.type || "image/jpeg" });
      if (!upErr) {
        await supabase.from("fotos").insert({
          checklist_id: checklistId,
          veiculo_id: veiculoId,
          tipo: "cupom",
          url: path,
        });
        await cleanupOldPhotosIfNeeded().catch(() => {});
      }
    }
  }

  // Conclude checklist — trigger handle_checklist_concluido sets reserva to 'concluida'
  const { error } = await supabase
    .from("checklists")
    .update({
      km_chegada: parseFloat(km_chegada),
      hora_chegada,
      abasteceu,
      litros,
      valor,
      status: "concluido",
    })
    .eq("id", checklistId);

  if (error) return { error: error.message };

  revalidatePath(`/checklist/${reservaId}`);
  revalidatePath(`/reservas/${reservaId}`);
  redirect(`/checklist/${reservaId}`);
}
