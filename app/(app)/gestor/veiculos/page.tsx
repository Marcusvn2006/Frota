import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Wrench, AlertTriangle, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";

const STATUS_OPTIONS = ["todos", "disponiveis", "manutencao", "atencao"] as const;
type StatusFiltro = (typeof STATUS_OPTIONS)[number];

const STATUS_LABELS: Record<StatusFiltro, string> = {
  todos: "Todos",
  disponiveis: "Disponíveis",
  manutencao: "Manutenção",
  atencao: "Atenção",
};

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function VeiculosPage({ searchParams }: Props) {
  const { status: statusParam } = await searchParams;
  const status: StatusFiltro = STATUS_OPTIONS.includes(statusParam as StatusFiltro)
    ? (statusParam as StatusFiltro)
    : "todos";

  const usuarioAtual = await getUsuarioAtual();
  if (!usuarioAtual) redirect("/login");
  if (usuarioAtual.perfil.papel !== "gestor") redirect("/home");

  const supabase = await createClient();

  const agora = new Date().toISOString();

  const [{ data: veiculosRaw }, { data: reservasAtivas }] = await Promise.all([
    supabase.from("veiculos").select("*").order("modelo"),
    supabase
      .from("reservas")
      .select("veiculo_id, motorista")
      .eq("status", "aprovada")
      .lte("inicio", agora)
      .gte("fim", agora),
  ]);

  const emUsoMap = new Map(
    (reservasAtivas ?? []).map((r) => [r.veiculo_id, r.motorista])
  );

  const veiculos = (veiculosRaw ?? []).filter((v) => {
    if (status === "manutencao") return v.em_manutencao;
    if (status === "atencao") return v.precisa_atencao && !v.em_manutencao;
    if (status === "disponiveis") return !v.em_manutencao;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Veículos</h1>
            <p className="text-sm text-gray-500">
              {veiculos.length} veículo
              {veiculos.length !== 1 ? "s" : ""}
              {status !== "todos" ? ` · ${STATUS_LABELS[status].toLowerCase()}` : ""}
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/gestor/veiculos/novo">
              <Plus className="w-4 h-4" />
              Novo
            </Link>
          </Button>
        </div>
      </div>

      {/* Lista */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {/* Filtro de status */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none]">
          {STATUS_OPTIONS.map((s) => (
            <Link
              key={s}
              href={s === "todos" ? "/gestor/veiculos" : `/gestor/veiculos?status=${s}`}
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

        {veiculos.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Car className="w-12 h-12 mx-auto mb-3 stroke-1" />
            <p className="font-medium">
              {status === "todos" ? "Nenhum veículo cadastrado" : "Nenhum veículo nesta categoria"}
            </p>
            <p className="text-sm mt-1">Adicione o primeiro veículo da frota</p>
          </div>
        )}

        {veiculos.map((v) => {
          const motorista = emUsoMap.get(v.id);
          const emUso = !v.em_manutencao && !!motorista;
          return (
            <Link
              key={v.id}
              href={`/gestor/veiculos/${v.id}/editar`}
              className={`block bg-white rounded-xl border p-4 hover:shadow-sm transition-all active:scale-[0.98] ${
                emUso
                  ? "border-blue-200 hover:border-blue-300"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{v.modelo}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {v.cor} &middot; <span className="font-mono font-medium">{v.placa}</span>
                  </p>
                  {emUso && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <Car className="w-3 h-3" />
                      {motorista}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1 items-end shrink-0">
                  {v.em_manutencao ? (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      Manutenção
                    </Badge>
                  ) : emUso ? (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      Em uso
                    </Badge>
                  ) : (
                    <Badge variant="success">Disponível</Badge>
                  )}
                  {v.precisa_atencao && (
                    <Badge variant="warning" className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Atenção
                    </Badge>
                  )}
                </div>
              </div>

              {v.em_manutencao && v.manutencao_motivo && (
                <p className="text-xs text-red-600 mt-2 bg-red-50 rounded-lg px-3 py-1.5">
                  {v.manutencao_motivo}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
