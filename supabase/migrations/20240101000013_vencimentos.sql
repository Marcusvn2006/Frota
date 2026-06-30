-- =============================================================
-- MIGRATION 013 — Vencimentos (CNH, IPVA, licenciamento, revisão,
-- seguro) e controle de alertas enviados
--
-- vencimentos: tabela genérica para qualquer data de validade que
-- precisa de alerta por e-mail (CNH de motorista; IPVA, licenciamento,
-- revisão e seguro de veículo). entidade_tipo + entidade_id formam uma
-- associação polimórfica (veiculo|motorista) — Postgres não suporta FK
-- condicional nativa, então a integridade é garantida por trigger
-- (valida_entidade_vencimento) em vez de uma FOREIGN KEY de fato.
--
-- Uma linha por (entidade_tipo, entidade_id, tipo): a tela de edição
-- de veículo/motorista sempre faz UPSERT da nova data nessa mesma
-- linha. Ao mudar data_vencimento, o trigger
-- handle_vencimento_renovado zera "resolvido" e apaga os alertas já
-- enviados (alertas_enviados), permitindo que as janelas de alerta
-- disparem de novo para o novo prazo.
--
-- "resolvido" também pode ser marcado manualmente pelo gestor (tela
-- /gestor/vencimentos) para silenciar alertas sem alterar a data
-- (ex.: renovação já em andamento).
--
-- alertas_enviados garante envio idempotente: o cron (rodando com a
-- service role, fora do RLS) insere uma linha por (vencimento_id,
-- dias_antes) antes de mandar o e-mail; a UNIQUE constraint impede
-- duplicidade caso o cron rode mais de uma vez no mesmo dia.
--
-- RLS restrita ao gestor: vencimentos é uma preocupação operacional
-- interna, sem necessidade de leitura por funcionário.
-- =============================================================

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE public.entidade_vencimento AS ENUM ('veiculo', 'motorista');

CREATE TYPE public.tipo_vencimento AS ENUM (
  'cnh',
  'ipva',
  'licenciamento',
  'revisao',
  'seguro'
);

-- =============================================================
-- TABELA: vencimentos
-- =============================================================

CREATE TABLE public.vencimentos (
  id              UUID                       PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID                       NOT NULL REFERENCES public.empresas(id),
  entidade_tipo   public.entidade_vencimento NOT NULL,
  entidade_id     UUID                       NOT NULL,
  tipo            public.tipo_vencimento     NOT NULL,
  data_vencimento DATE                       NOT NULL,
  resolvido       BOOLEAN                    NOT NULL DEFAULT FALSE,
  observacao      TEXT,
  created_at      TIMESTAMPTZ                NOT NULL DEFAULT NOW(),

  CONSTRAINT vencimentos_entidade_tipo_unico UNIQUE (entidade_tipo, entidade_id, tipo)
);

COMMENT ON TABLE public.vencimentos IS 'Datas de validade que geram alerta (CNH, IPVA, licenciamento, revisão, seguro). entidade_id referencia veiculos ou motoristas conforme entidade_tipo (validado por trigger, não por FK).';
COMMENT ON COLUMN public.vencimentos.resolvido IS 'Silencia alertas sem alterar a data (ex.: renovação em andamento). Zerado automaticamente quando data_vencimento muda.';

CREATE INDEX idx_vencimentos_entidade        ON public.vencimentos(entidade_tipo, entidade_id);
CREATE INDEX idx_vencimentos_resolvido_data  ON public.vencimentos(resolvido, data_vencimento);
CREATE INDEX idx_vencimentos_empresa         ON public.vencimentos(empresa_id);

-- =============================================================
-- TABELA: alertas_enviados
-- =============================================================

CREATE TABLE public.alertas_enviados (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  vencimento_id UUID        NOT NULL REFERENCES public.vencimentos(id) ON DELETE CASCADE,
  dias_antes    INTEGER     NOT NULL,
  enviado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT alertas_enviados_dias_antes_valido CHECK (dias_antes IN (30, 15, 7, 1, 0)),
  CONSTRAINT alertas_enviados_unico UNIQUE (vencimento_id, dias_antes)
);

COMMENT ON TABLE public.alertas_enviados IS 'Registro de alertas já enviados, para envio idempotente por janela (30/15/7/1/0 dias antes do vencimento).';

