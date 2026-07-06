import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, UserRound, IdCard, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateOnlyBR } from "@/lib/utils";
import { hojeBRT, diferencaDias, urgenciaVencimento, descricaoPrazo } from "@/lib/vencimentos";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";

const URGENCIA_STYLES: Record<string, string> = {
  vencido: "bg-red-100 text-red-800",
  critico: "bg-orange-100 text-orange-800",
  atencao: "bg-yellow-100 text-yellow-800",
};

export default async function MotoristasPage() {
  const usuarioAtual = await getUsuarioAtual();
  if (!usuarioAtual) redirect("/login");
  if (usuarioAtual.perfil.papel !== "gestor") redirect("/home");

  const supabase = await createClient();

  const { data: motoristas } = await supabase
    .from("motoristas")
    .select("*")
    .order("nome");

  const hoje = hojeBRT();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Motoristas</h1>
            <p className="text-sm text-gray-500">
              {motoristas?.length ?? 0} motorista
              {(motoristas?.length ?? 0) !== 1 ? "s" : ""} cadastrado
              {(motoristas?.length ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/gestor/motoristas/novo">
              <Plus className="w-4 h-4" />
              Novo
            </Link>
          </Button>
        </div>
      </div>

      {/* Lista */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {(!motoristas || motoristas.length === 0) && (
          <div className="text-center py-16 text-gray-400">
            <UserRound className="w-12 h-12 mx-auto mb-3 stroke-1" />
            <p className="font-medium">Nenhum motorista cadastrado</p>
            <p className="text-sm mt-1">Adicione o primeiro motorista da frota</p>
          </div>
        )}

        {motoristas?.map((m) => {
          const dias = m.cnh_validade ? diferencaDias(m.cnh_validade, hoje) : null;
          const urgencia = dias !== null ? urgenciaVencimento(dias) : null;

          return (
            <Link
              key={m.id}
              href={`/gestor/motoristas/${m.id}/editar`}
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm hover:border-blue-300 transition-all active:scale-[0.98]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{m.nome}</p>
                  {m.cnh_numero && (
                    <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                      <IdCard className="w-3.5 h-3.5" />
                      CNH {m.cnh_categoria ? `${m.cnh_categoria} · ` : ""}
                      {m.cnh_numero}
                    </p>
                  )}
                  {m.cnh_validade && (
                    <p className="text-xs text-gray-400 mt-1">
                      Validade: {formatDateOnlyBR(m.cnh_validade)}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1 items-end shrink-0">
                  {m.usuario_id ? (
                    <Badge variant="secondary">Com login</Badge>
                  ) : (
                    <Badge variant="outline">Terceirizado</Badge>
                  )}
                  {urgencia && urgencia !== "ok" && dias !== null && (
                    <Badge className={`${URGENCIA_STYLES[urgencia]} flex items-center gap-1 border-none`}>
                      {urgencia === "vencido" && <AlertTriangle className="w-3 h-3" />}
                      CNH {descricaoPrazo(dias)}
                    </Badge>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
