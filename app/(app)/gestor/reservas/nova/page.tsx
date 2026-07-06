import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GestorNovaReservaForm } from "./GestorNovaReservaForm";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";

export default async function GestorNovaReservaPage() {
  const usuarioAtual = await getUsuarioAtual();
  if (!usuarioAtual) redirect("/login");
  if (usuarioAtual.perfil.papel !== "gestor") redirect("/home");

  const supabase = await createClient();

  const [{ data: veiculos }, { data: funcionarios }] = await Promise.all([
    supabase.from("veiculos").select("*").eq("em_manutencao", false).order("modelo"),
    supabase.from("usuarios").select("id, nome").eq("papel", "funcionario").order("nome"),
  ]);

  return (
    <GestorNovaReservaForm
      nomeInicial={usuarioAtual.perfil.nome ?? ""}
      veiculos={veiculos ?? []}
      funcionarios={funcionarios ?? []}
    />
  );
}
