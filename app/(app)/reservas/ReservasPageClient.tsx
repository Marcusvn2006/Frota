"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarioReservas, type CalendarReserva } from "@/components/CalendarioReservas";
import { Badge } from "@/components/ui/badge";
import { formatBRT } from "@/lib/utils";
import { Clock, Car, CalendarDays, List } from "lucide-react";
import type { StatusReserva, OrigemReserva } from "@/lib/types/database.types";

type ReservaRow = CalendarReserva & {
  origem: OrigemReserva;
  solicitante_id: string;
  solicitante: { id: string; nome: string } | null;
  destinos: { destino: string; ordem: number }[];
};

const STATUS_BADGE: Record<StatusReserva, { label: string; variant: "default" | "warning" | "success" | "destructive" | "secondary" }> = {
  pendente: { label: "Pendente", variant: "warning" },
  aprovada: { label: "Aprovada", variant: "default" },
  recusada: { label: "Recusada", variant: "destructive" },
  concluida: { label: "Concluída", variant: "success" },
};

function ReservaCard({ r, isGestor }: { r: ReservaRow; isGestor: boolean }) {
  const badge = STATUS_BADGE[r.status];
  const destinos = [...r.destinos].sort((a, b) => a.ordem - b.ordem);
  const destino = destinos[0]?.destino ?? "—";
  const maisDestinos = destinos.length > 1 ? ` +${destinos.length - 1}` : "";

  return (
    <Link
      href={`/reservas/${r.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{r.motorista}</p>
          {isGestor && r.solicitante && (
            <p className="text-xs text-gray-400">por {r.solicitante.nome}</p>
          )}
        </div>
        <Badge variant={badge.variant} className="shrink-0">{badge.label}</Badge>
      </div>

      <div className="space-y-1 text-sm text-gray-600">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span>
            {formatBRT(r.inicio, { dateStyle: "short", timeStyle: "short" })}
            {" → "}
            {formatBRT(r.fim, { dateStyle: "short", timeStyle: "short" })}
          </span>
        </div>
        {r.veiculo ? (
          <div className="flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span>{r.veiculo.modelo} <span className="font-mono text-xs">{r.veiculo.placa}</span></span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-yellow-600">
            <Car className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs">Veículo a definir</span>
          </div>
        )}
        <p className="text-xs text-gray-500 truncate">📍 {destino}{maisDestinos}</p>
      </div>
    </Link>
  );
}

interface Props {
  reservas: ReservaRow[];
  isGestor: boolean;
}

export function ReservasPageClient({ reservas, isGestor }: Props) {
  const [view, setView] = useState<"calendario" | "lista">("calendario");

  const agora = new Date().toISOString();
  const pendentes = reservas.filter((r) => r.status === "pendente");
  const proximas = reservas.filter((r) => r.status === "aprovada" && r.fim >= agora);
  const historico = reservas.filter(
    (r) => r.status === "concluida" || r.status === "recusada" || (r.status === "aprovada" && r.fim < agora)
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* Banner de pendentes para o gestor (visível nas duas views) */}
      {isGestor && pendentes.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-medium text-yellow-800">
            ⏳ {pendentes.length} solicitaç{pendentes.length > 1 ? "ões" : "ão"} pendente{pendentes.length > 1 ? "s" : ""}
          </p>
          {view === "calendario" && (
            <button
              onClick={() => setView("lista")}
              className="text-xs text-yellow-700 underline underline-offset-2"
            >
              Ver lista
            </button>
          )}
        </div>
      )}

      {/* Toggle de view — apenas gestor */}
      {isGestor && (
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setView("calendario")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === "calendario"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Calendário
          </button>
          <button
            onClick={() => setView("lista")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === "lista"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <List className="w-4 h-4" />
            Lista
          </button>
        </div>
      )}

      {/* View: Calendário */}
      {view === "calendario" && (
        <CalendarioReservas reservas={reservas} />
      )}

      {/* View: Lista (gestor) */}
      {view === "lista" && (
        <div className="space-y-6">
          {pendentes.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-yellow-700 uppercase tracking-wide">
                Aguardando aprovação ({pendentes.length})
              </h2>
              {pendentes.map((r) => <ReservaCard key={r.id} r={r} isGestor={isGestor} />)}
            </section>
          )}
          {proximas.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Próximas ({proximas.length})
              </h2>
              {proximas.map((r) => <ReservaCard key={r.id} r={r} isGestor={isGestor} />)}
            </section>
          )}
          {historico.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                Histórico ({historico.length})
              </h2>
              {historico.slice(0, 15).map((r) => <ReservaCard key={r.id} r={r} isGestor={isGestor} />)}
            </section>
          )}
          {reservas.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="font-medium">Nenhuma reserva encontrada</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
