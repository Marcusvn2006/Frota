import { redirect } from "next/navigation";
import { DisponibilidadeClient } from "./DisponibilidadeClient";
import { getUsuarioAtual } from "@/lib/auth/getUsuarioAtual";

export default async function DisponibilidadePage() {
  const usuarioAtual = await getUsuarioAtual();
  if (!usuarioAtual) redirect("/login");

  return <DisponibilidadeClient />;
}
