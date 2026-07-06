-- =============================================================
-- MIGRATION 023 — Fundação multi-tenant (Etapa 1 de 4)
--
-- Prepara o schema para isolamento real por empresa SEM mudar
-- comportamento. Todos os dados existentes são atribuídos à empresa
-- singleton atual, então, enquanto houver apenas uma empresa, nada
-- muda para os usuários.
--
-- O que esta migration faz:
--   1. Adiciona empresa_id em usuarios, veiculos e reservas — as
--      tabelas "raiz" de tenant que ainda não tinham (motoristas,
--      multas e vencimentos já têm desde as migrations 011/013/021).
--   2. Backfill de tudo para a empresa padrão existente.
--   3. Cria empresa_atual() — espelho de papel_atual(): devolve a
--      empresa do usuário logado, para uso nas policies da Etapa 2.
--   4. Trigger carimba_empresa_id() que preenche empresa_id =
--      empresa_atual() em todo INSERT que não trouxe valor, para
--      nenhum caminho de código esquecer de setar.
--   5. handle_new_user() passa a gravar empresa_id no perfil novo.
--   6. empresa_id vira NOT NULL nas tabelas raiz + índices.
--
-- A reescrita das políticas RLS (o isolamento de fato) vem na
-- MIGRATION 024. Esta aqui é puramente aditiva e reversível.
-- =============================================================

-- ── 1 + 2. Colunas + backfill ────────────────────────────────
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);
ALTER TABLE public.veiculos ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);

UPDATE public.usuarios SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.veiculos SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.reservas SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- ── 3. empresa_atual() — mesma técnica de papel_atual() ──────
-- SECURITY DEFINER para não recursar no RLS de usuarios quando for
-- chamada dentro das próprias políticas (Etapa 2).
CREATE OR REPLACE FUNCTION public.empresa_atual()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid());
END;
$$;

-- Precisa de EXECUTE para authenticated (as policies da Etapa 2 a
-- avaliam sob o papel do usuário) — mesma lição da migration 020.
GRANT EXECUTE ON FUNCTION public.empresa_atual() TO anon, authenticated;

-- ── 4. Trigger de carimbo automático de empresa_id ───────────
-- Preenche empresa_id = empresa_atual() quando o INSERT não trouxe
-- valor. Assim os server actions não precisam lembrar de setar, e
-- nenhum INSERT autenticado fica sem empresa. Operações via
-- service_role (sem sessão) precisam passar empresa_id explícito,
-- pois aí empresa_atual() é NULL.
CREATE OR REPLACE FUNCTION public.carimba_empresa_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := public.empresa_atual();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.carimba_empresa_id() FROM anon, authenticated, public;

CREATE TRIGGER on_veiculo_carimba_empresa
  BEFORE INSERT ON public.veiculos
  FOR EACH ROW EXECUTE FUNCTION public.carimba_empresa_id();

CREATE TRIGGER on_reserva_carimba_empresa
  BEFORE INSERT ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.carimba_empresa_id();

CREATE TRIGGER on_motorista_carimba_empresa
  BEFORE INSERT ON public.motoristas
  FOR EACH ROW EXECUTE FUNCTION public.carimba_empresa_id();

CREATE TRIGGER on_multa_carimba_empresa
  BEFORE INSERT ON public.multas
  FOR EACH ROW EXECUTE FUNCTION public.carimba_empresa_id();

CREATE TRIGGER on_vencimento_carimba_empresa
  BEFORE INSERT ON public.vencimentos
  FOR EACH ROW EXECUTE FUNCTION public.carimba_empresa_id();

-- ── 5. handle_new_user() grava empresa_id ────────────────────
-- Agora que usuarios.empresa_id será NOT NULL, o perfil criado no
-- cadastro precisa nascer com empresa. Por ora, todo novo cadastro
-- entra na empresa padrão — a Etapa 3 (onboarding) decidirá criação
-- de empresa nova / convite. Mantém a criação do motorista espelho.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _nome TEXT;
BEGIN
  _nome := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'nome'), ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.usuarios (id, nome, email, papel, empresa_id)
  VALUES (NEW.id, _nome, NEW.email, 'funcionario', '00000000-0000-0000-0000-000000000001')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.motoristas (id, empresa_id, nome, usuario_id)
  VALUES (NEW.id, '00000000-0000-0000-0000-000000000001', _nome, NEW.id)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- ── 6. NOT NULL nas raízes + índices ─────────────────────────
ALTER TABLE public.usuarios ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.veiculos ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.reservas ALTER COLUMN empresa_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_empresa ON public.usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_empresa ON public.veiculos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_reservas_empresa ON public.reservas(empresa_id);
