import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Car, MapPin, User, ClipboardCheck, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatBRT } from "@/lib/utils";
import { AprovarSection, RecusarButton, CancelarButton, CancelarSolicitacaoButton } from "./ReservaAcoesClient";
import type { StatusReserva, OrigemReserva, Veiculo } from "@/lib/types/database.types";

type VeiculoConflito = Veiculo & { temConflito: boolean };

type ReservaDetalhe = {
  id: string;
  motorista: string;
  inicio: string;
  fim: string;
  status: StatusReserva;
  origem: OrigemReserva;
  solicitante_id: string;
  motivo_recusa: string | null;
  solicitante: { id: string; nome: string; email: string } | null;
  veiculo: { id: string; modelo: string; cor: string; placa: string } | null;
  destinos: { id: string; destino: string; ordem: number }[];
};

const STATUS_BADGE: Record<StatusReserva, { label: string; variant: "default" | "warning" | "success" | "destructive" | "secondary" }> = {
  pendente: { label: "Pendente de aprovação", variant: "warning" },
  aprovada: { label: "Aprovada", variant: "default" },
  recusada: { label: "Recusada", variant: "destructive" },
  concluida: { label: "Concluída", variant: "success" },
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReservaDetalhePage({ params }: Props) {
  const { id } = await params;
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

  const { data: reservaRaw } = await supabase
    .from("reservas")
    .select(`
      id, motorista, inicio, fim, status, origem, solicitante_id, motivo_recusa,
      solicitante:usuarios!reservas_solicitante_id_fkey(id, nome, email),
      veiculo:veiculos!reservas_veiculo_id_fkey(id, modelo, cor, placa),
      destinos:reserva_destinos(id, destino, ordem)
    `)
    .eq("id", id)
    .single();

  if (!reservaRaw) notFound();
  const reserva = reservaRaw as unknown as ReservaDetalhe;
  const isSolicitante = !isGestor && reserva.solicitante_id === user.id;

  const badge = STATUS_BADGE[reserva.status];
  const destinosOrdenados = reserva.destinos.sort((a, b) => a.ordem - b.ordem);

  // Para aprovação: buscar veículos com info de conflito
  let veiculosComConflito: VeiculoConflito[] = [];
  if (isGestor && reserva.status === "pendente") {
    const { data: veiculos } = await supabase.from("veiculos").select("*").order("modelo");

    if (veiculos) {
      const { data: conflitos } = await supabase
        .from("reservas")
        .select("veiculo_id")
        .eq("status", "aprovada")
        .lt("inicio", reserva.fim)
        .gt("fim", reserva.inicio);

      const veiculosEmConflito = new Set(
        conflitos?.map((c) => c.veiculo_id).filter(Boolean) ?? []
      );

      veiculosComConflito = veiculos.map((v) => ({
        ...v,
        temConflito: veiculosEmConflito.has(v.id),
      }));
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/reservas" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{reserva.motorista}</h1>
            <Badge variant={badge.variant} className="mt-1">
              {badge.label}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {/* Detalhes */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">Período</p>
              <p className="text-sm text-gray-600">
                {formatBRT(reserva.inicio, { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <p className="text-sm text-gray-600">
                → {formatBRT(reserva.fim, { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>
          </div>

          {reserva.veiculo && (
            <div className="flex items-start gap-3">
              <Car className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Veículo</p>
                <p className="text-sm text-gray-600">
                  {reserva.veiculo.modelo} · {reserva.veiculo.cor} ·{" "}
                  <span className="font-mono">{reserva.veiculo.placa}</span>
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">Destinos</p>
              {destinosOrdenados.map((d, i) => (
                <p key={d.id} className="text-sm text-gray-600">
                  {i + 1}. {d.destino}
                </p>
              ))}
            </div>
          </div>

          {isGestor && reserva.solicitante && (
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Solicitante</p>
                <p className="text-sm text-gray-600">{reserva.solicitante.nome}</p>
                <p className="text-xs text-gray-400">{reserva.solicitante.email}</p>
              </div>
            </div>
          )}
        </div>

        {/* Motivo de recusa */}
        {reserva.status === "recusada" && reserva.motivo_recusa && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-700 mb-0.5">Motivo da recusa</p>
              <p className="text-sm text-red-600">{reserva.motivo_recusa}</p>
            </div>
          </div>
        )}

        {/* Ações do gestor — pendente */}
        {isGestor && reserva.status === "pendente" && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <h2 className="font-semibold text-gray-900">Avaliar solicitação</h2>
            <AprovarSection
              reservaId={reserva.id}
              veiculos={veiculosComConflito}
            />
            <div className="border-t border-gray-100 pt-3">
              <RecusarButton id={reserva.id} />
            </div>
          </div>
        )}

        {/* Ações do gestor — aprovada */}
        {isGestor && reserva.status === "aprovada" && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <CancelarButton id={reserva.id} />
          </div>
        )}

        {/* Funcionário cancela própria solicitação pendente */}
        {isSolicitante && reserva.status === "pendente" && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <CancelarSolicitacaoButton id={reserva.id} />
          </div>
        )}

        {/* Botão de vistoria — reserva aprovada */}
        {reserva.status === "aprovada" && (
          <Link
            href={`/checklist/${reserva.id}`}
            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
          >
            <ClipboardCheck className="w-4 h-4" />
            Vistoria do veículo
          </Link>
        )}

        {/* Link para resumo da vistoria — reserva concluída */}
        {reserva.status === "concluida" && (
          <Link
            href={`/checklist/${reserva.id}`}
            className="flex items-center justify-center gap-2 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-3 text-sm font-medium transition-colors"
          >
            <ClipboardCheck className="w-4 h-4" />
            Ver vistoria
          </Link>
        )}
      </div>
    </div>
  );
}
