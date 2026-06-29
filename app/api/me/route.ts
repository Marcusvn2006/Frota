import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ nome: null }, { status: 401 });

  const { data } = await supabase
    .from("usuarios")
    .select("nome, papel")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ nome: data?.nome ?? null, papel: data?.papel ?? null });
}
