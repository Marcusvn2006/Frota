"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export type VeiculoResultado = {
  id: string;
  modelo: string;
  placa: string;
  cor: string;
  disponivel: boolean;
  motivo: "manutencao" | "reservado" | null;
};

export type DisponibilidadeState = {
  resultado: VeiculoResultado[];
  inicio: string;
  fim: string;
  error?: string;
} | null;

export async function verificarDisponibilidadeAction(
  _prev: DisponibilidadeState,
  formData: FormData
): Promise<DisponibilidadeState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const inicio = (formData.get("inicio") as string | null) ?? "";
  const fim = (formData.get("fim") as string | null) ?? "";

  if (!inicio || !fim) {
    return { resultado: [], inicio, fim, error: "Preencha os dois campos de data." };
  }
  if (new Date(fim) <= new Date(inicio)) {
    return { resultado: [], inicio, fim, error: "O retorno deve ser após a saída." };
  }

  // Admin client para ver todas as reservas aprovadas (ignora RLS de solicitante)
  const admin = createAdminClient();

  const [{ data: veiculos }, { data: conflitos }] = await Promise.all([
    admin.from("veiculos").select("id, modelo, placa, cor, em_manutencao").order("modelo"),
    admin
      .from("reservas")
      .select("veiculo_id")
      .eq("status", "aprovada")
      .lt("inicio", fim)
      .gt("fim", inicio)
      .not("veiculo_id", "is", null),
  ]);

  if (!veiculos) return { resultado: [], inicio, fim };

  const emConflito = new Set(conflitos?.map((c) => c.veiculo_id) ?? []);

  const resultado: VeiculoResultado[] = veiculos.map((v) => ({
    id: v.id,
    modelo: v.modelo,
    placa: v.placa,
    cor: v.cor,
    disponivel: !v.em_manutencao && !emConflito.has(v.id),
    motivo: v.em_manutencao ? "manutencao" : emConflito.has(v.id) ? "reservado" : null,
  }));

  return { resultado, inicio, fim };
}
