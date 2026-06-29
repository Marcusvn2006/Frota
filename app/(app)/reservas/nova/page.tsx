import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NovaReservaForm } from "./NovaReservaForm";

export default async function NovaReservaPage() {
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

  return <NovaReservaForm nomeInicial={perfil?.nome ?? ""} />;
}
