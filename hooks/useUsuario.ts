"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Usuario } from "@/lib/types/database.types";

interface UseUsuarioReturn {
  usuario: Usuario | null;
  loading: boolean;
  isGestor: boolean;
}

export function useUsuario(): UseUsuarioReturn {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function carregar() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", user.id)
        .single();

      setUsuario(data ?? null);
      setLoading(false);
    }

    carregar();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      carregar();
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    usuario,
    loading,
    isGestor: usuario?.papel === "gestor",
  };
}
