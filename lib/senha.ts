import { z } from "zod";

// Regra de senha usada em todos os pontos que definem senha (cadastro, trocar
// senha, redefinir senha). Compensa a ausência do "leaked password protection"
// do Supabase (recurso pago) exigindo um mínimo de robustez no próprio app.
export const senhaSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .regex(/[A-Za-z]/, "A senha deve conter ao menos uma letra")
  .regex(/[0-9]/, "A senha deve conter ao menos um número");

export const SENHA_DICA = "Mínimo 8 caracteres, com letra e número";
