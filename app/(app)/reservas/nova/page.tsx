import { redirect } from "next/navigation";
import { NovaReservaForm } from "./NovaReservaForm";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";

export default async function NovaReservaPage() {
  const usuarioAtual = await getUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  return <NovaReservaForm nomeInicial={usuarioAtual.perfil.nome ?? ""} />;
}
