import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PerfilForm } from "./PerfilForm";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Carrega os dados atuais de CNH para pré-preencher o formulário — sem isso,
  // salvar apenas a validade zerava número e categoria já cadastrados.
  const { data: motorista } = await supabase
    .from("motoristas")
    .select("cnh_numero, cnh_categoria, cnh_validade")
    .eq("usuario_id", user.id)
    .single();

  return (
    <PerfilForm
      inicial={{
        cnh_numero: motorista?.cnh_numero ?? "",
        cnh_categoria: motorista?.cnh_categoria ?? "",
        cnh_validade: motorista?.cnh_validade ?? "",
      }}
    />
  );
}
