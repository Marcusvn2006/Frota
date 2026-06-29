import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Wrench, CheckCircle, AlertTriangle, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default async function ManutencaoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("papel")
    .eq("id", user.id)
    .single();

  const isGestor = perfil?.papel === "gestor";
  const agora = new Date().toISOString();

  const [{ data: veiculos }, { data: reservasAtivas }] = await Promise.all([
    supabase.from("veiculos").select("*").order("modelo"),
    supabase
      .from("reservas")
      .select("veiculo_id, motorista")
      .eq("status", "aprovada")
      .lte("inicio", agora)
      .gte("fim", agora),
  ]);

  // Map veiculo_id → motorista for active reservations
  const emUsoMap = new Map(
    (reservasAtivas ?? []).map((r) => [r.veiculo_id, r.motorista])
  );

  // Gestor: buscar itens reprovados para veículos com precisa_atencao
  const atencaoItensMap = new Map<string, { item: string; obs: string | null }[]>();
  if (isGestor) {
    const veiculosComAtencao = (veiculos ?? []).filter((v) => v.precisa_atencao);
    if (veiculosComAtencao.length > 0) {
      const { data: reservasCom } = await supabase
        .from("reservas")
        .select(`
          veiculo_id, fim,
          checklist:checklists!checklists_reserva_id_fkey(
            itens:checklist_itens(item, ok, obs)
          )
        `)
        .in("veiculo_id", veiculosComAtencao.map((v) => v.id))
        .order("fim", { ascending: false });

      // Para cada veículo, pega o checklist mais recente com itens reprovados
      for (const v of veiculosComAtencao) {
        const reservasDoVeiculo = (reservasCom ?? []).filter(
          (r) => r.veiculo_id === v.id
        );
        for (const r of reservasDoVeiculo) {
          const c = r.checklist as { itens: { item: string; ok: boolean; obs: string | null }[] } | null;
          if (!c) continue;
          const reprovados = c.itens.filter((i) => !i.ok);
          if (reprovados.length > 0) {
            atencaoItensMap.set(v.id, reprovados);
            break;
          }
        }
      }
    }
  }

  const emManutencao = veiculos?.filter((v) => v.em_manutencao) ?? [];
  const disponiveis = veiculos?.filter((v) => !v.em_manutencao) ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Frota</h1>
          <p className="text-sm text-gray-500">Situação atual dos veículos</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
        {/* Em manutenção */}
        {emManutencao.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-red-700 uppercase tracking-wide flex items-center gap-1.5">
              <Wrench className="w-4 h-4" />
              Em manutenção ({emManutencao.length})
            </h2>
            {emManutencao.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-xl border border-red-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{v.modelo}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {v.cor} &middot;{" "}
                      <span className="font-mono font-medium">{v.placa}</span>
                    </p>
                  </div>
                  <Badge variant="destructive">
                    <Wrench className="w-3 h-3 mr-1" />
                    Manutenção
                  </Badge>
                </div>
                {v.manutencao_motivo && (
                  <p className="text-xs text-red-600 mt-2 bg-red-50 rounded-lg px-3 py-1.5">
                    {v.manutencao_motivo}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Disponíveis */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" />
            Disponíveis ({disponiveis.length})
          </h2>

          {disponiveis.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">Nenhum veículo disponível no momento</p>
            </div>
          ) : (
            disponiveis.map((v) => {
              const motorista = emUsoMap.get(v.id);
              const emUso = !!motorista;
              return (
                <div
                  key={v.id}
                  className={`bg-white rounded-xl border p-4 ${
                    emUso ? "border-blue-200" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{v.modelo}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {v.cor} &middot;{" "}
                        <span className="font-mono font-medium">{v.placa}</span>
                      </p>
                      {emUso && (
                        <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                          <Car className="w-3 h-3" />
                          {motorista}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {emUso ? (
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
                  {/* Detalhes para gestor */}
                  {v.precisa_atencao && isGestor && atencaoItensMap.has(v.id) && (
                    <div className="mt-2 bg-yellow-50 rounded-lg px-3 py-2 border border-yellow-100">
                      <p className="text-xs font-medium text-yellow-800 mb-0.5">
                        Itens reprovados no último checklist:
                      </p>
                      <ul className="space-y-0.5">
                        {atencaoItensMap.get(v.id)!.map((it) => (
                          <li key={it.item} className="text-xs text-yellow-700">
                            • {it.item}
                            {it.obs ? (
                              <span className="text-yellow-600">: {it.obs}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
