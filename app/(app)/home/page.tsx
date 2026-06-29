import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Car,
  Wrench,
  AlertTriangle,
  Calendar,
  ArrowRight,
  ClipboardCheck,
  Plus,
  HardDrive,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LogoutButton } from "@/components/LogoutButton";
import { formatBRT } from "@/lib/utils";
import type { StatusReserva } from "@/lib/types/database.types";

type ReservaProxima = {
  id: string;
  motorista: string;
  inicio: string;
  fim: string;
  status: StatusReserva;
  veiculo: { modelo: string; placa: string } | null;
  checklist: { id: string; km_saida: number | null } | null;
};

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const agora = new Date();
  const limite48h = new Date(agora.getTime() - 48 * 60 * 60 * 1000).toISOString();

  const [
    { data: perfil },
    { data: veiculos },
    { data: minhasReservasRaw },
  ] = await Promise.all([
    supabase.from("usuarios").select("*").eq("id", user.id).single(),
    supabase.from("veiculos").select("*"),
    supabase
      .from("reservas")
      .select(`
        id, motorista, inicio, fim, status,
        veiculo:veiculos!reservas_veiculo_id_fkey(modelo, placa),
        checklist:checklists!checklists_reserva_id_fkey(id, km_saida)
      `)
      .eq("solicitante_id", user.id)
      .eq("status", "aprovada")
      .gte("fim", limite48h)
      .order("inicio")
      .limit(5),
  ]);

  const isGestor = perfil?.papel === "gestor";
  const emManutencao = veiculos?.filter((v) => v.em_manutencao).length ?? 0;
  const comAtencao =
    veiculos?.filter((v) => v.precisa_atencao && !v.em_manutencao).length ?? 0;
  const disponiveis = (veiculos?.length ?? 0) - emManutencao;
  const firstName = perfil?.nome?.split(" ")[0] ?? "Usuário";

  const minhasReservas = (minhasReservasRaw ?? []) as unknown as ReservaProxima[];

  // For gestor: count pending approvals
  let pendentesCount = 0;
  if (isGestor) {
    const { count } = await supabase
      .from("reservas")
      .select("id", { count: "exact", head: true })
      .eq("status", "pendente");
    pendentesCount = count ?? 0;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 text-white px-4 pt-14 pb-8">
        <div className="max-w-2xl mx-auto flex items-start justify-between">
          <div>
            <p className="text-blue-200 text-sm">Bem-vindo,</p>
            <h1 className="text-2xl font-bold mt-0.5">{firstName}</h1>
            {isGestor && (
              <Badge className="mt-2 bg-blue-600 text-blue-100 border-none">
                Gestor
              </Badge>
            )}
          </div>
          <LogoutButton />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-4 pb-28 space-y-4">
        {/* Resumo da frota */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{disponiveis}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">
              Disponíveis
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{emManutencao}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">
              Manutenção
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{comAtencao}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">
              Atenção
            </p>
          </div>
        </div>

        {/* Alertas */}
        {isGestor && pendentesCount > 0 && (
          <Link
            href="/reservas"
            className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3 hover:bg-yellow-100 transition-colors"
          >
            <Calendar className="w-5 h-5 text-yellow-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-yellow-800">
                {pendentesCount} reserva
                {pendentesCount > 1 ? "s" : ""} aguardando aprovação
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-yellow-600 shrink-0" />
          </Link>
        )}

        {emManutencao > 0 && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-3">
            <Wrench className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm font-medium text-red-800">
              {emManutencao} veículo{emManutencao > 1 ? "s" : ""} em manutenção
            </p>
          </div>
        )}

        {comAtencao > 0 && (
          <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
            <p className="text-sm font-medium text-yellow-800">
              {comAtencao} veículo{comAtencao > 1 ? "s" : ""} precisa
              {comAtencao > 1 ? "m" : ""} de atenção
            </p>
          </div>
        )}

        {/* Próximas reservas do usuário */}
        {minhasReservas.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">
                Suas reservas
              </h2>
              <Link
                href="/reservas"
                className="text-xs text-blue-600 font-medium hover:underline"
              >
                Ver todas
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {minhasReservas.map((r) => {
                const temChecklist = !!r.checklist;
                const saidaFeita =
                  temChecklist && r.checklist!.km_saida !== null;
                const iniciouHoje =
                  new Date(r.inicio).toDateString() ===
                  new Date().toDateString();

                return (
                  <Link
                    key={r.id}
                    href={
                      !saidaFeita
                        ? `/checklist/${r.id}`
                        : `/reservas/${r.id}`
                    }
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        !saidaFeita
                          ? "bg-blue-100"
                          : "bg-gray-100"
                      }`}
                    >
                      {!saidaFeita ? (
                        <ClipboardCheck className="w-4 h-4 text-blue-700" />
                      ) : (
                        <Calendar className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {r.motorista}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatBRT(r.inicio, {
                          dateStyle: iniciouHoje ? undefined : "short",
                          timeStyle: "short",
                        })}
                        {iniciouHoje && (
                          <span className="ml-1 text-blue-600 font-medium">
                            hoje
                          </span>
                        )}
                      </p>
                      {r.veiculo && (
                        <p className="text-xs text-gray-400">
                          {r.veiculo.modelo}{" "}
                          <span className="font-mono">{r.veiculo.placa}</span>
                        </p>
                      )}
                    </div>
                    {!saidaFeita && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                        Vistoria
                      </span>
                    )}
                    <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Acesso rápido */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 border-b border-gray-100">
            Acesso rápido
          </h2>

          <Link
            href="/reservas/nova"
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                Solicitar reserva
              </p>
              <p className="text-xs text-gray-500">Agendar uso de veículo</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </Link>

          <Link
            href="/reservas"
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Reservas</p>
              <p className="text-xs text-gray-500">Calendário e histórico</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400" />
          </Link>

          {!isGestor && (
            <Link
              href="/veiculos/disponibilidade"
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                <Car className="w-4 h-4 text-green-700" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Disponibilidade</p>
                <p className="text-xs text-gray-500">Ver veículos livres por período</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>
          )}

          {isGestor && (
            <Link
              href="/gestor/storage"
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                <HardDrive className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Armazenamento</p>
                <p className="text-xs text-gray-500">Limpar fotos antigas</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>
          )}

          {isGestor ? (
            <Link
              href="/gestor/veiculos"
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                <Car className="w-4 h-4 text-purple-700" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Gerenciar frota
                </p>
                <p className="text-xs text-gray-500">Cadastros e manutenção</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>
          ) : (
            <Link
              href="/manutencao"
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                <Car className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Frota</p>
                <p className="text-xs text-gray-500">Situação dos veículos</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
