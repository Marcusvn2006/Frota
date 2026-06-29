"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft, CalendarSearch } from "lucide-react";
import { criarReservaAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DestinosInput } from "@/components/DestinosInput";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Enviando..." : "Enviar solicitação"}
    </Button>
  );
}

function localOffset(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60000);
  return d.toISOString().slice(0, 16);
}

export function NovaReservaForm({ nomeInicial }: { nomeInicial: string }) {
  const [state, formAction] = useActionState(criarReservaAction, null);
  const [motorista, setMotorista] = useState(nomeInicial);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/reservas" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Solicitar reserva</h1>
            <p className="text-sm text-gray-500">Aguardará aprovação do gestor</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        <Link
          href="/veiculos/disponibilidade"
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 transition-colors"
        >
          <CalendarSearch className="w-4 h-4 shrink-0" />
          Verificar disponibilidade de veículos antes de solicitar
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
                {state.error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="motorista">Motorista</Label>
              <Input
                id="motorista"
                name="motorista"
                value={motorista}
                onChange={(e) => setMotorista(e.target.value)}
                placeholder="Nome completo"
                required
              />
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

            <SubmitButton />
          </form>
        </div>
      </div>
    </div>
  );
}
