"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { z } from "zod";
import { senhaSchema } from "@/lib/senha";

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type FormState =
  | { error: string; success?: never; emailNaoConfirmado?: false; email?: never }
  | { error: string; emailNaoConfirmado: true; email: string; success?: never }
  | { success: string; error?: never; emailNaoConfirmado?: never; email?: never }
  | null;

// ─── Login ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

export async function loginAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (
      error.message === "Email not confirmed" ||
      (error as { code?: string }).code === "email_not_confirmed"
    ) {
      return {
        error: "E-mail ainda não confirmado.",
        emailNaoConfirmado: true,
        email: parsed.data.email,
      };
    }
    return { error: "E-mail ou senha incorretos." };
  }

  redirect("/home");
}

// ─── Cadastro ────────────────────────────────────────────────────────────────

const cadastroSchema = z
  .object({
    nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("E-mail inválido"),
    password: senhaSchema,
    modo: z.enum(["criar", "entrar"]),
    empresa_nome: z.string().optional(),
    empresa_codigo: z.string().optional(),
  })
  .refine((d) => d.modo !== "criar" || (d.empresa_nome ?? "").trim().length >= 2, {
    message: "Informe o nome da empresa (mín. 2 caracteres)",
    path: ["empresa_nome"],
  })
  .refine((d) => d.modo !== "entrar" || (d.empresa_codigo ?? "").trim().length > 0, {
    message: "Informe o código da empresa",
    path: ["empresa_codigo"],
  });

// Alfabeto sem caracteres ambíguos (O/0, I/1) para o código ser fácil de ditar.
const CODIGO_ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function gerarCodigoEmpresa(): string {
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += CODIGO_ALFABETO[Math.floor(Math.random() * CODIGO_ALFABETO.length)];
  }
  return s;
}

export async function cadastrarAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = cadastroSchema.safeParse({
    nome: formData.get("nome"),
    email: formData.get("email"),
    password: formData.get("password"),
    modo: formData.get("modo"),
    empresa_nome: formData.get("empresa_nome") ?? undefined,
    empresa_codigo: formData.get("empresa_codigo") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { nome, email, password, modo } = parsed.data;

  // Restringe a um domínio de e-mail apenas se a variável estiver configurada.
  const allowedDomain = process.env.ALLOWED_REGISTRATION_DOMAIN;
  if (allowedDomain) {
    const emailDomain = email.split("@")[1]?.toLowerCase() ?? "";
    if (emailDomain !== allowedDomain.toLowerCase()) {
      return { error: "Apenas e-mails corporativos são permitidos para cadastro." };
    }
  }

  const admin = createAdminClient();

  // Modo "entrar": valida o código ANTES de criar o usuário, para não deixar
  // conta órfã se o código for inválido.
  let empresaExistenteId: string | null = null;
  if (modo === "entrar") {
    const codigo = (parsed.data.empresa_codigo ?? "").trim().toUpperCase();
    const { data: empresa } = await admin
      .from("empresas")
      .select("id")
      .eq("codigo", codigo)
      .single();
    if (!empresa) {
      return { error: "Código de empresa inválido. Confira com o gestor." };
    }
    empresaExistenteId = empresa.id;
  }

  // Cria o usuário já confirmado, sem enviar e-mail (evita rate limit do Supabase free).
  // O trigger handle_new_user cria o perfil na empresa padrão como 'funcionario'
  // (default seguro) — o reposicionamento na empresa correta é feito abaixo,
  // sempre no servidor, nunca por metadados controláveis pelo cliente.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome },
  });

  if (error) {
    if (
      error.message.includes("already registered") ||
      error.message.includes("already been registered")
    ) {
      return { error: "Este e-mail já está cadastrado." };
    }
    return { error: "Erro ao criar conta. Tente novamente." };
  }

  if (!data.user) {
    return { error: "Erro ao criar conta. Tente novamente." };
  }

  const userId = data.user.id;

  // Determina a empresa de destino e o papel.
  let empresaId: string;
  let papelFinal: "gestor" | "funcionario";

  if (modo === "criar") {
    // Cria a empresa nova (código único, com algumas tentativas em caso de colisão).
    let empresaCriadaId: string | null = null;
    for (let tentativa = 0; tentativa < 5 && !empresaCriadaId; tentativa++) {
      const { data: novaEmpresa, error: empresaError } = await admin
        .from("empresas")
        .insert({ nome: (parsed.data.empresa_nome ?? "").trim(), codigo: gerarCodigoEmpresa() })
        .select("id")
        .single();
      if (novaEmpresa) empresaCriadaId = novaEmpresa.id;
      else if (empresaError?.code !== "23505") break; // erro que não é colisão de código
    }
    if (!empresaCriadaId) {
      await admin.auth.admin.deleteUser(userId); // desfaz o usuário órfão
      return { error: "Erro ao criar a empresa. Tente novamente." };
    }
    empresaId = empresaCriadaId;
    papelFinal = "gestor";
  } else {
    empresaId = empresaExistenteId!;
    papelFinal = "funcionario";
  }

  // Reposiciona o perfil e o motorista na empresa correta (e promove a gestor
  // quem criou a empresa). Feito com o service_role — decisão de servidor.
  await admin.from("usuarios").update({ empresa_id: empresaId, papel: papelFinal }).eq("id", userId);
  await admin.from("motoristas").update({ empresa_id: empresaId }).eq("id", userId);

  // Inicia a sessão após o cadastro
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) redirect("/login");

  redirect("/perfil?novo=1");
}

// ─── Reenviar confirmação de e-mail ──────────────────────────────────────────

export async function reenviarConfirmacaoAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const email = formData.get("email")?.toString().trim() ?? "";
  if (!email) return { error: "E-mail não informado." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://Frota.vercel.app/"}/home`,
    },
  });

  if (error) return { error: "Erro ao reenviar. Tente novamente em alguns minutos." };

  return { success: "E-mail reenviado! Verifique sua caixa de entrada e a pasta de spam." };
}

// ─── Esqueci minha senha ──────────────────────────────────────────────────────

const emailSchema = z.string().email("E-mail inválido");

export async function esquecerSenhaAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const email = formData.get("email")?.toString() ?? "";
  const parsed = emailSchema.safeParse(email);

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://Frota.vercel.app/";

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteUrl}/nova-senha`,
  });

  if (error) return { error: "Erro ao enviar e-mail. Tente novamente." };

  return { success: "Enviamos um link de redefinição para o seu e-mail." };
}

// ─── Nova senha (pós-reset) ───────────────────────────────────────────────────

const novaSenhaSchema = z
  .object({
    password: senhaSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "As senhas não coincidem",
    path: ["confirm"],
  });

export async function novaSenhaAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = novaSenhaSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) return { error: "Erro ao atualizar a senha. Tente novamente." };

  redirect("/home");
}
