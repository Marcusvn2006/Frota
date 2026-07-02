import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MotoristaEditForm, ExcluirSection } from "./EditarMotoristaClient";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarMotoristaPage({ params }: Props) {
  const { id } = await params;

  const usuarioAtual = await getUsuarioAtual();
  if (!usuarioAtual) redirect("/login");
  if (usuarioAtual.perfil.papel !== "gestor") redirect("/home");

  const supabase = await createClient();

  const { data: motorista } = await supabase
    .from("motoristas")
    .select("*")
    .eq("id", id)
    .single();

  if (!motorista) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 pt-10 pb-4">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link href="/gestor/motoristas" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">{motorista.nome}</h1>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        <MotoristaEditForm motorista={motorista} />
        {!motorista.usuario_id && <ExcluirSection id={motorista.id} />}
      </div>
    </div>
  );
}
