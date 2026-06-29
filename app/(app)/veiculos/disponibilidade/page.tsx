import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DisponibilidadeClient } from "./DisponibilidadeClient";

export default async function DisponibilidadePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <DisponibilidadeClient />;
}
