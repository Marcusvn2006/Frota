import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarClock, AlertTriangle, CheckCircle, Car, UserRound, RotateCcw, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateOnlyBR } from "@/lib/utils";
import { TIPO_LABEL, hojeBRT, diferencaDias, urgenciaVencimento, descricaoPrazo } from "@/lib/vencimentos";
import type { TipoVencimento } from "@/lib/types/database.types";
import { resolverVencimentoAction, reabrirVencimentoAction } from "./actions";

const STATUS_OPTIONS = ["pendentes", "resolvidos", "todos"] as const;
type StatusFiltro = (typeof STATUS_OPTIONS)[number];

const STATUS_LABELS: Record<StatusFiltro, string> = {
  pendentes: "Pendentes",
  resolvidos: "Resolvidos",
  todos: "Todos",
};

const TIPO_OPTIONS = ["todos", "cnh", "ipva", "licenciamento", "revisao", "seguro"] as const;
type TipoFiltro = (typeof TIPO_OPTIONS)[number];

interface Props {
  searchParams: Promise<{ status?: string; tipo?: string }>;
}

export default async function VencimentosPage({ searchParams }: Props) {
  const { status: statusParam, tipo: tipoParam } = await searchParams;
  const status: StatusFiltro = STATUS_OPTIONS.includes(statusParam as StatusFiltro)
    ? (statusParam as StatusFiltro)
    : "pendentes";
  const tipo: TipoFiltro = TIPO_OPTIONS.includes(tipoParam as TipoFiltro)
    ? (tipoParam as TipoFiltro)
    : "todos";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .single();

  if (perfil?.papel !== "gestor") redirect("/home");

  let query = supabase
    .from("vencimentos")
    .select("id, entidade_tipo, entidade_id, tipo, data_vencimento, resolvido, observacao")
    .order("data_vencimento");

  if (status === "pendentes") query = query.eq("resolvido", false);
  if (status === "resolvidos") query = query.eq("resolvido", true);
  if (tipo !== "todos") query = query.eq("tipo", tipo as TipoVencimento);

  const { data: vencimentos } = await query;

  const veiculoIds = (vencimentos ?? [])
    .filter((v) => v.entidade_tipo === "veiculo")
    .map((v) => v.entidade_id);
  const motoristaIds = (vencimentos ?? [])
    .filter((v) => v.entidade_tipo === "motorista")
    .map((v) => v.entidade_id);

  const [{ data: veiculos }, { data: motoristas }] = await Promise.all([
    veiculoIds.length
      ? supabase.from("veiculos").select("id, modelo, placa").in("id", veiculoIds)
      : Promise.resolve({ data: [] as { id: string; modelo: string; placa: string }[] }),
    motoristaIds.length
      ? supabase.from("motoristas").select("id, nome").in("id", motoristaIds)
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
  ]);

  const veiculoMap = new Map((veiculos ?? []).map((v) => [v.id, v]));
  const motoristaMap = new Map((motoristas ?? []).map((m) => [m.id, m]));

  const hoje = hojeBRT();

  const urgenciaStyles: Record<
    ReturnType<typeof urgenciaVencimento>,
    { badge: string; border: string }
  > = {
    vencido: { badge: "bg-red-100 text-red-800", border: "border-red-200" },
    critico: { badge: "bg-orange-100 text-orange-800", border: "border-orange-200" },
    atencao: { badge: "bg-yellow-100 text-yellow-800", border: "border-yellow-200" },
    ok: { badge: "bg-green-100 text-green-800", border: "border-gray-200" },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Vencimentos</h1>
          <p className="text-sm text-gray-500">
            CNH, IPVA, licenciamento, revisão e seguro
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Filtro de status */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none]">
          {STATUS_OPTIONS.map((s) => (
            <Link
              key={s}
              href={`?status=${s}&tipo=${tipo}`}
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

        {/* Filtro de tipo */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none]">
          {TIPO_OPTIONS.map((t) => (
            <Link
              key={t}
              href={`?status=${status}&tipo=${t}`}
              className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                tipo === t
                  ? "bg-gray-800 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t === "todos" ? "Todos" : TIPO_LABEL[t as TipoVencimento]}
            </Link>
          ))}
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {(!vencimentos || vencimentos.length === 0) && (
            <div className="text-center py-16 text-gray-400">
              <CalendarClock className="w-12 h-12 mx-auto mb-3 stroke-1" />
              <p className="font-medium">Nenhum vencimento encontrado</p>
              <p className="text-sm mt-1">Ajuste os filtros para ver outros itens</p>
            </div>
          )}

          {vencimentos?.map((v) => {
            const dias = diferencaDias(v.data_vencimento, hoje);
            const urgencia = urgenciaVencimento(dias);
            const style = urgenciaStyles[urgencia];

            const entidadeNome =
              v.entidade_tipo === "veiculo"
                ? (() => {
                    const veic = veiculoMap.get(v.entidade_id);
                    return veic ? `${veic.modelo} (${veic.placa})` : "Veículo";
                  })()
                : (() => {
                    const mot = motoristaMap.get(v.entidade_id);
                    return mot ? mot.nome : "Motorista";
                  })();

            return (
              <div
                key={v.id}
                className={`bg-white rounded-xl border p-4 ${
                  v.resolvido ? "border-gray-200 opacity-70" : style.border
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-0.5">
                      {v.entidade_tipo === "veiculo" ? (
                        <Car className="w-3.5 h-3.5" />
                      ) : (
                        <UserRound className="w-3.5 h-3.5" />
                      )}
                      {entidadeNome}
                    </div>
                    <p className="font-semibold text-gray-900">{TIPO_LABEL[v.tipo]}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatDateOnlyBR(v.data_vencimento)}
                    </p>
                    {v.observacao && (
                      <p className="text-xs text-gray-400 mt-1">{v.observacao}</p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {v.resolvido ? (
                      <Badge variant="success" className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Resolvido
                      </Badge>
                    ) : (
                      <Badge className={`${style.badge} flex items-center gap-1 border-none`}>
                        {urgencia === "vencido" && <AlertTriangle className="w-3 h-3" />}
                        {descricaoPrazo(dias)}
                      </Badge>
                    )}

                    <Link
                      href={
                        v.entidade_tipo === "veiculo"
                          ? `/gestor/veiculos/${v.entidade_id}/editar`
                          : `/gestor/motoristas/${v.entidade_id}/editar`
                      }
                      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 underline underline-offset-2"
                    >
                      <Pencil className="w-3 h-3" />
                      Atualizar data
                    </Link>

                    {v.resolvido ? (
                      <form action={reabrirVencimentoAction.bind(null, v.id)}>
                        <button
                          type="submit"
                          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 underline underline-offset-2"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reabrir
                        </button>
                      </form>
                    ) : (
                      <form action={resolverVencimentoAction.bind(null, v.id)}>
                        <button
                          type="submit"
                          className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
                        >
                          Marcar resolvido
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
