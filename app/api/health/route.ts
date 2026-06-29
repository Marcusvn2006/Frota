import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Nunca cachear — cada requisição deve tocar o banco de fato
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = createAdminClient();

    // Query mínima só para registrar atividade no Supabase e evitar pause
    const { error } = await admin
      .from("veiculos")
      .select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { status: "error", db: error.message },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "error", db: "unreachable" },
      { status: 503 }
    );
  }
}
