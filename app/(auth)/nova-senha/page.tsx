"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default function NovaSenhaPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Se o evento não chegar em 4s, o link é inválido ou expirado
    const timer = setTimeout(() => setTimedOut(true), 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");

    if (password.length < 8) {
      setFormError("Senha deve ter pelo menos 8 caracteres");
      return;
    }
    if (password !== confirm) {
      setFormError("As senhas não coincidem");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setFormError("Erro ao atualizar a senha. Tente novamente.");
      setPending(false);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/home"), 2000);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Senha atualizada!</h2>
        <p className="text-sm text-gray-500">Redirecionando...</p>
      </div>
    );
  }

  if (!ready && timedOut) {
    return (
      <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-600 mb-4">
          Link inválido ou expirado.
        </p>
        <Link
          href="/esqueci-senha"
          className="text-blue-700 text-sm font-medium hover:underline"
        >
          Solicitar novo link
        </Link>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-sm text-gray-400">Verificando link...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Nova senha</h2>
      <p className="text-sm text-gray-500 mb-6">
        Escolha uma senha forte com pelo menos 8 caracteres.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">Nova senha</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirmar nova senha</Label>
          <PasswordInput
            id="confirm"
            name="confirm"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Repita a senha"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {formError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">
            {formError}
          </p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Salvando…" : "Salvar nova senha"}
        </Button>
      </form>
    </div>
  );
}
