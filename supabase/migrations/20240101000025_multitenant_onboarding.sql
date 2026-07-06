-- =============================================================
-- MIGRATION 025 — Onboarding por código de empresa (Etapa 3 de 4)
--
-- Cada empresa ganha um `codigo` curto e único, que o gestor
-- compartilha para funcionários entrarem na empresa no cadastro.
--
-- A colocação do usuário na empresa (e a promoção a gestor de quem
-- cria uma empresa nova) é feita 100% no servidor pela cadastrarAction
-- via service_role — NUNCA a partir de metadados controláveis pelo
-- cliente. Por isso o trigger handle_new_user continua criando o
-- perfil na empresa padrão como 'funcionario' (default seguro); a
-- action reposiciona depois. Assim, mesmo que o signup público esteja
-- aberto, ninguém consegue nascer 'gestor' nem entrar numa empresa
-- alheia por manipulação de metadados.
-- =============================================================

ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS codigo TEXT;

-- Backfill do código da empresa singleton existente.
UPDATE public.empresas
SET codigo = 'FROTA1'
WHERE id = '00000000-0000-0000-0000-000000000001' AND codigo IS NULL;

-- Único e obrigatório daqui pra frente.
CREATE UNIQUE INDEX IF NOT EXISTS empresas_codigo_unico ON public.empresas(codigo);
ALTER TABLE public.empresas ALTER COLUMN codigo SET NOT NULL;
