import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Nunca cachear
export const dynamic = "force-dynamic";

// Endpoint público: por padrão só confirma que o processo está de pé, sem
// tocar o banco nem vazar detalhes internos. A checagem "funda" (toca o
// Supabase com service_role, útil para monitoramento que precisa saber se o
// projeto está pausado) só roda se o chamador provar que tem o segredo —
// sem isso, qualquer um na internet poderia bater aqui repetidamente
// (consumo de recursos) e, em caso de erro, ver a mensagem interna do banco.
export async function GET(request: NextRequest) {
  const secret = process.env.HEALTH_CHECK_SECRET;
  const fornecido = request.headers.get("x-health-secret");
  const checagemProfunda = Boolean(secret) && fornecido === secret;

  if (!checagemProfunda) {
    return NextResponse.json({ status: "ok" });
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("veiculos")
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("health check: db error", error);
      return NextResponse.json({ status: "error" }, { status: 503 });
    }

    return NextResponse.json({
      status: "ok",
      db: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("health check: unreachable", err);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
