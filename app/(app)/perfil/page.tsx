import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { hojeBRT, diferencaDias, urgenciaVencimento, descricaoPrazo } from "@/lib/vencimentos";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";
import { PerfilForm, type CnhStatus } from "./PerfilForm";

export default async function PerfilPage() {
  const usuarioAtual = await getUsuarioAtual();
  if (!usuarioAtual) redirect("/login");
  const { user } = usuarioAtual;

  const supabase = await createClient();

  // Carrega os dados atuais de CNH para pré-preencher o formulário — sem isso,
  // salvar apenas a validade zerava número e categoria já cadastrados.
  const { data: motorista } = await supabase
    .from("motoristas")
    .select("cnh_numero, cnh_categoria, cnh_validade")
    .eq("usuario_id", user.id)
    .single();

  // Status da própria CNH (só mostra alerta quando não está "ok").
  let cnhStatus: CnhStatus = null;
  if (motorista?.cnh_validade) {
    const dias = diferencaDias(motorista.cnh_validade, hojeBRT());
    const urgencia = urgenciaVencimento(dias);
    if (urgencia !== "ok") {
      cnhStatus = { urgencia, texto: descricaoPrazo(dias) };
    }
  }

  return (
    <PerfilForm
      inicial={{
        cnh_numero: motorista?.cnh_numero ?? "",
        cnh_categoria: motorista?.cnh_categoria ?? "",
        cnh_validade: motorista?.cnh_validade ?? "",
      }}
      cnhStatus={cnhStatus}
    />
  );
}
