import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ImageIcon, Clock, Info } from "lucide-react";
import { LimparStorage } from "./LimparStorage";

const TIPO_LABEL: Record<string, string> = {
  painel_saida: "Painel de saída",
  painel_chegada: "Painel de chegada",
  cupom: "Cupom de combustível",
};

export default async function StoragePage() {
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
  if (perfil?.papel !== "gestor") redirect("/home");

  const admin = createAdminClient();
  const agora = new Date();

  const corte6m = new Date(agora);
  corte6m.setMonth(corte6m.getMonth() - 6);

  const corte3m = new Date(agora);
  corte3m.setMonth(corte3m.getMonth() - 3);

  // Busca todas as fotos com metadados suficientes para os cards
  const { data: todasFotos } = await admin
    .from("fotos")
    .select("id, tipo, tirada_em");

  const todas = todasFotos ?? [];

  const antigas = todas.filter((f) => f.tirada_em < corte6m.toISOString());
  const medias = todas.filter(
    (f) => f.tirada_em >= corte6m.toISOString() && f.tirada_em < corte3m.toISOString()
  );
  const recentes = todas.filter((f) => f.tirada_em >= corte3m.toISOString());

  // Breakdown por tipo das fotos antigas
  const porTipo: Record<string, number> = {};
  for (const f of antigas) {
    porTipo[f.tipo] = (porTipo[f.tipo] ?? 0) + 1;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/home" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Armazenamento</h1>
            <p className="text-sm text-gray-500">Gerenciar fotos de vistoria</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 pb-28 space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{todas.length}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">Total</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{recentes.length + medias.length}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">Mantidas</p>
          </div>
          <div className={`rounded-xl border p-3 text-center ${antigas.length > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
            <p className={`text-2xl font-bold ${antigas.length > 0 ? "text-red-600" : "text-gray-900"}`}>
              {antigas.length}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 leading-tight">Antigas</p>
          </div>
        </div>

        {/* Distribuição por período */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-700">Distribuição por período</h2>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <p className="text-sm text-gray-700">Últimos 3 meses</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{recentes.length} fotos</p>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                <p className="text-sm text-gray-700">3 a 6 meses</p>
              </div>
              <p className="text-sm font-semibold text-gray-900">{medias.length} fotos</p>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                <p className="text-sm text-gray-700">Mais de 6 meses</p>
              </div>
              <p className="text-sm font-semibold text-red-700">{antigas.length} fotos</p>
            </div>
          </div>
        </div>

        {/* Detalhes do que será excluído */}
        {antigas.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <ImageIcon className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700">
                Fotos a excluir por tipo
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {Object.entries(porTipo).map(([tipo, count]) => (
                <div key={tipo} className="flex items-center justify-between px-4 py-3">
                  <p className="text-sm text-gray-700">
                    {TIPO_LABEL[tipo] ?? tipo}
                  </p>
                  <p className="text-sm font-semibold text-red-600">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info sobre política de retenção */}
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-700">
            Fotos com mais de 6 meses podem ser excluídas com segurança. Os
            dados da vistoria (km, itens verificados) permanecem no histórico.
          </p>
        </div>

        {/* Ação */}
        <LimparStorage countAntigas={antigas.length} />
      </div>
    </div>
  );
}
