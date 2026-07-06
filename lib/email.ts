import { Resend } from "resend";

// RESEND_API_KEY e RESEND_FROM_EMAIL são configuradas no ambiente de deploy
// (Vercel). RESEND_FROM_EMAIL precisa ser um remetente verificado no Resend;
// sem ela, cai no domínio de testes onboarding@resend.dev.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Frota <onboarding@resend.dev>";

let _resend: Resend | undefined;

function getResend(): Resend {
  _resend ??= new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

export async function sendEmail(params: {
  to: string[];
  subject: string;
  html: string;
}): Promise<{ error: string | null }> {
  if (!params.to.length) return { error: null };

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  return { error: error?.message ?? null };
}
