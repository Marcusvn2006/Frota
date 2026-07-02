"use client";

import { useActionState, Suspense, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { salvarPerfilAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, ArrowRight, AlertTriangle } from "lucide-react";

type PerfilInicial = {
  cnh_numero: string;
  cnh_categoria: string;
  cnh_validade: string;
};

export type CnhStatus = {
  urgencia: "vencido" | "critico" | "atencao";
  texto: string;
} | null;

const CNH_STATUS_STYLE: Record<
  NonNullable<CnhStatus>["urgencia"],
  { box: string; icon: string }
> = {
  vencido: { box: "bg-red-50 border-red-200 text-red-800", icon: "text-red-600" },
  critico: { box: "bg-orange-50 border-orange-200 text-orange-800", icon: "text-orange-600" },
  atencao: { box: "bg-yellow-50 border-yellow-200 text-yellow-800", icon: "text-yellow-600" },
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

function Form({ inicial, cnhStatus }: { inicial: PerfilInicial; cnhStatus: CnhStatus }) {
  const [state, formAction] = useActionState(salvarPerfilAction, null);
  const searchParams = useSearchParams();
  const novo = searchParams.get("novo") === "1";
  const router = useRouter();

  useEffect(() => {
    if (state?.success && novo) {
      router.push("/home");
    }
  }, [state, novo, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="max-w-2xl mx-auto">
          {novo ? (
            <>
              <h1 className="text-xl font-bold text-gray-900">Bem-vindo!</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Complete seus dados de habilitação para continuar.
              </p>
            </>
          ) : (
            <h1 className="text-xl font-bold text-gray-900">Meu perfil</h1>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {cnhStatus && (
          <div
            className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 ${CNH_STATUS_STYLE[cnhStatus.urgencia].box}`}
          >
            <AlertTriangle
              className={`w-4 h-4 mt-0.5 shrink-0 ${CNH_STATUS_STYLE[cnhStatus.urgencia].icon}`}
            />
            <div>
              <p className="text-sm font-medium">
                Sua CNH {cnhStatus.texto}.
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                Atualize a data de validade abaixo assim que renovar.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Habilitação (CNH)</h2>

          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
                {state.error}
              </div>
            )}
            {state?.success && (
              <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg border border-green-200 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                {state.success}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="cnh_numero">Número da CNH</Label>
              <Input
                id="cnh_numero"
                name="cnh_numero"
                placeholder="Opcional"
                defaultValue={inicial.cnh_numero}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cnh_categoria">Categoria</Label>
              <select
                id="cnh_categoria"
                name="cnh_categoria"
                defaultValue={inicial.cnh_categoria}
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
              <Label htmlFor="cnh_validade">
                Validade da CNH <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cnh_validade"
                name="cnh_validade"
                type="date"
                required
                defaultValue={inicial.cnh_validade}
              />
            </div>

            <SubmitButton />
          </form>
        </div>

        {novo ? (
          <button
            onClick={() => router.push("/home")}
            className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition-colors"
          >
            Pular por agora
          </button>
        ) : (
          <Link
            href="/home"
            className="flex items-center justify-center gap-1 text-sm text-blue-600 hover:underline py-2"
          >
            Voltar para o início
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

export function PerfilForm({
  inicial,
  cnhStatus,
}: {
  inicial: PerfilInicial;
  cnhStatus: CnhStatus;
}) {
  return (
    <Suspense>
      <Form inicial={inicial} cnhStatus={cnhStatus} />
    </Suspense>
  );
}
