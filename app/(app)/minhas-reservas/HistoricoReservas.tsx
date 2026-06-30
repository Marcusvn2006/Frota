"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Car, MapPin, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatBRT } from "@/lib/utils";
import type { StatusReserva } from "@/lib/types/database.types";

type MinhaReserva = {
  id: string;
  motorista: string;
  inicio: string;
  fim: string;
  status: StatusReserva;
  motivo_recusa: string | null;
  veiculo: { modelo: string; placa: string } | null;
  destinos: { destino: string; ordem: number }[];
};

const STATUS_BADGE: Record<
  StatusReserva,
  {
    label: string;
    variant: "default" | "warning" | "success" | "destructive" | "secondary";
  }
> = {
  pendente: { label: "Pendente", variant: "warning" },
  aprovada: { label: "Aprovada", variant: "default" },
  recusada: { label: "Recusada", variant: "destructive" },
  concluida: { label: "Concluída", variant: "success" },
};

const PAGE_SIZE = 15;

export function HistoricoReservas({ historico }: { historico: MinhaReserva[] }) {
  const [limite, setLimite] = useState(PAGE_SIZE);

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
        Histórico ({historico.length})
      </h2>
      {historico.slice(0, limite).map((r) => {
        const badge = STATUS_BADGE[r.status];
        const destinos = [...r.destinos].sort((a, b) => a.ordem - b.ordem);
        return (
          <Link
            key={r.id}
            href={`/reservas/${r.id}`}
            className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all active:scale-[0.98]"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="font-semibold text-gray-900 truncate">
                {r.motorista}
              </p>
              <Badge variant={badge.variant} className="shrink-0">
                {badge.label}
              </Badge>
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
              {r.veiculo && (
                <div className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span>
                    {r.veiculo.modelo}{" "}
                    <span className="font-mono text-xs">{r.veiculo.placa}</span>
                  </span>
                </div>
              )}
              {destinos[0] && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="truncate">
                    {destinos[0].destino}
                    {destinos.length > 1 ? ` +${destinos.length - 1}` : ""}
                  </span>
                </div>
              )}
              {r.status === "recusada" && r.motivo_recusa && (
                <div className="flex items-start gap-1.5 mt-1.5 bg-red-50 rounded-md px-2.5 py-1.5">
                  <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-600 leading-snug">{r.motivo_recusa}</p>
                </div>
              )}
            </div>
          </Link>
        );
      })}
      {historico.length > limite && (
        <button
          onClick={() => setLimite((l) => l + PAGE_SIZE)}
          className="w-full text-sm text-blue-600 hover:text-blue-800 py-2 font-medium"
        >
          Ver mais ({historico.length - limite} restantes)
        </button>
      )}
    </section>
  );
}
