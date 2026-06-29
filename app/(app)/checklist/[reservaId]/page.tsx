import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ClipboardCheck,
  CheckCircle,
  AlertCircle,
  Fuel,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SaidaForm } from "./SaidaForm";
import { ChegadaForm } from "./ChegadaForm";
import { iniciarChecklistAction } from "./actions";
import type { ChecklistItem, Checklist } from "@/lib/types/database.types";

interface Props {
  params: Promise<{ reservaId: string }>;
}

function ProgressStep({
  label,
  done,
  active,
}: {
  label: string;
  done: boolean;
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
          done && "bg-green-600 text-white",
          active && "bg-blue-600 text-white",
          !done && !active && "bg-gray-200 text-gray-500"
        )}
      >
        {done ? "✓" : active ? "●" : "○"}
      </div>
      <span
        className={cn(
          "text-xs font-medium",
          active && "text-blue-700",
          done && "text-green-700",
          !done && !active && "text-gray-400"
        )}
      >
        {label}
      </span>
    </div>
  );
}

function Resumo({
  checklist,
  itens,
}: {
  checklist: Checklist;
  itens: ChecklistItem[];
}) {
  const reprovados = itens.filter((i) => !i.ok);
  const kmPercorridos =
    checklist.km_chegada != null && checklist.km_saida != null
      ? checklist.km_chegada - checklist.km_saida
      : null;

  const fmtKm = (n: number | null | undefined) =>
    n != null
      ? n.toLocaleString("pt-BR", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        })
      : "—";

  const fmtBRL = (n: number | null | undefined) =>
    n != null
      ? new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(n)
      : "—";

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
        <CheckCircle className="w-8 h-8 text-green-600 shrink-0" />
        <div>
          <p className="font-semibold text-green-800">Vistoria concluída!</p>
          <p className="text-sm text-green-600">
            Reserva marcada como concluída.
          </p>
        </div>
      </div>

      {/* Quilometragem */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <h2 className="font-semibold text-gray-900">Quilometragem</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Saída</p>
            <p className="text-sm font-bold text-gray-900">
              {fmtKm(checklist.km_saida)} km
            </p>
            <p className="text-xs text-gray-400">{checklist.hora_saida ?? "—"}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Chegada</p>
            <p className="text-sm font-bold text-gray-900">
              {fmtKm(checklist.km_chegada)} km
            </p>
            <p className="text-xs text-gray-400">
              {checklist.hora_chegada ?? "—"}
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-600">Percorridos</p>
            <p className="text-sm font-bold text-blue-900">
              {fmtKm(kmPercorridos)} km
            </p>
          </div>
        </div>
      </div>

      {/* Itens com problema */}
      {reprovados.length > 0 && (
        <div className="bg-white rounded-xl border border-orange-200 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <h2 className="font-semibold text-gray-900">
              Itens com problema ({reprovados.length})
            </h2>
          </div>
          <div className="space-y-2">
            {reprovados.map((i) => (
              <div
                key={i.id}
                className="bg-orange-50 rounded-lg p-3 border border-orange-100"
              >
                <p className="text-sm font-medium text-orange-900">{i.item}</p>
                {i.obs && (
                  <p className="text-xs text-orange-700 mt-0.5">{i.obs}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {reprovados.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-2 text-green-700">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <p className="text-sm">Todos os itens estavam OK na saída.</p>
        </div>
      )}

      {/* Abastecimento */}
      {checklist.abasteceu && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Fuel className="w-4 h-4 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Abastecimento</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Litros</p>
              <p className="text-sm font-bold text-gray-900">
                {checklist.litros != null
                  ? `${checklist.litros.toLocaleString("pt-BR")} L`
                  : "—"}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Valor</p>
              <p className="text-sm font-bold text-gray-900">
                {fmtBRL(checklist.valor)}
              </p>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-center text-gray-400 pb-4">
        As fotos do painel ficam disponíveis para o gestor na galeria.
      </p>
    </div>
  );
}

export default async function ChecklistPage({ params }: Props) {
  const { reservaId } = await params;
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

  const isGestor = perfil?.papel === "gestor";

  const { data: reservaRaw } = await supabase
    .from("reservas")
    .select(`
      id, motorista, status,
      veiculo:veiculos!reservas_veiculo_id_fkey(id, modelo, placa)
    `)
    .eq("id", reservaId)
    .single();

  if (!reservaRaw) notFound();

  const reserva = reservaRaw as unknown as {
    id: string;
    motorista: string;
    status: string;
    veiculo: { id: string; modelo: string; placa: string } | null;
  };

  // Reservation must be active or completed
  if (reserva.status !== "aprovada" && reserva.status !== "concluida") {
    redirect(`/reservas/${reservaId}`);
  }

  const { data: checklist } = await supabase
    .from("checklists")
    .select("*")
    .eq("reserva_id", reservaId)
    .single();

  let itens: ChecklistItem[] = [];
  if (checklist) {
    const { data: itensData } = await supabase
      .from("checklist_itens")
      .select("*")
      .eq("checklist_id", checklist.id)
      .order("id");
    itens = itensData ?? [];
  }

  // Default time in BRT for time inputs
  const horaAtual = new Date().toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const fase: "iniciar" | "saida" | "chegada" | "concluido" = !checklist
    ? "iniciar"
    : checklist.status === "concluido"
    ? "concluido"
    : checklist.km_saida === null
    ? "saida"
    : "chegada";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link
            href={`/reservas/${reservaId}`}
            className="text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">Vistoria</h1>
            <p className="text-sm text-gray-500 truncate">
              {reserva.motorista}
              {reserva.veiculo
                ? ` · ${reserva.veiculo.modelo} ${reserva.veiculo.placa}`
                : ""}
            </p>
          </div>
          <ClipboardCheck className="w-5 h-5 text-gray-400 shrink-0" />
        </div>

        {/* Progress indicator */}
        {fase !== "iniciar" && (
          <div className="flex items-center gap-2 max-w-2xl mx-auto mt-3">
            <ProgressStep
              label="Saída"
              done={fase === "chegada" || fase === "concluido"}
              active={fase === "saida"}
            />
            <div className="flex-1 h-px bg-gray-200" />
            <ProgressStep
              label="Chegada"
              done={fase === "concluido"}
              active={fase === "chegada"}
            />
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 pb-24">
        {/* Phase: Iniciar */}
        {fase === "iniciar" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <ClipboardCheck className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Iniciar vistoria de saída
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Verifique as condições do veículo antes da saída e registre a
                quilometragem.
              </p>
            </div>
            <form action={iniciarChecklistAction.bind(null, reservaId)}>
              <Button type="submit" className="w-full">
                Iniciar vistoria
              </Button>
            </form>
          </div>
        )}

        {/* Phase: Saída */}
        {fase === "saida" && checklist && (
          <SaidaForm
            checklistId={checklist.id}
            reservaId={reservaId}
            itens={itens}
            horaAtual={horaAtual}
          />
        )}

        {/* Phase: Chegada */}
        {fase === "chegada" && checklist && (
          <ChegadaForm
            checklistId={checklist.id}
            reservaId={reservaId}
            kmSaida={checklist.km_saida ?? 0}
            horaAtual={horaAtual}
          />
        )}

        {/* Phase: Concluído */}
        {fase === "concluido" && checklist && (
          <>
            <Resumo checklist={checklist} itens={itens} />
            {isGestor && (
              <Link
                href={`/checklist/${reservaId}/relatorio`}
                className="flex items-center justify-center gap-2 w-full border border-gray-200 bg-white hover:bg-gray-50 rounded-xl py-3 text-sm font-medium text-gray-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Exportar relatório
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
