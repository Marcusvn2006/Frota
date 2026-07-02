"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * Input de placa que formata enquanto o usuário digita: força maiúsculas,
 * remove espaços/hífens/símbolos e limita a 7 caracteres (AAA0000 antigo ou
 * AAA0A00 Mercosul). A validação estrita do formato acontece no servidor
 * (criarVeiculoAction/editarVeiculoAction).
 */
function formatarPlaca(v: string): string {
  return v
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 7);
}

export function PlacaInput({
  defaultValue = "",
  id = "placa",
  name = "placa",
}: {
  defaultValue?: string;
  id?: string;
  name?: string;
}) {
  const [placa, setPlaca] = useState(formatarPlaca(defaultValue));

  return (
    <Input
      id={id}
      name={name}
      value={placa}
      onChange={(e) => setPlaca(formatarPlaca(e.target.value))}
      placeholder="Ex: ABC1D23"
      maxLength={7}
      inputMode="text"
      autoCapitalize="characters"
      autoComplete="off"
      className="uppercase tracking-widest font-mono"
      required
    />
  );
}
