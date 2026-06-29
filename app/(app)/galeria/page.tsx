import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { GaleriaClient, type UsoFotos, type FotoItem } from "./GaleriaClient";
import type { TipoFoto } from "@/lib/types/database.types";

type FotoRaw = {
  id: string;
  tipo: TipoFoto;
  url: string;
  tirada_em: string;
  checklist_id: string;
  veiculo_id: string;
  checklist: {
    id: string;
    km_saida: number | null;
    km_chegada: number | null;
    hora_saida: string | null;
    hora_chegada: string | null;
    reserva_id: string;
    reserva: {
      id: string;
      motorista: string;
      inicio: string;
      solicitante: { nome: string } | null;
    } | null;
  } | null;
  veiculo: { modelo: string; placa: string } | null;
};

export default async function GaleriaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .single();

  if (perfil?.papel !== "gestor") redirect("/home");

  // Fetch all fotos with nested joins
  const { data: fotosRaw } = await supabase
    .from("fotos")
    .select(`
      id, tipo, url, tirada_em, checklist_id, veiculo_id,
      checklist:checklists!fotos_checklist_id_fkey(
        id, km_saida, km_chegada, hora_saida, hora_chegada, reserva_id,
        reserva:reservas!checklists_reserva_id_fkey(
          id, motorista, inicio,
          solicitante:usuarios!reservas_solicitante_id_fkey(nome)
        )
      ),
      veiculo:veiculos!fotos_veiculo_id_fkey(id, modelo, placa)
    `)
    .order("tirada_em", { ascending: false })
    .limit(300);

  const fotos = (fotosRaw ?? []) as unknown as FotoRaw[];

  // Generate signed URLs for all photos (1 hour TTL)
  const paths = fotos.map((f) => f.url).filter(Boolean);
  const signedMap = new Map<string, string>();

  if (paths.length > 0) {
    const { data: signedData } = await supabase.storage
      .from("fotos-vistoria")
      .createSignedUrls(paths, 3600);

    signedData?.forEach((item) => {
      if (item.signedUrl && item.path) signedMap.set(item.path, item.signedUrl);
    });
  }

  // Group fotos by checklist (each checklist = one "uso")
  const usoMap = new Map<string, UsoFotos>();

  for (const foto of fotos) {
    const cl = foto.checklist;
    if (!cl || !foto.veiculo) continue;

    const reserva = cl.reserva;
    if (!reserva) continue;

    if (!usoMap.has(cl.id)) {
      usoMap.set(cl.id, {
        checklistId: cl.id,
        reservaId: reserva.id,
        veiculo: foto.veiculo,
        motorista: reserva.motorista,
        solicitante: reserva.solicitante?.nome ?? "—",
        inicio: reserva.inicio,
        km_saida: cl.km_saida,
        km_chegada: cl.km_chegada,
        fotos: [],
      });
    }

    const fotoItem: FotoItem = {
      id: foto.id,
      tipo: foto.tipo,
      signedUrl: signedMap.get(foto.url) ?? "",
      tirada_em: foto.tirada_em,
    };

    usoMap.get(cl.id)!.fotos.push(fotoItem);
  }

  const usos = Array.from(usoMap.values());

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <ImageIcon className="w-6 h-6 text-gray-400" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Galeria de Fotos</h1>
            <p className="text-sm text-gray-500">
              {usos.length > 0
                ? `${usos.length} vistoria${usos.length > 1 ? "s" : ""} com fotos`
                : "Fotos das vistorias de cada uso"}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
        <GaleriaClient usos={usos} />
      </div>
    </div>
  );
}
