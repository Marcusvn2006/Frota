"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { esquecerSenhaAction } from "../actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? "Enviando…" : "Enviar link"}
    </Button>
  );
}

export default function EsqueciSenhaPage() {
  const [state, action] = useActionState(esquecerSenhaAction, null);

  if (state?.success) {
    return (
      <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          E-mail enviado!
        </h2>
        <p className="text-sm text-gray-500 mb-6">{state.success}</p>
        <Link href="/login" className="text-blue-700 text-sm font-medium hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        Esqueci minha senha
      </h2>
      <p className="text-sm text-gray-500 mb-6">
        Informe seu e-mail e enviaremos um link para redefinir sua senha.
      </p>

      <form action={action} className="space-y-4">
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

        {state?.error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href="/login" className="text-blue-700 font-medium hover:underline">
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
