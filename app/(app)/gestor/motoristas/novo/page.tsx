"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { criarMotoristaAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Cadastrando..." : "Cadastrar motorista"}
    </Button>
  );
}

export default function NovoMotoristaPage() {
  const [state, formAction] = useActionState(criarMotoristaAction, null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/gestor/motoristas" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Novo motorista</h1>
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
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                name="nome"
                placeholder="Ex: João da Silva"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cnh_numero">Número da CNH</Label>
              <Input id="cnh_numero" name="cnh_numero" placeholder="Opcional" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cnh_categoria">Categoria da CNH</Label>
              <select
                id="cnh_categoria"
                name="cnh_categoria"
                defaultValue=""
                className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Selecione (opcional)</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="AB">AB</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cnh_validade">Validade da CNH</Label>
              <Input id="cnh_validade" name="cnh_validade" type="date" />
            </div>

            <p className="text-xs text-gray-400">
              Este cadastro é para motoristas terceirizados, sem login no sistema.
              Motoristas com conta de usuário aparecem aqui automaticamente.
            </p>

            <SubmitButton />
          </form>
        </div>
      </div>
    </div>
  );
}
