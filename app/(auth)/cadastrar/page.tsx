"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { cadastrarAction } from "../actions";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? "Criando conta…" : "Criar conta"}
    </Button>
  );
}

export default function CadastrarPage() {
  const [state, action] = useActionState(cadastrarAction, null);

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Criar conta
      </h2>

      <form action={action} className="space-y-4">
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
            placeholder="Mínimo 8 caracteres"
          />
        </div>

        {state?.error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
            {state.error}
          </p>
        )}

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
