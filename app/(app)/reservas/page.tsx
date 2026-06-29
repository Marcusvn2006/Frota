import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReservasPageClient } from "./ReservasPageClient";
import type { StatusReserva, OrigemReserva } from "@/lib/types/database.types";

type ReservaRow = {
  id: string;
  motorista: string;
  inicio: string;
  fim: string;
  status: StatusReserva;
  origem: OrigemReserva;
  solicitante_id: string;
  solicitante: { id: string; nome: string } | null;
  veiculo: { id: string; modelo: string; placa: string } | null;
  destinos: { destino: string; ordem: number }[];
};

export default async function ReservasPage() {
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

  const isGestor = perfil?.papel === "gestor";

  const { data: reservasRaw } = await supabase
    .from("reservas")
    .select(`
      id, motorista, inicio, fim, status, origem, solicitante_id,
      solicitante:usuarios!reservas_solicitante_id_fkey(id, nome),
      veiculo:veiculos!reservas_veiculo_id_fkey(id, modelo, placa),
      destinos:reserva_destinos(destino, ordem)
    `)
    .order("inicio", { ascending: true });

  const reservas = (reservasRaw ?? []) as unknown as ReservaRow[];
  const proximas = reservas.filter(
    (r) => r.status === "aprovada" && r.fim >= new Date().toISOString()
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Reservas</h1>
            <p className="text-sm text-gray-500">
              {proximas.length} próxima{proximas.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            {isGestor && (
              <Button asChild variant="outline" size="sm">
                <Link href="/gestor/reservas/nova">Criar direta</Link>
              </Button>
            )}
            <Button asChild size="sm">
              <Link href="/reservas/nova">
                <Plus className="w-4 h-4" />
                Solicitar
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo — componente cliente com toggle de views */}
      <ReservasPageClient reservas={reservas} isGestor={isGestor} />
    </div>
  );
}
