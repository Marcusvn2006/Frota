"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { loginAction, reenviarConfirmacaoAction } from "../actions";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MailWarning, CheckCircle2 } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      {pending ? "Entrando…" : "Entrar"}
    </Button>
  );
}

function ReenviarButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs font-medium text-amber-800 underline underline-offset-2 disabled:opacity-50"
    >
      {pending ? "Reenviando…" : "Reenviar e-mail de confirmação"}
    </button>
  );
}

export default function LoginPage() {
  const [state, action] = useActionState(loginAction, null);
  const [reenviarState, reenviarAction] = useActionState(reenviarConfirmacaoAction, null);

  const emailNaoConfirmado = state?.emailNaoConfirmado === true;
  const emailParaReenvio = emailNaoConfirmado ? (state as { email: string }).email : "";

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Entrar na conta
      </h2>

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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link
              href="/esqueci-senha"
              className="text-xs text-blue-700 hover:underline"
            >
              Esqueci minha senha
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="••••••"
          />
        </div>

        {state?.error && !emailNaoConfirmado && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>

      {/* E-mail não confirmado */}
      {emailNaoConfirmado && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2">
            <MailWarning className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm font-medium text-amber-800">
              E-mail não confirmado
            </p>
          </div>
          <p className="text-xs text-amber-700">
            Enviamos um link de confirmação para{" "}
            <strong>{emailParaReenvio}</strong>. Verifique sua caixa de entrada
            e a pasta de spam antes de reenviar.
          </p>

          {reenviarState?.success ? (
            <div className="flex items-center gap-1.5 text-xs text-green-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {reenviarState.success}
            </div>
          ) : (
            <>
              {reenviarState?.error && (
                <p className="text-xs text-red-600">{reenviarState.error}</p>
              )}
              <form action={reenviarAction}>
                <input type="hidden" name="email" value={emailParaReenvio} />
                <ReenviarButton />
              </form>
            </>
          )}
        </div>
      )}

      <p className="mt-6 text-center text-sm text-gray-500">
        Não tem conta?{" "}
        <Link href="/cadastrar" className="text-blue-700 font-medium hover:underline">
          Cadastrar-se
        </Link>
      </p>
    </div>
  );
}
