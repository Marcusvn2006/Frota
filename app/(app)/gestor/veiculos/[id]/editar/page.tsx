import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VeiculoEditForm, StatusSection, ExcluirSection } from "./EditarVeiculoClient";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarVeiculoPage({ params }: Props) {
  const { id } = await params;

  const usuarioAtual = await getUsuarioAtual();
  if (!usuarioAtual) redirect("/login");
  if (usuarioAtual.perfil.papel !== "gestor") redirect("/home");

  const supabase = await createClient();

  const { data: veiculo } = await supabase
    .from("veiculos")
    .select("*")
    .eq("id", id)
    .single();

  if (!veiculo) notFound();

  // Buscar itens reprovados do último checklist (apenas se precisa_atencao)
  let itensReprovados: { item: string; obs: string | null }[] = [];
  if (veiculo.precisa_atencao) {
    const { data: reservasCom } = await supabase
      .from("reservas")
      .select(`
        veiculo_id, fim,
        checklist:checklists!checklists_reserva_id_fkey(
          itens:checklist_itens(item, ok, obs)
        )
      `)
      .eq("veiculo_id", id)
      .order("fim", { ascending: false })
      .limit(10);

    for (const r of reservasCom ?? []) {
      const c = r.checklist as { itens: { item: string; ok: boolean; obs: string | null }[] } | null;
      if (!c) continue;
      const reprovados = c.itens.filter((i) => !i.ok);
      if (reprovados.length > 0) {
        itensReprovados = reprovados;
        break;
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/gestor/veiculos" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{veiculo.modelo}</h1>
            <p className="text-sm text-gray-500 font-mono">{veiculo.placa}</p>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        <VeiculoEditForm veiculo={veiculo} />
        <StatusSection veiculo={veiculo} itensReprovados={itensReprovados} />
        <ExcluirSection id={veiculo.id} />
      </div>
    </div>
  );
}
