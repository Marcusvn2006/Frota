import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Ticket, Car, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateOnlyBR, formatBRL } from "@/lib/utils";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";

type MinhaMulta = {
  id: string;
  data_infracao: string;
  hora_infracao: string;
  valor: number;
  descricao: string;
  prazo_pagamento: string | null;
  resolvida: boolean;
  veiculo: { modelo: string; placa: string } | null;
};

export default async function MinhasMultasPage() {
  const usuarioAtual = await getUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  const supabase = await createClient();

  const { data: multasRaw } = await supabase
    .from("multas")
    .select(`
      id, data_infracao, hora_infracao, valor, descricao, prazo_pagamento, resolvida,
      veiculo:veiculos!multas_veiculo_id_fkey(modelo, placa)
    `)
    .order("data_infracao", { ascending: false });

  const multas = (multasRaw ?? []) as unknown as MinhaMulta[];
  const pendentes = multas.filter((m) => !m.resolvida);
  const resolvidas = multas.filter((m) => m.resolvida);

  function Card({ m }: { m: MinhaMulta }) {
    return (
      <div
        key={m.id}
        className={`bg-white rounded-xl border p-4 ${
          m.resolvida ? "border-gray-200 opacity-70" : "border-yellow-200"
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

          {m.resolvida ? (
            <Badge variant="success" className="flex items-center gap-1 shrink-0">
              <CheckCircle className="w-3 h-3" />
              Resolvida
            </Badge>
          ) : (
            <Badge className="bg-yellow-100 text-yellow-800 border-none shrink-0">
              Pendente
            </Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Minhas multas</h1>
          <p className="text-sm text-gray-500">
            {pendentes.length > 0
              ? `${pendentes.length} pendente${pendentes.length !== 1 ? "s" : ""}`
              : "Nenhuma multa pendente"}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6 pb-28">
        {multas.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <Ticket className="w-12 h-12 mx-auto mb-3 stroke-1" />
            <p className="font-medium text-gray-500">Nenhuma multa registrada</p>
          </div>
        )}

        {pendentes.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-yellow-700 uppercase tracking-wider px-1">
              Pendentes ({pendentes.length})
            </h2>
            {pendentes.map((m) => (
              <Card key={m.id} m={m} />
            ))}
          </section>
        )}

        {resolvidas.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
              Resolvidas ({resolvidas.length})
            </h2>
            {resolvidas.map((m) => (
              <Card key={m.id} m={m} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
