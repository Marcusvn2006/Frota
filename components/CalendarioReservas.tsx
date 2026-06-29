"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusReserva } from "@/lib/types/database.types";

export type CalendarReserva = {
  id: string;
  motorista: string;
  inicio: string;
  fim: string;
  status: StatusReserva;
  veiculo: { id: string; modelo: string; placa: string } | null;
};

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Paleta de cores por veículo (até 5)
const CORES_BG = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-orange-500", "bg-rose-500",
];
const CORES_LIGHT = [
  "bg-blue-100 text-blue-800",
  "bg-emerald-100 text-emerald-800",
  "bg-violet-100 text-violet-800",
  "bg-orange-100 text-orange-800",
  "bg-rose-100 text-rose-800",
];

function getCorIdx(vehicleId: string, vehicleIds: string[]): number {
  const i = vehicleIds.indexOf(vehicleId);
  return i === -1 ? 0 : i % CORES_BG.length;
}

function getDiasDoMes(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: (Date | null)[] = [];

  for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);

  return days;
}

function reservaEstaNoDia(r: CalendarReserva, day: Date): boolean {
  if (r.status === "recusada") return false;
  const start = new Date(day); start.setHours(0, 0, 0, 0);
  const end = new Date(day); end.setHours(23, 59, 59, 999);
  const inicio = new Date(r.inicio);
  const fim = new Date(r.fim);
  return inicio <= end && fim >= start;
}

function horaBRT(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
  });
}

interface Props {
  reservas: CalendarReserva[];
}

export function CalendarioReservas({ reservas }: Props) {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(hoje);

  const vehicleIds = useMemo(() => {
    const ids = new Set<string>();
    reservas.forEach((r) => r.veiculo && ids.add(r.veiculo.id));
    return Array.from(ids).sort();
  }, [reservas]);

  const dias = useMemo(() => getDiasDoMes(ano, mes), [ano, mes]);

  function anteriorMes() {
    if (mes === 0) { setMes(11); setAno((y) => y - 1); }
    else setMes((m) => m - 1);
  }
  function proximoMes() {
    if (mes === 11) { setMes(0); setAno((y) => y + 1); }
    else setMes((m) => m + 1);
  }

  const reservasDoDia = useMemo(() => {
    if (!diaSelecionado) return [];
    return reservas.filter((r) => reservaEstaNoDia(r, diaSelecionado));
  }, [reservas, diaSelecionado]);

  return (
    <div className="space-y-3">
      {/* Navegação de mês */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={anteriorMes}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <p className="font-semibold text-gray-900">
          {MESES[mes]} {ano}
        </p>
        <button
          onClick={proximoMes}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Cabeçalho dias da semana */}
      <div className="grid grid-cols-7">
        {DIAS.map((d) => (
          <div key={d} className="text-center text-[11px] font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grade do calendário */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
        {dias.map((dia, idx) => {
          if (!dia) return <div key={idx} className="bg-gray-50 min-h-[60px]" />;

          const reservasDia = reservas.filter((r) => reservaEstaNoDia(r, dia));
          const ehHoje = dia.toDateString() === hoje.toDateString();
          const ehSelecionado = diaSelecionado?.toDateString() === dia.toDateString();
          const passado = dia < hoje && !ehHoje;

          return (
            <button
              key={idx}
              onClick={() => setDiaSelecionado(dia)}
              className={cn(
                "min-h-[60px] p-1 text-left transition-colors",
                passado ? "bg-gray-50" : "bg-white",
                ehSelecionado && !ehHoje && "bg-blue-50",
                "hover:bg-blue-50 active:bg-blue-100"
              )}
            >
              {/* Número do dia */}
              <div
                className={cn(
                  "text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full mb-0.5",
                  ehHoje && "bg-blue-700 text-white",
                  !ehHoje && passado && "text-gray-400",
                  !ehHoje && !passado && "text-gray-700",
                  ehSelecionado && !ehHoje && "ring-2 ring-blue-400 ring-offset-1"
                )}
              >
                {dia.getDate()}
              </div>

              {/* Tags de veículos */}
              <div className="space-y-[2px]">
                {reservasDia.slice(0, 2).map((r) => {
                  const ci = r.veiculo ? getCorIdx(r.veiculo.id, vehicleIds) : 0;
                  const isPendente = r.status === "pendente";
                  return (
                    <div
                      key={r.id}
                      className={cn(
                        "text-[8px] leading-tight px-1 py-[1px] rounded truncate font-medium",
                        isPendente ? "bg-yellow-100 text-yellow-800" : CORES_LIGHT[ci]
                      )}
                    >
                      {r.veiculo ? r.veiculo.modelo.split(" ")[0].toUpperCase() : "—"}
                    </div>
                  );
                })}
                {reservasDia.length > 2 && (
                  <div className="text-[8px] text-gray-400 pl-1">
                    +{reservasDia.length - 2}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legenda de cores */}
      {vehicleIds.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {vehicleIds.map((id, i) => {
            const veiculo = reservas.find((r) => r.veiculo?.id === id)?.veiculo;
            if (!veiculo) return null;
            return (
              <div key={id} className="flex items-center gap-1">
                <div className={cn("w-2.5 h-2.5 rounded-full", CORES_BG[i % CORES_BG.length])} />
                <span className="text-xs text-gray-600">
                  {veiculo.modelo.split(" ")[0]} <span className="font-mono text-gray-400">{veiculo.placa}</span>
                </span>
              </div>
            );
          })}
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <span className="text-xs text-gray-600">Pendente</span>
          </div>
        </div>
      )}

      {/* Detalhe do dia selecionado */}
      {diaSelecionado && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3 capitalize">
            {diaSelecionado.toLocaleDateString("pt-BR", {
              weekday: "long", day: "numeric", month: "long",
            })}
          </h3>

          {reservasDoDia.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma reserva neste dia</p>
          ) : (
            <div className="space-y-2">
              {reservasDoDia.map((r) => {
                const ci = r.veiculo ? getCorIdx(r.veiculo.id, vehicleIds) : 0;
                const isPendente = r.status === "pendente";
                return (
                  <Link
                    key={r.id}
                    href={`/reservas/${r.id}`}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100"
                  >
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full mt-0.5 shrink-0",
                        isPendente ? "bg-yellow-500" : CORES_BG[ci]
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {r.motorista}
                      </p>
                      {r.veiculo ? (
                        <p className="text-xs text-gray-500">
                          {r.veiculo.modelo} ·{" "}
                          <span className="font-mono">{r.veiculo.placa}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-yellow-600">Veículo a definir</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {horaBRT(r.inicio)} → {horaBRT(r.fim)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full shrink-0 font-medium",
                        isPendente
                          ? "bg-yellow-100 text-yellow-700"
                          : r.status === "concluida"
                          ? "bg-gray-100 text-gray-600"
                          : "bg-blue-100 text-blue-700"
                      )}
                    >
                      {isPendente ? "Pendente" : r.status === "concluida" ? "Concluída" : "Aprovada"}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
