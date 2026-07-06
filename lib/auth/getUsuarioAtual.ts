import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Usuario } from "@/lib/types/database.types";

export type UsuarioAtual = {
  user: { id: string; email: string | undefined };
  perfil: Usuario;
} | null;

/**
 * Busca o usuário autenticado + perfil (usuarios) uma única vez por
 * requisição. Antes, cada layout/page chamava supabase.auth.getUser() e
 * uma query separada em `usuarios` de forma independente — em uma
 * navegação típica isso somava 3-4 idas à rede ao Supabase só para
 * autenticação, antes mesmo da página buscar seus próprios dados.
 *
 * React `cache()` faz memoização por requisição: chamado pelo layout e
 * de novo pela page, a segunda chamada reaproveita o resultado da
 * primeira em vez de repetir a ida à rede.
 */
export const getUsuarioAtual = cache(async (): Promise<UsuarioAtual> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!perfil) return null;

  return { user: { id: user.id, email: user.email }, perfil };
});
