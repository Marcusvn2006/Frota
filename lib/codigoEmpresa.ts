import { randomInt } from "crypto";

// Alfabeto sem caracteres ambíguos (O/0, I/1) para o código ser fácil de ditar.
const CODIGO_ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// randomInt (crypto) em vez de Math.random(): o código é o único controle de
// entrada na empresa, então o gerador precisa ser imprevisível o suficiente
// para resistir a tentativa de adivinhação/força bruta.
export function gerarCodigoEmpresa(): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += CODIGO_ALFABETO[randomInt(CODIGO_ALFABETO.length)];
  }
  return s;
}
