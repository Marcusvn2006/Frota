import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Clock, Car, Calendar, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBRT } from "@/lib/utils";
import type { StatusReserva } from "@/lib/types/database.types";

type MinhaReserva = {
  id: string;
  motorista: string;
  inicio: string;
  fim: string;
  status: StatusReserva;
  motivo_recusa: string | null;
  veiculo: { modelo: string; placa: string } | null;
  destinos: { destino: string; ordem: number }[];
  checklist: { id: string; km_saida: number | null } | null;
};

const STATUS_BADGE: Record<
  StatusReserva,
  {
    label: string;
    variant: "default" | "warning" | "success" | "destructive" | "secondary";
  }
> = {
  pendente: { label: "Pendente", variant: "warning" },
  aprovada: { label: "Aprovada", variant: "default" },
  recusada: { label: "Recusada", variant: "destructive" },
  concluida: { label: "Concluída", variant: "success" },
};

export default async function MinhasReservasPage() {
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

  // Gestor acessa o painel completo
  if (perfil?.papel === "gestor") redirect("/reservas");

  // UUID não tem espaços — .or() funciona corretamente com UUIDs
  const { data: reservasRaw } = await supabase
    .from("reservas")
    .select(`
      id, motorista, inicio, fim, status, motivo_recusa,
      veiculo:veiculos!reservas_veiculo_id_fkey(modelo, placa),
      destinos:reserva_destinos(destino, ordem),
      checklist:checklists!checklists_reserva_id_fkey(id, km_saida)
    `)
    .or(`solicitante_id.eq.${user.id},motorista_id.eq.${user.id}`)
    .order("inicio", { ascending: false });

  const reservas = (reservasRaw ?? []) as unknown as MinhaReserva[];
  const agora = new Date().toISOString();

  const ativas = reservas.filter(
    (r) => r.status === "aprovada" && r.fim >= agora
  );
  const pendentes = reservas.filter((r) => r.status === "pendente");
  const historico = reservas.filter(
    (r) =>
      r.status === "concluida" ||
      r.status === "recusada" ||
      (r.status === "aprovada" && r.fim < agora)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Minhas Reservas</h1>
            <p className="text-sm text-gray-500">
              {ativas.length > 0
                ? `${ativas.length} ativa${ativas.length !== 1 ? "s" : ""}${
                    pendentes.length > 0
                      ? ` · ${pendentes.length} pendente${pendentes.length !== 1 ? "s" : ""}`
                      : ""
                  }`
                : pendentes.length > 0
                ? `${pendentes.length} aguardando aprovação`
                : "Nenhuma reserva ativa"}
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/reservas/nova">
              <Plus className="w-4 h-4" />
              Solicitar
            </Link>
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6 pb-28">
        {/* Estado vazio */}
        {reservas.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 stroke-1" />
            <p className="font-medium text-gray-500">Nenhuma reserva ainda</p>
            <p className="text-sm mt-1">
              Solicite o uso de um veículo da frota
            </p>
            <Button asChild className="mt-6">
              <Link href="/reservas/nova">Solicitar reserva</Link>
            </Button>
          </div>
        )}

        {/* Ativas */}
        {ativas.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-blue-700 uppercase tracking-wider px-1">
              Ativas ({ativas.length})
            </h2>
            {ativas.map((r) => {
              const saidaFeita =
                !!r.checklist && r.checklist.km_saida !== null;
              const destinos = [...r.destinos].sort(
                (a, b) => a.ordem - b.ordem
              );
              return (
                <Link
                  key={r.id}
                  href={
                    !saidaFeita ? `/checklist/${r.id}` : `/reservas/${r.id}`
                  }
                  className="block bg-white rounded-xl border border-blue-200 p-4 hover:shadow-sm transition-all active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-semibold text-gray-900 truncate">
                      {r.motorista}
                    </p>
                    {!saidaFeita ? (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                        Vistoria
                      </span>
                    ) : (
                      <Badge variant="default" className="shrink-0">
                        Aprovada
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>
                        {formatBRT(r.inicio, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                        {" → "}
                        {formatBRT(r.fim, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    {r.veiculo && (
                      <div className="flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>
                          {r.veiculo.modelo}{" "}
                          <span className="font-mono text-xs">
                            {r.veiculo.placa}
                          </span>
                        </span>
                      </div>
                    )}
                    {destinos[0] && (
                      <p className="text-xs text-gray-500 truncate">
                        📍 {destinos[0].destino}
                        {destinos.length > 1
                          ? ` +${destinos.length - 1}`
                          : ""}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </section>
        )}

        {/* Pendentes */}
        {pendentes.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-yellow-700 uppercase tracking-wider px-1">
              Aguardando aprovação ({pendentes.length})
            </h2>
            {pendentes.map((r) => {
              const destinos = [...r.destinos].sort(
                (a, b) => a.ordem - b.ordem
              );
              return (
                <Link
                  key={r.id}
                  href={`/reservas/${r.id}`}
                  className="block bg-white rounded-xl border border-yellow-200 p-4 hover:shadow-sm transition-all active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-semibold text-gray-900 truncate">
                      {r.motorista}
                    </p>
                    <Badge variant="warning" className="shrink-0">
                      Pendente
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>
                        {formatBRT(r.inicio, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                        {" → "}
                        {formatBRT(r.fim, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    {destinos[0] && (
                      <p className="text-xs text-gray-500 truncate">
                        📍 {destinos[0].destino}
                        {destinos.length > 1
                          ? ` +${destinos.length - 1}`
                          : ""}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </section>
        )}

        {/* Histórico */}
        {historico.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
              Histórico ({historico.length})
            </h2>
            {historico.slice(0, 20).map((r) => {
              const badge = STATUS_BADGE[r.status];
              const destinos = [...r.destinos].sort(
                (a, b) => a.ordem - b.ordem
              );
              return (
                <Link
                  key={r.id}
                  href={`/reservas/${r.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-semibold text-gray-900 truncate">
                      {r.motorista}
                    </p>
                    <Badge variant={badge.variant} className="shrink-0">
                      {badge.label}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>
                        {formatBRT(r.inicio, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                        {" → "}
                        {formatBRT(r.fim, {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    {r.veiculo && (
                      <div className="flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>
                          {r.veiculo.modelo}{" "}
                          <span className="font-mono text-xs">
                            {r.veiculo.placa}
                          </span>
                        </span>
                      </div>
                    )}
                    {destinos[0] && (
                      <p className="text-xs text-gray-500 truncate">
                        📍 {destinos[0].destino}
                        {destinos.length > 1
                          ? ` +${destinos.length - 1}`
                          : ""}
                      </p>
                    )}
                    {r.status === "recusada" && r.motivo_recusa && (
                      <div className="flex items-start gap-1.5 mt-1.5 bg-red-50 rounded-md px-2.5 py-1.5">
                        <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-red-600 leading-snug">{r.motivo_recusa}</p>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
