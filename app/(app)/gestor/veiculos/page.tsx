import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Wrench, AlertTriangle, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function VeiculosPage() {
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

  const emUsoMap = new Map(
    (reservasAtivas ?? []).map((r) => [r.veiculo_id, r.motorista])
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Veículos</h1>
            <p className="text-sm text-gray-500">
              {veiculos?.length ?? 0} veículo
              {(veiculos?.length ?? 0) !== 1 ? "s" : ""} cadastrado
              {(veiculos?.length ?? 0) !== 1 ? "s" : ""}
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
        {(!veiculos || veiculos.length === 0) && (
          <div className="text-center py-16 text-gray-400">
            <Car className="w-12 h-12 mx-auto mb-3 stroke-1" />
            <p className="font-medium">Nenhum veículo cadastrado</p>
            <p className="text-sm mt-1">Adicione o primeiro veículo da frota</p>
          </div>
        )}

        {veiculos?.map((v) => {
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
