"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { cadastrarAction } from "../actions";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Turnstile } from "@/components/Turnstile";
import { Building2, KeyRound } from "lucide-react";
import { SENHA_DICA } from "@/lib/senha";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? "Criando conta…" : "Criar conta"}
    </Button>
  );
}

type Modo = "criar" | "entrar";

export default function CadastrarPage() {
  const [state, action] = useActionState(cadastrarAction, null);
  const [modo, setModo] = useState<Modo>("criar");

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Criar conta</h2>

      {/* Seletor de modo */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          type="button"
          onClick={() => setModo("criar")}
          className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors ${
            modo === "criar"
              ? "border-blue-600 bg-blue-50 text-blue-700"
              : "border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span className="text-xs font-medium leading-tight">Criar empresa nova</span>
        </button>
        <button
          type="button"
          onClick={() => setModo("entrar")}
          className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition-colors ${
            modo === "entrar"
              ? "border-blue-600 bg-blue-50 text-blue-700"
              : "border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
        >
          <KeyRound className="w-5 h-5" />
          <span className="text-xs font-medium leading-tight">Entrar com código</span>
        </button>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="modo" value={modo} />

        {modo === "criar" ? (
          <div className="space-y-1.5">
            <Label htmlFor="empresa_nome">Nome da empresa</Label>
            <Input
              id="empresa_nome"
              name="empresa_nome"
              type="text"
              required
              minLength={2}
              placeholder="Ex: Transportes Silva"
            />
            <p className="text-xs text-gray-400">
              Você será o gestor. Depois compartilhe o código com sua equipe.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="empresa_codigo">Código da empresa</Label>
            <Input
              id="empresa_codigo"
              name="empresa_codigo"
              type="text"
              required
              placeholder="Ex: ABC123"
              className="uppercase tracking-widest font-mono"
              autoCapitalize="characters"
            />
            <p className="text-xs text-gray-400">Peça o código ao gestor da sua empresa.</p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome completo</Label>
          <Input
            id="nome"
            name="nome"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            placeholder="Seu nome"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="seu@email.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder={SENHA_DICA}
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
            {state.error}
          </p>
        )}

        <Turnstile />

        <SubmitButton />
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Já tem conta?{" "}
        <Link href="/login" className="text-blue-700 font-medium hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
