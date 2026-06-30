import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, EntidadeVencimento, TipoVencimento } from "./types/database.types";
import { DEFAULT_EMPRESA_ID } from "./constants";

export const TIPO_LABEL: Record<TipoVencimento, string> = {
  cnh: "CNH",
  ipva: "IPVA",
  licenciamento: "Licenciamento",
  revisao: "Revisão",
  seguro: "Seguro",
};

/** "Hoje" no calendário de Brasília, como "YYYY-MM-DD" (evita off-by-one perto da meia-noite UTC). */
export function hojeBRT(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

/** Diferença em dias entre duas datas "YYYY-MM-DD", tratadas como calendário puro (sem fuso). */
export function diferencaDias(dataISO: string, baseISO: string): number {
  const [y1, m1, d1] = dataISO.split("-").map(Number);
  const [y2, m2, d2] = baseISO.split("-").map(Number);
  const ms = Date.UTC(y1, m1 - 1, d1) - Date.UTC(y2, m2 - 1, d2);
  return Math.round(ms / 86_400_000);
}

export function somaDias(dataISO: string, dias: number): string {
  const [y, m, d] = dataISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
}

export type UrgenciaVencimento = "vencido" | "critico" | "atencao" | "ok";

/** vencido (<0d), crítico (até 7d), atenção (até 30d), ok (depois). */
export function urgenciaVencimento(dias: number): UrgenciaVencimento {
  if (dias < 0) return "vencido";
  if (dias <= 7) return "critico";
  if (dias <= 30) return "atencao";
  return "ok";
}

export function descricaoPrazo(dias: number): string {
  if (dias < 0) return `vencido há ${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? "s" : ""}`;
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "vence em 1 dia";
  return `vence em ${dias} dias`;
}

/**
 * Mantém o vencimento de uma entidade (veículo/motorista) em sincronia com a
 * data informada no formulário de cadastro: cria/atualiza via UPSERT quando
 * há data, remove quando o campo é limpo. O trigger handle_vencimento_renovado
 * já cuida de resetar `resolvido` e os alertas enviados quando a data muda.
 */
export async function sincronizarVencimento(
  supabase: SupabaseClient<Database>,
  entidadeTipo: EntidadeVencimento,
  entidadeId: string,
  tipo: TipoVencimento,
  dataVencimento: string | null
): Promise<{ error: string | null }> {
  if (!dataVencimento) {
    const { error } = await supabase
      .from("vencimentos")
      .delete()
      .eq("entidade_tipo", entidadeTipo)
      .eq("entidade_id", entidadeId)
      .eq("tipo", tipo);
    return { error: error?.message ?? null };
  }

  const { error } = await supabase.from("vencimentos").upsert(
    {
      empresa_id: DEFAULT_EMPRESA_ID,
      entidade_tipo: entidadeTipo,
      entidade_id: entidadeId,
      tipo,
      data_vencimento: dataVencimento,
    },
    { onConflict: "entidade_tipo,entidade_id,tipo" }
  );

  return { error: error?.message ?? null };
}
