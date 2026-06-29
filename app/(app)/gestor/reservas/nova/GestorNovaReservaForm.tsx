"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { criarReservaGestorAction } from "@/app/(app)/reservas/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DestinosInput } from "@/components/DestinosInput";
import type { Veiculo } from "@/lib/types/database.types";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Criando..." : label}
    </Button>
  );
}

function localOffset(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60000);
  return d.toISOString().slice(0, 16);
}

type Funcionario = { id: string; nome: string };

interface Props {
  nomeInicial: string;
  veiculos: Veiculo[];
  funcionarios: Funcionario[];
}

export function GestorNovaReservaForm({ nomeInicial, veiculos, funcionarios }: Props) {
  const [state, formAction] = useActionState(criarReservaGestorAction, null);
  const [motorista, setMotorista] = useState(nomeInicial);
  const [motoristaId, setMotoristaId] = useState("");
  const [veiculoId, setVeiculoId] = useState("");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/reservas" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Criar reserva direta</h1>
            <p className="text-sm text-gray-500">Aprovada imediatamente com veículo</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {/* Conflito — re-submit com forcar=1 */}
          {state?.conflito ? (
            <div className="space-y-4">
              <div className="bg-yellow-50 text-yellow-800 text-sm px-4 py-3 rounded-lg border border-yellow-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <p>{state.conflito}</p>
              </div>
              <form action={formAction} className="space-y-3">
                <input type="hidden" name="veiculo_id" value={veiculoId} />
                <input type="hidden" name="motorista" value={motorista} />
                <input type="hidden" name="motorista_id" value={motoristaId} />
                <input type="hidden" name="forcar" value="1" />
                {/* Re-submit preservando motorista/veiculo via hidden */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.location.reload()}
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                  >
                    Confirmar mesmo assim
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              {state?.error && (
                <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
                  {state.error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="motorista_select">Motorista</Label>
                <select
                  id="motorista_select"
                  value={motoristaId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const func = funcionarios.find((f) => f.id === id);
                    setMotoristaId(id);
                    setMotorista(func?.nome ?? "");
                  }}
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
                >
                  <option value="">Selecione um funcionário</option>
                  {funcionarios.map((f) => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
                <input type="hidden" name="motorista" value={motorista} />
                <input type="hidden" name="motorista_id" value={motoristaId} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="veiculo_id">Veículo</Label>
                <select
                  id="veiculo_id"
                  name="veiculo_id"
                  value={veiculoId}
                  onChange={(e) => setVeiculoId(e.target.value)}
                  required
                  className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
                >
                  <option value="">Selecione um veículo</option>
                  {veiculos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.modelo} — {v.placa} ({v.cor})
                      {v.precisa_atencao ? " ⚠" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="inicio">Saída</Label>
                  <Input
                    id="inicio"
                    name="inicio"
                    type="datetime-local"
                    defaultValue={localOffset(60)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fim">Retorno</Label>
                  <Input
                    id="fim"
                    name="fim"
                    type="datetime-local"
                    defaultValue={localOffset(300)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Destinos</Label>
                <DestinosInput />
              </div>

              <SubmitButton label="Criar reserva aprovada" />
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
