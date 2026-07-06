import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Car, Fuel, Users, TrendingUp, BarChart2, Ticket, DollarSign } from "lucide-react";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";

// ─── Período ─────────────────────────────────────────────────────────────────

const PERIODOS = {
  "30d": 30,
  "90d": 90,
  "180d": 180,
  "365d": 365,
  all: null,
} as const;

type Periodo = keyof typeof PERIODOS;

const PERIODO_LABELS: Record<Periodo, string> = {
  "30d": "30 dias",
  "90d": "3 meses",
  "180d": "6 meses",
  "365d": "1 ano",
  all: "Tudo",
};

// ─── Helpers de formatação ────────────────────────────────────────────────────

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtKm(n: number) {
  return n.toLocaleString("pt-BR") + " km";
}

function fmtMes(ym: string) {
  const [year, month] = ym.split("-");
  const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${meses[parseInt(month) - 1]}/${year.slice(2)}`;
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

type ChRow = {
  km_saida: number | null;
  km_chegada: number | null;
  abasteceu: boolean;
  litros: number | null;
  valor: number | null;
  reserva: {
    motorista: string;
    inicio: string;
    veiculo: { id: string; modelo: string; placa: string; cor: string } | null;
  } | null;
};

type ResRow = { motorista: string; inicio: string };

type MultaRow = {
  valor: number;
  data_infracao: string;
  motorista: { nome: string } | null;
  veiculo: { id: string; modelo: string; placa: string; cor: string } | null;
};

type ManutencaoRow = {
  custo: number | null;
  data_fim: string | null;
  veiculo: { id: string; modelo: string; placa: string; cor: string } | null;
};

// ─── Page ────────────────────────────────────────────────────────────────────

interface Props {
  searchParams: Promise<{ periodo?: string }>;
}

export default async function RelatoriosPage({ searchParams }: Props) {
  const { periodo: periodoParam } = await searchParams;
  const periodo: Periodo =
    periodoParam && periodoParam in PERIODOS ? (periodoParam as Periodo) : "180d";

  const usuarioAtual = await getUsuarioAtual();
  if (!usuarioAtual) redirect("/login");
  if (usuarioAtual.perfil.papel !== "gestor") redirect("/home");

  // Client autenticado: o RLS já restringe tudo à empresa do gestor.
  const supabase = await createClient();
  const dias = PERIODOS[periodo];
  const dataInicio = dias
    ? new Date(Date.now() - dias * 86400000).toISOString()
    : null;

  const [{ data: rawChecklists }, { data: rawReservas }, { data: rawMultas }, { data: rawManutencoes }] =
    await Promise.all([
      supabase
        .from("checklists")
        .select(`
          km_saida, km_chegada, abasteceu, litros, valor,
          reserva:reservas!checklists_reserva_id_fkey(
            motorista, inicio,
            veiculo:veiculos!reservas_veiculo_id_fkey(id, modelo, placa, cor)
          )
        `)
        .eq("status", "concluido"),
      supabase
        .from("reservas")
        .select("motorista, inicio")
        .in("status", ["aprovada", "concluida"]),
      supabase
        .from("multas")
        .select(`
          valor, data_infracao,
          motorista:motoristas!multas_motorista_id_fkey(nome),
          veiculo:veiculos!multas_veiculo_id_fkey(id, modelo, placa, cor)
        `),
      supabase
        .from("manutencoes")
        .select(`
          custo, data_fim,
          veiculo:veiculos!manutencoes_veiculo_id_fkey(id, modelo, placa, cor)
        `)
        .not("data_fim", "is", null),
    ]);

  const checklists = ((rawChecklists ?? []) as unknown as ChRow[]).filter(
    (c) => !dataInicio || (c.reserva?.inicio ?? "") >= dataInicio
  );
  const reservas = ((rawReservas ?? []) as unknown as ResRow[]).filter(
    (r) => !dataInicio || r.inicio >= dataInicio
  );
  const dataInicioSoData = dataInicio ? dataInicio.slice(0, 10) : null;
  const multas = ((rawMultas ?? []) as unknown as MultaRow[]).filter(
    (m) => !dataInicioSoData || m.data_infracao >= dataInicioSoData
  );
  const manutencoes = ((rawManutencoes ?? []) as unknown as ManutencaoRow[]).filter(
    (m) => !dataInicio || (m.data_fim ?? "") >= dataInicio
  );

  // ── KM por veículo ──────────────────────────────────────────────────────────
  const kmMap = new Map<
    string,
    { modelo: string; placa: string; cor: string; km: number; viagens: number }
  >();
  for (const c of checklists) {
    const v = c.reserva?.veiculo;
    if (!v || c.km_saida === null || c.km_chegada === null) continue;
    const km = c.km_chegada - c.km_saida;
    if (km <= 0) continue;
    const e = kmMap.get(v.id);
    if (e) { e.km += km; e.viagens++; }
    else kmMap.set(v.id, { modelo: v.modelo, placa: v.placa, cor: v.cor, km, viagens: 1 });
  }
  const kmVeiculos = [...kmMap.values()].sort((a, b) => b.km - a.km);
  const maxKm = Math.max(...kmVeiculos.map((v) => v.km), 1);

  // ── Combustível total ───────────────────────────────────────────────────────
  let totalLitros = 0;
  let totalCusto = 0;
  let totalAbast = 0;
  for (const c of checklists) {
    if (!c.abasteceu) continue;
    totalLitros += c.litros ?? 0;
    totalCusto += c.valor ?? 0;
    totalAbast++;
  }

  // ── Motoristas mais ativos ───────────────────────────────────────────────────
  const motMap = new Map<string, { viagens: number; km: number }>();
  for (const r of reservas) {
    const e = motMap.get(r.motorista);
    if (e) e.viagens++;
    else motMap.set(r.motorista, { viagens: 1, km: 0 });
  }
  for (const c of checklists) {
    const nome = c.reserva?.motorista;
    if (!nome || c.km_saida === null || c.km_chegada === null) continue;
    const km = c.km_chegada - c.km_saida;
    if (km <= 0) continue;
    const e = motMap.get(nome);
    if (e) e.km += km;
  }
  const motoristas = [...motMap.entries()]
    .map(([nome, s]) => ({ nome, ...s }))
    .sort((a, b) => b.viagens - a.viagens)
    .slice(0, 8);
  const maxViagens = Math.max(...motoristas.map((m) => m.viagens), 1);

  // ── Custo de combustível por mês ─────────────────────────────────────────────
  const mesMap = new Map<string, { valor: number; litros: number }>();
  for (const c of checklists) {
    if (!c.abasteceu) continue;
    const inicio = c.reserva?.inicio;
    if (!inicio) continue;
    const mes = inicio.slice(0, 7);
    const e = mesMap.get(mes);
    if (e) { e.valor += c.valor ?? 0; e.litros += c.litros ?? 0; }
    else mesMap.set(mes, { valor: c.valor ?? 0, litros: c.litros ?? 0 });
  }
  const mesList = [...mesMap.entries()]
    .map(([mes, s]) => ({ mes, ...s }))
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .slice(-6);
  const maxMesValor = Math.max(...mesList.map((m) => m.valor), 1);

  // ── Multas: gasto total e por motorista ──────────────────────────────────────
  const multasMap = new Map<string, { valor: number; count: number }>();
  let totalMultasValor = 0;
  for (const m of multas) {
    const nome = m.motorista?.nome ?? "Sem motorista atribuído";
    const e = multasMap.get(nome);
    if (e) { e.valor += m.valor; e.count++; }
    else multasMap.set(nome, { valor: m.valor, count: 1 });
    totalMultasValor += m.valor;
  }
  const multasPorMotorista = [...multasMap.entries()]
    .map(([nome, s]) => ({ nome, ...s }))
    .sort((a, b) => b.valor - a.valor);
  const maxMultaValor = Math.max(...multasPorMotorista.map((m) => m.valor), 1);

  // ── Custo total por veículo (combustível + multas + manutenção) ──────────────
  type CustoVeiculo = {
    modelo: string;
    placa: string;
    cor: string;
    combustivel: number;
    multas: number;
    manutencao: number;
  };
  const custoMap = new Map<string, CustoVeiculo>();
  function custoDoVeiculo(v: { id: string; modelo: string; placa: string; cor: string }): CustoVeiculo {
    let e = custoMap.get(v.id);
    if (!e) {
      e = { modelo: v.modelo, placa: v.placa, cor: v.cor, combustivel: 0, multas: 0, manutencao: 0 };
      custoMap.set(v.id, e);
    }
    return e;
  }
  for (const c of checklists) {
    if (!c.abasteceu || !c.reserva?.veiculo) continue;
    custoDoVeiculo(c.reserva.veiculo).combustivel += c.valor ?? 0;
  }
  for (const m of multas) {
    if (!m.veiculo) continue;
    custoDoVeiculo(m.veiculo).multas += m.valor;
  }
  for (const m of manutencoes) {
    if (!m.veiculo || m.custo === null) continue;
    custoDoVeiculo(m.veiculo).manutencao += m.custo;
  }
  const custoPorVeiculo = [...custoMap.values()]
    .map((v) => ({ ...v, total: v.combustivel + v.multas + v.manutencao }))
    .filter((v) => v.total > 0)
    .sort((a, b) => b.total - a.total);
  const maxCustoTotal = Math.max(...custoPorVeiculo.map((v) => v.total), 1);
  const totalManutencaoValor = manutencoes.reduce((s, m) => s + (m.custo ?? 0), 0);

  const totalKm = kmVeiculos.reduce((s, v) => s + v.km, 0);
  const totalViagens = reservas.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/home" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Relatórios</h1>
            <p className="text-sm text-gray-500">Desempenho da frota</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 pb-28 space-y-4">
        {/* Seletor de período */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none]">
          {(Object.keys(PERIODOS) as Periodo[]).map((p) => (
            <Link
              key={p}
              href={`?periodo=${p}`}
              className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
                periodo === p
                  ? "bg-blue-700 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {PERIODO_LABELS[p]}
            </Link>
          ))}
        </div>

        {totalViagens === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 px-6 text-center">
            <BarChart2 className="w-12 h-12 mx-auto mb-3 text-gray-300 stroke-1" />
            <p className="font-medium text-gray-700">Nenhum dado neste período</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
              Os relatórios são gerados a partir de reservas aprovadas e
              vistorias concluídas. Tente um período maior ou aguarde as
              próximas viagens da frota.
            </p>
          </div>
        ) : (
          <>
        {/* Resumo */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold text-gray-900">{totalViagens}</p>
            <p className="text-xs text-gray-500 mt-0.5">Viagens realizadas</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold text-gray-900">{fmtKm(totalKm)}</p>
            <p className="text-xs text-gray-500 mt-0.5">KM percorridos</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold text-gray-900">{fmtBRL(totalCusto)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Gasto em combustível</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold text-gray-900">
              {totalLitros.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Litros abastecidos</p>
          </div>
        </div>

        {/* Custo total por veículo */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Custo total por veículo</h2>
            {custoPorVeiculo.length > 0 && (
              <span className="ml-auto text-xs font-semibold text-gray-500">
                {fmtBRL(totalCusto + totalMultasValor + totalManutencaoValor)}
              </span>
            )}
          </div>
          {custoPorVeiculo.length === 0 ? (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">
              Nenhum custo registrado no período
            </p>
          ) : (
            <>
              {/* Destaque: maior gasto */}
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Maior gasto no período</p>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {custoPorVeiculo[0].modelo}{" "}
                    <span className="font-mono text-xs font-normal text-gray-500">
                      {custoPorVeiculo[0].placa}
                    </span>
                  </p>
                  <p className="text-sm font-bold text-gray-900 shrink-0">
                    {fmtBRL(custoPorVeiculo[0].total)}
                  </p>
                </div>
              </div>

              {/* Legenda das cores */}
              <div className="flex items-center gap-4 px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Combustível
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-500" /> Multas
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> Manutenção
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {custoPorVeiculo.map((v) => (
                  <div key={v.placa} className="px-4 py-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{v.modelo}</p>
                        <p className="text-xs text-gray-400 font-mono">
                          {v.placa} · {v.cor}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-900 shrink-0 ml-3">
                        {fmtBRL(v.total)}
                      </p>
                    </div>

                    {/* Barra empilhada: comprimento = gasto relativo entre veículos,
                        cores = de onde vem o gasto desse veículo */}
                    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden mb-1.5">
                      <div
                        className="h-full flex"
                        style={{ width: `${(v.total / maxCustoTotal) * 100}%` }}
                      >
                        {v.combustivel > 0 && (
                          <div
                            className="h-full bg-blue-500"
                            style={{ width: `${(v.combustivel / v.total) * 100}%` }}
                          />
                        )}
                        {v.multas > 0 && (
                          <div
                            className="h-full bg-orange-500"
                            style={{ width: `${(v.multas / v.total) * 100}%` }}
                          />
                        )}
                        {v.manutencao > 0 && (
                          <div
                            className="h-full bg-red-500"
                            style={{ width: `${(v.manutencao / v.total) * 100}%` }}
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3 text-xs text-gray-400">
                      {v.combustivel > 0 && <span>Combustível: {fmtBRL(v.combustivel)}</span>}
                      {v.multas > 0 && <span>Multas: {fmtBRL(v.multas)}</span>}
                      {v.manutencao > 0 && <span>Manutenção: {fmtBRL(v.manutencao)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* KM por veículo */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <Car className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">KM por veículo</h2>
          </div>
          {kmVeiculos.length === 0 ? (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">
              Sem vistorias concluídas no período
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {kmVeiculos.map((v) => (
                <div key={v.placa} className="px-4 py-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{v.modelo}</p>
                      <p className="text-xs text-gray-400 font-mono">
                        {v.placa} · {v.cor}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold text-gray-900">{fmtKm(v.km)}</p>
                      <p className="text-xs text-gray-400">
                        {v.viagens} viagem{v.viagens !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${(v.km / maxKm) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Motoristas mais ativos */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <Users className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Motoristas mais ativos</h2>
          </div>
          {motoristas.length === 0 ? (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">
              Sem reservas no período
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {motoristas.map((m, i) => (
                <div key={m.nome} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <span
                        className={`text-xs font-bold w-5 shrink-0 ${
                          i === 0
                            ? "text-yellow-500"
                            : i === 1
                            ? "text-gray-400"
                            : i === 2
                            ? "text-orange-400"
                            : "text-gray-300"
                        }`}
                      >
                        #{i + 1}
                      </span>
                      <p className="text-sm font-medium text-gray-900 truncate">{m.nome}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold text-gray-900">
                        {m.viagens} viagem{m.viagens !== 1 ? "s" : ""}
                      </p>
                      {m.km > 0 && (
                        <p className="text-xs text-gray-400">{fmtKm(m.km)}</p>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-400 h-1.5 rounded-full transition-all"
                      style={{ width: `${(m.viagens / maxViagens) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Combustível por mês */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <Fuel className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Combustível por mês</h2>
          </div>
          {mesList.length === 0 ? (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">
              Nenhum abastecimento registrado no período
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {mesList.map((m) => (
                <div key={m.mes} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-700">{fmtMes(m.mes)}</p>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{fmtBRL(m.valor)}</p>
                      <p className="text-xs text-gray-400">
                        {m.litros.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${(m.valor / maxMesValor) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Multas */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <Ticket className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Multas</h2>
            {multas.length > 0 && (
              <span className="ml-auto text-xs font-semibold text-gray-500">
                {fmtBRL(totalMultasValor)}
              </span>
            )}
          </div>
          {multasPorMotorista.length === 0 ? (
            <p className="px-4 py-8 text-sm text-gray-400 text-center">
              Nenhuma multa registrada no período
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {multasPorMotorista.map((m) => (
                <div key={m.nome} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.nome}</p>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold text-gray-900">{fmtBRL(m.valor)}</p>
                      <p className="text-xs text-gray-400">
                        {m.count} multa{m.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-orange-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${(m.valor / maxMultaValor) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Médias */}
        {totalAbast > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">Médias</h2>
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-100">
              <div className="px-4 py-4 text-center">
                <p className="text-lg font-bold text-gray-900">
                  {totalLitros > 0 ? fmtBRL(totalCusto / totalLitros) : "—"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">por litro</p>
              </div>
              <div className="px-4 py-4 text-center">
                <p className="text-lg font-bold text-gray-900">
                  {fmtBRL(totalCusto / totalAbast)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">por abastecimento</p>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
