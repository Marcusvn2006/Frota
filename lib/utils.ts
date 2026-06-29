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