CREATE INDEX idx_alertas_enviados_vencimento ON public.alertas_enviados(vencimento_id);

-- =============================================================
-- TRIGGER: valida entidade_id contra a tabela certa
-- (substitui a FK que o Postgres não permite numa associação
-- polimórfica)
-- =============================================================

CREATE OR REPLACE FUNCTION public.valida_entidade_vencimento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.entidade_tipo = 'veiculo' THEN
    IF NOT EXISTS (SELECT 1 FROM public.veiculos WHERE id = NEW.entidade_id) THEN
      RAISE EXCEPTION 'entidade_id % não corresponde a um veículo existente', NEW.entidade_id;
    END IF;
  ELSIF NEW.entidade_tipo = 'motorista' THEN
    IF NOT EXISTS (SELECT 1 FROM public.motoristas WHERE id = NEW.entidade_id) THEN
      RAISE EXCEPTION 'entidade_id % não corresponde a um motorista existente', NEW.entidade_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_vencimento_valida_entidade
  BEFORE INSERT OR UPDATE OF entidade_tipo, entidade_id ON public.vencimentos
  FOR EACH ROW EXECUTE FUNCTION public.valida_entidade_vencimento();

-- =============================================================
-- TRIGGER: ao renovar (mudar data_vencimento), reabre o vencimento
-- e limpa o histórico de alertas para que as janelas disparem de novo
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_vencimento_renovado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.data_vencimento IS DISTINCT FROM OLD.data_vencimento THEN
    DELETE FROM public.alertas_enviados WHERE vencimento_id = NEW.id;
    NEW.resolvido := false;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_vencimento_data_alterada
  BEFORE UPDATE OF data_vencimento ON public.vencimentos
  FOR EACH ROW EXECUTE FUNCTION public.handle_vencimento_renovado();

-- =============================================================
-- TRIGGER: remove vencimentos órfãos quando o veículo/motorista
-- referenciado é excluído (não há FK nativa para fazer isso via CASCADE)
-- =============================================================

CREATE OR REPLACE FUNCTION public.limpa_vencimentos_entidade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.vencimentos
  WHERE entidade_tipo = TG_ARGV[0]::public.entidade_vencimento
    AND entidade_id = OLD.id;

  RETURN OLD;
END;
$$;

CREATE TRIGGER on_veiculo_excluido_limpa_vencimentos
  AFTER DELETE ON public.veiculos
  FOR EACH ROW EXECUTE FUNCTION public.limpa_vencimentos_entidade('veiculo');

CREATE TRIGGER on_motorista_excluido_limpa_vencimentos
  AFTER DELETE ON public.motoristas
  FOR EACH ROW EXECUTE FUNCTION public.limpa_vencimentos_entidade('motorista');

-- =============================================================
-- RLS
-- =============================================================

ALTER TABLE public.vencimentos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_enviados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vencimentos: gestor ve todos"
  ON public.vencimentos FOR SELECT
  TO authenticated
  USING (public.papel_atual() = 'gestor');

CREATE POLICY "vencimentos: gestor cria"
  ON public.vencimentos FOR INSERT
  TO authenticated
  WITH CHECK (public.papel_atual() = 'gestor');

CREATE POLICY "vencimentos: gestor atualiza"
  ON public.vencimentos FOR UPDATE
  TO authenticated
  USING (public.papel_atual() = 'gestor')
  WITH CHECK (public.papel_atual() = 'gestor');

CREATE POLICY "vencimentos: gestor exclui"
  ON public.vencimentos FOR DELETE
  TO authenticated
  USING (public.papel_atual() = 'gestor');

-- Somente leitura para o gestor; inserts são feitos pelo cron via
-- service role, que ignora RLS — não há política de INSERT/UPDATE/DELETE
-- para usuários autenticados aqui.
CREATE POLICY "alertas_enviados: gestor ve"
  ON public.alertas_enviados FOR SELECT
  TO authenticated
  USING (public.papel_atual() = 'gestor');

-- Mesmo tratamento de privilégios das migrations 010/011 (funções SECURITY
-- DEFINER não devem ser chamáveis diretamente via RPC).
REVOKE EXECUTE ON FUNCTION public.valida_entidade_vencimento()  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_vencimento_renovado()  FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.limpa_vencimentos_entidade()  FROM anon, authenticated, public;
