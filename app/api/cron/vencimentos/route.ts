import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { formatDateOnlyBR } from "@/lib/utils";
import {
  TIPO_LABEL,
  hojeBRT,
  diferencaDias,
  somaDias,
  descricaoPrazo,
} from "@/lib/vencimentos";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

// Comparação em tempo constante para o Bearer token do cron (evita timing).
function bearerValido(header: string | null, secret: string): boolean {
  const esperado = `Bearer ${secret}`;
  const a = Buffer.from(header ?? "");
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Acionado pelo Vercel Cron (vercel.json) uma vez por dia.
// Autenticação via CRON_SECRET (Vercel injeta como Bearer token automaticamente
// quando a env var está configurada) — não passa pelo proxy de sessão (proxy.ts
// dá bypass em /api/*).
export const dynamic = "force-dynamic";

// Marcos de alerta antes do vencimento, do mais urgente ao menos urgente.
const JANELAS_ORDENADAS = [0, 1, 7, 15, 30] as const;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || !bearerValido(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const hoje = hojeBRT();
  const limite = somaDias(hoje, 30);

  // Sem limite inferior: itens vencidos (data_vencimento < hoje) continuam
  // sendo processados enquanto não forem resolvidos, para o lembrete
  // semanal de atraso (ver a lógica de marco / dias < 0 abaixo).
  const { data: vencimentos, error: vencimentosError } = await admin
    .from("vencimentos")
    .select("id, entidade_tipo, entidade_id, tipo, data_vencimento, empresa_id")
    .eq("resolvido", false)
    .lte("data_vencimento", limite);

  if (vencimentosError) {
    return NextResponse.json({ error: vencimentosError.message }, { status: 500 });
  }

  if (!vencimentos?.length) {
    return NextResponse.json({ processados: 0, enviados: 0, erros: [] });
  }

  const veiculoIds = vencimentos
    .filter((v) => v.entidade_tipo === "veiculo")
    .map((v) => v.entidade_id);
  const motoristaIds = vencimentos
    .filter((v) => v.entidade_tipo === "motorista")
    .map((v) => v.entidade_id);

  const [{ data: veiculos }, { data: motoristas }, { data: gestores }, { data: alertasExistentes }] =
    await Promise.all([
      veiculoIds.length
        ? admin.from("veiculos").select("id, modelo, placa").in("id", veiculoIds)
        : Promise.resolve({ data: [] as { id: string; modelo: string; placa: string }[] }),
      motoristaIds.length
        ? admin.from("motoristas").select("id, nome").in("id", motoristaIds)
        : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
      admin.from("usuarios").select("email, empresa_id").eq("papel", "gestor"),
      admin
        .from("alertas_enviados")
        .select("vencimento_id, dias_antes")
        .in("vencimento_id", vencimentos.map((v) => v.id)),
    ]);

  const veiculoMap = new Map((veiculos ?? []).map((v) => [v.id, v]));
  const motoristaMap = new Map((motoristas ?? []).map((m) => [m.id, m]));
  const jaEnviado = new Set(
    (alertasExistentes ?? []).map((a) => `${a.vencimento_id}:${a.dias_antes}`)
  );
  // Agrupa os e-mails de gestor por empresa: cada alerta vai apenas para os
  // gestores da empresa dona daquele vencimento (isolamento multi-tenant).
  const gestoresPorEmpresa = new Map<string, string[]>();
  for (const g of gestores ?? []) {
    if (!g.email) continue;
    const lista = gestoresPorEmpresa.get(g.empresa_id) ?? [];
    lista.push(g.email);
    gestoresPorEmpresa.set(g.empresa_id, lista);
  }

  let enviados = 0;
  const erros: string[] = [];

  for (const v of vencimentos) {
    const dias = diferencaDias(v.data_vencimento, hoje);
    // Antes do vencimento: dispara o marco (30/15/7/1/0) mais urgente já
    // atingido — isto é, o menor T tal que `dias <= T`. Usar "cruzou o
    // limiar" em vez de igualdade exata garante que, se o cron pular um dia,
    // o alerta daquele marco ainda sai (um dia atrasado) em vez de sumir.
    // Depois do vencimento: lembrete recorrente a cada 7 dias (-7, -14, ...).
    let marco: number | null = null;
    if (dias >= 0) {
      for (const t of JANELAS_ORDENADAS) {
        if (dias <= t) { marco = t; break; }
      }
    } else if (dias % 7 === 0) {
      marco = dias;
    }
    if (marco === null) continue;
    if (jaEnviado.has(`${v.id}:${marco}`)) continue;

    const destinatarios = gestoresPorEmpresa.get(v.empresa_id) ?? [];
    if (!destinatarios.length) continue;

    const entidadeNome =
      v.entidade_tipo === "veiculo"
        ? (() => {
            const veic = veiculoMap.get(v.entidade_id);
            return veic ? `${veic.modelo} (placa ${veic.placa})` : "Veículo";
          })()
        : (() => {
            const mot = motoristaMap.get(v.entidade_id);
            return mot ? mot.nome : "Motorista";
          })();

    const label = TIPO_LABEL[v.tipo];
    // entidadeNome vem de dados livres (nome do motorista, modelo do veículo).
    // Escapa antes de interpolar no corpo HTML para evitar injeção de markup.
    const nomeSeguro = escapeHtml(entidadeNome);
    const subject = `[Frota] ${label} de ${entidadeNome} ${descricaoPrazo(dias)}`;
    const html = `
      <p>${label} de <strong>${nomeSeguro}</strong> ${descricaoPrazo(dias)}.</p>
      <p>Data de vencimento: <strong>${formatDateOnlyBR(v.data_vencimento)}</strong></p>
    `;

    // Envia PRIMEIRO, registra depois: se o e-mail falhar, não gravamos o
    // alerta, então ele é retentado no próximo ciclo (antes, gravava antes de
    // enviar e uma falha do Resend descartava o alerta para sempre).
    const { error: emailError } = await sendEmail({ to: destinatarios, subject, html });
    if (emailError) {
      erros.push(`vencimento ${v.id} (marco ${marco}): e-mail falhou, será retentado — ${emailError}`);
      continue;
    }

    const { error: insertError } = await admin
      .from("alertas_enviados")
      .insert({ vencimento_id: v.id, dias_antes: marco });
    if (insertError) {
      // E-mail já saiu; a UNIQUE (vencimento_id, dias_antes) evita registro
      // duplicado, mas um raro reenvio é possível se o registro falhar aqui.
      erros.push(`vencimento ${v.id} (marco ${marco}): e-mail enviado mas registro falhou — ${insertError.message}`);
    }

    enviados++;
  }

  return NextResponse.json({ processados: vencimentos.length, enviados, erros });
}
