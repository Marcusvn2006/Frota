"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft, Car, CheckCircle2, XCircle, Wrench, Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verificarDisponibilidadeAction, type DisponibilidadeState } from "./actions";

function localOffset(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60000);
  return d.toISOString().slice(0, 16);
}

function VerificarButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        "Verificando..."
      ) : (
        <>
          <Search className="w-4 h-4 mr-2" />
          Verificar disponibilidade
        </>
      )}
    </Button>
  );
}


export function DisponibilidadeClient() {
  const [inicio, setInicio] = useState(localOffset(60));
  const [fim, setFim] = useState(localOffset(300));

  const [state, formAction] = useActionState<DisponibilidadeState, FormData>(
    verificarDisponibilidadeAction,
    null
  );

  const disponiveis = state?.resultado.filter((v) => v.disponivel) ?? [];
  const indisponiveis = state?.resultado.filter((v) => !v.disponivel) ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/home" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Disponibilidade</h1>
            <p className="text-sm text-gray-500">Veja quais veículos estão livres no período</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Seletor de período */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <form action={formAction} className="space-y-4">
            {/* Inputs ocultos com os valores controlados */}
            <input type="hidden" name="inicio" value={inicio} />
            <input type="hidden" name="fim" value={fim} />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inicio">Saída</Label>
                <Input
                  id="inicio"
                  type="datetime-local"
                  value={inicio}
                  onChange={(e) => setInicio(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fim">Retorno</Label>
                <Input
                  id="fim"
                  type="datetime-local"
                  value={fim}
                  onChange={(e) => setFim(e.target.value)}
                  required
                />
              </div>
            </div>

            {state?.error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md border border-red-200">
                {state.error}
              </p>
            )}

            <VerificarButton />
          </form>
        </div>

        {/* Resultado */}
        {state && !state.error && (
          <>
            {state.resultado.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                <p className="text-sm text-gray-500">Nenhum veículo cadastrado na frota.</p>
              </div>
            )}

            {/* Disponíveis */}
            {disponiveis.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-green-50">
                  <CheckCircle2 className="w-4 h-4 text-green-700" />
                  <p className="text-sm font-semibold text-green-800">
                    {disponiveis.length} disponível{disponiveis.length !== 1 ? "eis" : ""} neste período
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {disponiveis.map((v) => (
                    <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                        <Car className="w-4 h-4 text-green-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{v.modelo}</p>
                        <p className="text-xs text-gray-500">
                          {v.cor} ·{" "}
                          <span className="font-mono">{v.placa}</span>
                        </p>
                      </div>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                        Livre
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Indisponíveis */}
            {indisponiveis.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                  <XCircle className="w-4 h-4 text-gray-400" />
                  <p className="text-sm font-semibold text-gray-500">
                    {indisponiveis.length} indisponível{indisponiveis.length !== 1 ? "eis" : ""} neste período
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {indisponiveis.map((v) => (
                    <div key={v.id} className="flex items-center gap-3 px-4 py-3 opacity-60">
                      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                        {v.motivo === "manutencao" ? (
                          <Wrench className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Car className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700">{v.modelo}</p>
                        <p className="text-xs text-gray-400">
                          {v.cor} ·{" "}
                          <span className="font-mono">{v.placa}</span>
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          v.motivo === "manutencao"
                            ? "bg-red-100 text-red-600"
                            : "bg-orange-100 text-orange-600"
                        }`}
                      >
                        {v.motivo === "manutencao" ? "Manutenção" : "Reservado"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA — solicitar reserva */}
            {disponiveis.length > 0 && (
              <Link
                href="/reservas/nova"
                className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
              >
                Solicitar reserva
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            {disponiveis.length === 0 && state.resultado.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-sm font-medium text-amber-800">
                  Nenhum veículo disponível neste período.
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Tente um horário diferente.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
