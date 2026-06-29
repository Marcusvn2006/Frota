import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GestorNovaReservaForm } from "./GestorNovaReservaForm";

export default async function GestorNovaReservaPage() {
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

  const [{ data: veiculos }, { data: funcionarios }] = await Promise.all([
    supabase.from("veiculos").select("*").eq("em_manutencao", false).order("modelo"),
    supabase.from("usuarios").select("id, nome").eq("papel", "funcionario").order("nome"),
  ]);

  return (
    <GestorNovaReservaForm
      nomeInicial={perfil?.nome ?? ""}
      veiculos={veiculos ?? []}
      funcionarios={funcionarios ?? []}
    />
  );
}
