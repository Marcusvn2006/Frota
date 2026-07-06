"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { criarMultaAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlacaInput } from "@/components/PlacaInput";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Cadastrando..." : "Cadastrar multa"}
    </Button>
  );
}

export default function NovaMultaPage() {
  const [state, formAction] = useActionState(criarMultaAction, null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/gestor/multas" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Nova multa</h1>
        </div>
      </div>

      {/* Formulário */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
                {state.error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="placa">Placa do veículo</Label>
              <PlacaInput />
              <p className="text-xs text-gray-400">
                O motorista responsável é sugerido automaticamente pela reserva
                que usava o carro nesse horário.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="data_infracao">Data da infração</Label>
                <Input id="data_infracao" name="data_infracao" type="date" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hora_infracao">Hora da infração</Label>
                <Input id="hora_infracao" name="hora_infracao" type="time" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                name="valor"
                type="number"
                min="0"
                step="0.01"
                placeholder="Ex: 195.23"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descricao">Descrição / motivo</Label>
              <Textarea
                id="descricao"
                name="descricao"
                placeholder="Ex: Excesso de velocidade na Av. Paulista"
                rows={3}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prazo_pagamento">Prazo de pagamento</Label>
              <Input id="prazo_pagamento" name="prazo_pagamento" type="date" required />
            </div>

            <SubmitButton />
          </form>
        </div>
      </div>
    </div>
  );
}
