import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Ticket, Car, UserRound, UserX, CheckCircle, RotateCcw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateOnlyBR, formatBRL } from "@/lib/utils";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { resolverMultaAction, reabrirMultaAction } from "./actions";
import { TrocarMotoristaButton } from "./TrocarMotoristaButton";

const STATUS_OPTIONS = ["pendentes", "resolvidas", "todas"] as const;
type StatusFiltro = (typeof STATUS_OPTIONS)[number];

const STATUS_LABELS: Record<StatusFiltro, string> = {
  pendentes: "Pendentes",
  resolvidas: "Resolvidas",
  todas: "Todas",
};

type MultaRow = {
  id: string;
  data_infracao: string;
  hora_infracao: string;
  valor: number;
  descricao: string;
  prazo_pagamento: string | null;
  resolvida: boolean;
  veiculo: { id: string; modelo: string; placa: string } | null;
  motorista: { id: string; nome: string } | null;
};

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function MultasPage({ searchParams }: Props) {
  const { status: statusParam } = await searchParams;
  const status: StatusFiltro = STATUS_OPTIONS.includes(statusParam as StatusFiltro)
    ? (statusParam as StatusFiltro)
    : "pendentes";

  const usuarioAtual = await getUsuarioAtual();
  if (!usuarioAtual) redirect("/login");
  if (usuarioAtual.perfil.papel !== "gestor") redirect("/home");

  const supabase = await createClient();

  let query = supabase
    .from("multas")
    .select(`
      id, data_infracao, hora_infracao, valor, descricao, prazo_pagamento, resolvida,
      veiculo:veiculos!multas_veiculo_id_fkey(id, modelo, placa),
      motorista:motoristas!multas_motorista_id_fkey(id, nome)
    `)
    .order("data_infracao", { ascending: false });

  if (status === "pendentes") query = query.eq("resolvida", false);
  if (status === "resolvidas") query = query.eq("resolvida", true);

  const { data: multasRaw } = await query;
  const multas = (multasRaw ?? []) as unknown as MultaRow[];

  const { data: motoristas } = await supabase
    .from("motoristas")
    .select("id, nome")
    .order("nome");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Multas</h1>
            <p className="text-sm text-gray-500">Controle de multas da frota</p>
          </div>
          <Button asChild size="sm">
            <Link href="/gestor/multas/nova">
              <Plus className="w-4 h-4" />
              Nova
            </Link>
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Filtro de status */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none]">
          {STATUS_OPTIONS.map((s) => (
            <Link
              key={s}
              href={`?status=${s}`}
              className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                status === s
                  ? "bg-blue-700 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {STATUS_LABELS[s]}
            </Link>
          ))}
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {multas.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Ticket className="w-12 h-12 mx-auto mb-3 stroke-1" />
              <p className="font-medium">Nenhuma multa encontrada</p>
              <p className="text-sm mt-1">Ajuste os filtros ou cadastre uma nova</p>
            </div>
          )}

          {multas.map((m) => (
            <div
              key={m.id}
              className={`bg-white rounded-xl border p-4 ${
                m.resolvida
                  ? "border-gray-200 opacity-70"
                  : m.motorista
                  ? "border-gray-200"
                  : "border-orange-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-0.5">
                    <Car className="w-3.5 h-3.5" />
                    {m.veiculo ? `${m.veiculo.modelo} (${m.veiculo.placa})` : "Veículo"}
                  </div>
                  <p className="font-semibold text-gray-900">{formatBRL(m.valor)}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {formatDateOnlyBR(m.data_infracao)} às {m.hora_infracao.slice(0, 5)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{m.descricao}</p>
                  {m.prazo_pagamento && (
                    <p className="text-xs text-gray-400 mt-1">
                      Prazo de pagamento: {formatDateOnlyBR(m.prazo_pagamento)}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {m.resolvida ? (
                    <Badge variant="success" className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Resolvida
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-800 border-none">
                      Pendente
                    </Badge>
                  )}

                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    {m.motorista ? (
                      <>
                        <UserRound className="w-3.5 h-3.5" />
                        {m.motorista.nome}
                      </>
                    ) : (
                      <span className="flex items-center gap-1 text-orange-600 font-medium">
                        <UserX className="w-3.5 h-3.5" />
                        Sem motorista
                      </span>
                    )}
                  </div>

                  <TrocarMotoristaButton
                    multaId={m.id}
                    motoristaAtualId={m.motorista?.id ?? null}
                    motoristas={motoristas ?? []}
                  />

                  {m.resolvida ? (
                    <form action={reabrirMultaAction.bind(null, m.id)}>
                      <button
                        type="submit"
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 underline underline-offset-2"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reabrir
                      </button>
                    </form>
                  ) : (
                    <form action={resolverMultaAction.bind(null, m.id)}>
                      <button
                        type="submit"
                        className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
                      >
                        Marcar resolvida
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
