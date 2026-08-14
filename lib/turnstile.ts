// Verificação do token do Cloudflare Turnstile (CAPTCHA) no servidor.
//
// Configuração (env):
//   NEXT_PUBLIC_TURNSTILE_SITE_KEY — chave pública (widget no cliente)
//   TURNSTILE_SECRET_KEY           — chave secreta (verificação no servidor)
//
// Sem TURNSTILE_SECRET_KEY definido, a verificação é um no-op (retorna true) —
// assim o app roda em dev/local sem as chaves. Em produção, defina as DUAS
// chaves juntas: só a secret sem a site key bloquearia todos os logins.
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verificarTurnstile(
  token: string | null,
  ip?: string | null
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // não configurado → não bloqueia
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);

    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
