"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { criarVeiculoAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Cadastrando..." : "Cadastrar veículo"}
    </Button>
  );
}

export default function NovoVeiculoPage() {
  const [state, formAction] = useActionState(criarVeiculoAction, null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/gestor/veiculos" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Novo veículo</h1>
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
              <Label htmlFor="modelo">Modelo</Label>
              <Input
                id="modelo"
                name="modelo"
                placeholder="Ex: Toyota Corolla"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cor">Cor</Label>
              <Input
                id="cor"
                name="cor"
                placeholder="Ex: Prata"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="placa">Placa</Label>
              <Input
                id="placa"
                name="placa"
                placeholder="Ex: ABC1D23"
                maxLength={8}
                className="uppercase"
                required
              />
              <p className="text-xs text-gray-400">
                Formatos: AAA0000 (antigo) ou AAA0A00 (Mercosul)
              </p>
            </div>

            <SubmitButton />
          </form>
        </div>
      </div>
    </div>
  );
}
