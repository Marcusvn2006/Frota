import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata um timestamp UTC para exibição em BRT (UTC-3). */
export function formatBRT(
  value: string | Date | null | undefined,
  opts: Intl.DateTimeFormatOptions = {
    dateStyle: "short",
    timeStyle: "short",
  }
): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", {
    ...opts,
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

/** Converte uma string "HH:MM" local para o valor de input time. */
export function timeInputValue(timeStr: string | null | undefined): string {
  return timeStr ?? "";
}

/** Formata número como moeda BRL. */
export function formatBRL(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Formata uma coluna DATE (sem hora, ex.: "2026-07-01") para "01/07/2026".
 * Não usa Date/timeZone: um DATE puro interpretado como UTC e depois
 * convertido para America/Sao_Paulo (formatBRT) volta um dia, já que
 * "00:00 UTC" é "21:00 do dia anterior" em BRT.
 */
export function formatDateOnlyBR(value: string | null | undefined): string {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}
