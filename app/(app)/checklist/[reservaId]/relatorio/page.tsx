import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { formatBRT, formatBRL } from "@/lib/utils";
import { PrintButton } from "./PrintButton";
import type { ChecklistItem } from "@/lib/types/database.types";

interface Props {
  params: Promise<{ reservaId: string }>;
}

type ReservaDetalhe = {
  id: string;
  motorista: string;
  inicio: string;
  fim: string;
  solicitante: { nome: string } | null;
  veiculo: { id: string; modelo: string; placa: string; cor: string } | null;
  destinos: { destino: string; ordem: number }[];
};

function Linha({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-1 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 w-40 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium">{value}</span>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b-2 border-gray-800 pb-1">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export default async function RelatorioPage({ params }: Props) {
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

  if (perfil?.papel !== "gestor") redirect("/home");

  // Fetch reserva with full details
  const { data: reservaRaw } = await supabase
    .from("reservas")
    .select(`
      id, motorista, inicio, fim,
      solicitante:usuarios!reservas_solicitante_id_fkey(nome),
      veiculo:veiculos!reservas_veiculo_id_fkey(id, modelo, placa, cor),
      destinos:reserva_destinos(destino, ordem)
    `)
    .eq("id", reservaId)
    .single();

  if (!reservaRaw) notFound();
  const reserva = reservaRaw as unknown as ReservaDetalhe;

  // Fetch checklist
  const { data: checklist } = await supabase
    .from("checklists")
    .select("*")
    .eq("reserva_id", reservaId)
    .single();

  if (!checklist || checklist.status !== "concluido") {
    redirect(`/checklist/${reservaId}`);
  }

  // Fetch items
  const { data: itensRaw } = await supabase
    .from("checklist_itens")
    .select("*")
    .eq("checklist_id", checklist.id)
    .order("id");
  const itens = (itensRaw ?? []) as ChecklistItem[];

  const destinosOrdenados = [...reserva.destinos].sort((a, b) => a.ordem - b.ordem);
  const reprovados = itens.filter((i) => !i.ok);
  const aprovados = itens.filter((i) => i.ok);

  const kmPercorridos =
    checklist.km_chegada != null && checklist.km_saida != null
      ? checklist.km_chegada - checklist.km_saida
      : null;

  const fmtKm = (n: number | null | undefined) =>
    n != null
      ? n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : "—";

  const geradoEm = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <>
      {/* Print styles injetados via style tag */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-page { padding: 24px !important; max-width: 100% !important; }
        }
        @page { margin: 1.5cm; }
      `}</style>

      {/* Barra de ações — oculta na impressão */}
      <div className="no-print bg-white border-b border-gray-200 px-4 pt-10 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Link
            href={`/checklist/${reservaId}`}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* Conteúdo do relatório */}
      <div className="print-page max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6 bg-white min-h-screen">
        {/* Cabeçalho do relatório */}
        <header className="text-center border-b-2 border-gray-800 pb-4 space-y-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            RELATÓRIO DE VISTORIA
          </h1>
          <p className="text-sm text-gray-500">Gerado em {geradoEm} · Uso interno</p>
        </header>

        {/* Veículo */}
        <Secao titulo="Veículo">
          {reserva.veiculo ? (
            <div className="space-y-0.5">
              <Linha label="Modelo" value={reserva.veiculo.modelo} />
              <Linha label="Cor" value={reserva.veiculo.cor} />
              <Linha
                label="Placa"
                value={
                  <span className="font-mono font-bold">{reserva.veiculo.placa}</span>
                }
              />
            </div>
          ) : (
            <p className="text-sm text-gray-400">Veículo não registrado</p>
          )}
        </Secao>

        {/* Reserva */}
        <Secao titulo="Reserva">
          <div className="space-y-0.5">
            <Linha label="Motorista" value={reserva.motorista} />
            {reserva.solicitante?.nome &&
              reserva.solicitante.nome !== reserva.motorista && (
                <Linha label="Solicitante" value={reserva.solicitante.nome} />
              )}
            <Linha
              label="Saída programada"
              value={formatBRT(reserva.inicio, { dateStyle: "short", timeStyle: "short" })}
            />
            <Linha
              label="Chegada programada"
              value={formatBRT(reserva.fim, { dateStyle: "short", timeStyle: "short" })}
            />
            {destinosOrdenados.length > 0 && (
              <Linha
                label="Destinos"
                value={
                  <span className="whitespace-pre-line">
                    {destinosOrdenados
                      .map((d, i) => `${i + 1}. ${d.destino}`)
                      .join("\n")}
                  </span>
                }
              />
            )}
          </div>
        </Secao>

        {/* Vistoria de saída */}
        <Secao titulo="Vistoria de Saída">
          <div className="space-y-0.5">
            <Linha label="Km de saída" value={`${fmtKm(checklist.km_saida)} km`} />
            <Linha label="Hora de saída" value={checklist.hora_saida ?? "—"} />
          </div>
        </Secao>

        {/* Condições do veículo */}
        <Secao titulo="Condições do Veículo">
          <div className="space-y-1">
            {/* Itens OK */}
            {aprovados.length > 0 && (
              <div>
                <p className="text-xs text-green-700 font-semibold mb-1">
                  OK ({aprovados.length} de {itens.length})
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  {aprovados.map((item) => (
                    <div key={item.id} className="flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      <span className="text-sm text-gray-700">{item.item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Itens com problema */}
            {reprovados.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-red-700 font-semibold mb-1">
                  NÃO OK ({reprovados.length})
                </p>
                <div className="space-y-1.5">
                  {reprovados.map((item) => (
                    <div
                      key={item.id}
                      className="bg-red-50 border border-red-100 rounded p-2"
                    >
                      <div className="flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="text-sm font-medium text-red-900">
                          {item.item}
                        </span>
                      </div>
                      {item.obs && (
                        <p className="text-xs text-red-700 mt-0.5 ml-5">
                          {item.obs}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reprovados.length === 0 && (
              <p className="text-sm text-green-700 font-medium">
                Todos os {itens.length} itens estavam OK na saída.
              </p>
            )}
          </div>
        </Secao>

        {/* Vistoria de chegada */}
        <Secao titulo="Vistoria de Chegada">
          <div className="space-y-0.5">
            <Linha
              label="Km de chegada"
              value={`${fmtKm(checklist.km_chegada)} km`}
            />
            <Linha label="Hora de chegada" value={checklist.hora_chegada ?? "—"} />
            {kmPercorridos != null && (
              <Linha
                label="Km percorridos"
                value={
                  <span className="font-bold text-blue-700">
                    {fmtKm(kmPercorridos)} km
                  </span>
                }
              />
            )}
          </div>
        </Secao>

        {/* Abastecimento */}
        <Secao titulo="Abastecimento">
          {checklist.abasteceu ? (
            <div className="space-y-0.5">
              <Linha label="Abasteceu?" value="Sim" />
              {checklist.litros != null && (
                <Linha
                  label="Litros"
                  value={`${checklist.litros.toLocaleString("pt-BR")} L`}
                />
              )}
              {checklist.valor != null && (
                <Linha label="Valor" value={formatBRL(checklist.valor)} />
              )}
              <Linha
                label="Cupom fiscal"
                value={
                  <span className="text-gray-500 italic">
                    Disponível na galeria
                  </span>
                }
              />
            </div>
          ) : (
            <p className="text-sm text-gray-600">Não abasteceu.</p>
          )}
        </Secao>

        {/* Fotos */}
        <Secao titulo="Fotos">
          <p className="text-sm text-gray-600">
            Fotos do painel (saída e chegada) disponíveis na galeria de fotos do
            sistema.
          </p>
        </Secao>

        {/* Rodapé */}
        <footer className="border-t-2 border-gray-800 pt-4 text-center">
          <p className="text-xs text-gray-400">
            Documento gerado automaticamente pelo sistema ReservarCarro · Uso interno
          </p>
        </footer>
      </div>
    </>
  );
}
