-- =============================================================
-- MIGRATION 011 — Empresas (multi-empresa-ready) e Motoristas
--
-- empresas: existe apenas para deixar empresa_id presente em todas as
-- tabelas novas, sem implementar multi-tenancy de fato. 1 linha singleton
-- com id fixo, igual ao padrão "gestor singleton" já usado no app.
--
-- motoristas: entidade própria para nome + CNH, pois motorista nem
-- sempre é usuário do sistema (terceirizado). Para quem TEM login,
-- motoristas.id é o MESMO id de usuarios/auth.users (PK compartilhada via
-- usuario_id = id) — isso preserva, sem nenhuma mudança de código, todas
-- as políticas e queries existentes que comparam reservas.motorista_id
-- com auth.uid() (ver migrations 008 e 010). Terceirizados recebem um id
-- novo, sem usuario_id.
-- =============================================================

-- =============================================================
-- TABELA: empresas
-- =============================================================

CREATE TABLE public.empresas (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Singleton com id fixo para poder ser referenciado por default em outras migrations/seed.
INSERT INTO public.empresas (id, nome)
VALUES ('00000000-0000-0000-0000-000000000001', 'Empresa Padrão')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empresas: leitura autenticada"
  ON public.empresas FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================
-- TABELA: motoristas
-- =============================================================

CREATE TABLE public.motoristas (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id    UUID        NOT NULL REFERENCES public.empresas(id),
  nome          TEXT        NOT NULL,
  cnh_numero    TEXT,
  cnh_categoria TEXT,
  cnh_validade  DATE,
  usuario_id    UUID        REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Quando há login, o id do motorista É o id do usuário (PK compartilhada).
  CONSTRAINT motoristas_usuario_id_eq_id CHECK (usuario_id IS NULL OR usuario_id = id)
);

COMMENT ON TABLE public.motoristas IS 'Pessoa que dirige (com ou sem login no sistema). usuario_id preenchido = mesma pessoa de usuarios/auth.users.';
COMMENT ON COLUMN public.motoristas.usuario_id IS 'NULL para terceirizados sem conta. Quando preenchido, é sempre igual a id.';

CREATE INDEX idx_motoristas_empresa ON public.motoristas(empresa_id);

-- Backfill: um motorista por usuário já existente, com a mesma PK.
INSERT INTO public.motoristas (id, empresa_id, nome, usuario_id)
SELECT id, '00000000-0000-0000-0000-000000000001', nome, id
FROM public.usuarios
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "motoristas: gestor ve todos"
  ON public.motoristas FOR SELECT
  TO authenticated
  USING (public.papel_atual() = 'gestor');

CREATE POLICY "motoristas: usuario ve proprio"
  ON public.motoristas FOR SELECT
  TO authenticated
  USING (usuario_id = auth.uid());

CREATE POLICY "motoristas: gestor cria"
  ON public.motoristas FOR INSERT
  TO authenticated
  WITH CHECK (public.papel_atual() = 'gestor');

CREATE POLICY "motoristas: gestor atualiza"
  ON public.motoristas FOR UPDATE
  TO authenticated
  USING (public.papel_atual() = 'gestor')
  WITH CHECK (public.papel_atual() = 'gestor');

CREATE POLICY "motoristas: gestor exclui"
  ON public.motoristas FOR DELETE
  TO authenticated
  USING (public.papel_atual() = 'gestor');

-- =============================================================
-- Mantém motoristas em sincronia com novos cadastros de usuario
-- (mesmo padrão de handle_new_user, que sincroniza auth.users → usuarios)
-- =============================================================

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

  INSERT INTO public.usuarios (id, nome, email, papel)
  VALUES (NEW.id, _nome, NEW.email, 'funcionario')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.motoristas (id, empresa_id, nome, usuario_id)
  VALUES (NEW.id, '00000000-0000-0000-0000-000000000001', _nome, NEW.id)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Mesmo tratamento de privilégios da migration 010 (revogado de anon/authenticated/public).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
