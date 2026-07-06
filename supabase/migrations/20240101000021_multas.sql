-- =============================================================
-- MIGRATION 021 — Controle de multas
--
-- Cadastro manual pelo gestor (sem integração com órgãos de trânsito).
-- Ao informar veículo + data/hora da infração, a tela de cadastro
-- (server action) busca a reserva daquele veículo que cobria aquele
-- período (aprovada ou concluída) e já sugere/vincula o motorista
-- automaticamente. Sem match, a multa fica sem motorista_id até o
-- gestor atribuir manualmente pela própria tela de multas.
--
-- resolvida: controle simples de "pendente/paga", sem sub-estados
-- (indicação de condutor, recurso, etc.) — fora de escopo por ora.
-- =============================================================

CREATE TABLE public.multas (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id      UUID          NOT NULL REFERENCES public.empresas(id),
  veiculo_id      UUID          NOT NULL REFERENCES public.veiculos(id) ON DELETE RESTRICT,
  motorista_id    UUID          REFERENCES public.motoristas(id) ON DELETE SET NULL,
  data_infracao   DATE          NOT NULL,
  hora_infracao   TIME          NOT NULL,
  valor           NUMERIC(10,2) NOT NULL,
  descricao       TEXT          NOT NULL,
  prazo_pagamento DATE,
  resolvida       BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.multas.motorista_id IS 'NULL quando nenhuma reserva do veículo cobria o horário da infração — gestor atribui manualmente depois.';
COMMENT ON COLUMN public.multas.resolvida    IS 'Marcado pelo gestor quando a multa é paga/resolvida. Controla o banner de aviso ao motorista.';

CREATE INDEX idx_multas_veiculo    ON public.multas(veiculo_id);
CREATE INDEX idx_multas_motorista  ON public.multas(motorista_id);
CREATE INDEX idx_multas_resolvida  ON public.multas(resolvida);

-- =============================================================
-- RLS — mesmo padrão de motoristas/vencimentos:
-- gestor tem CRUD completo; motorista vê só as próprias (read-only).
-- =============================================================

ALTER TABLE public.multas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "multas: gestor ve todos"
  ON public.multas FOR SELECT
  TO authenticated
  USING (public.papel_atual() = 'gestor');

CREATE POLICY "multas: motorista ve proprio"
  ON public.multas FOR SELECT
  TO authenticated
  USING (motorista_id = auth.uid());

CREATE POLICY "multas: gestor cria"
  ON public.multas FOR INSERT
  TO authenticated
  WITH CHECK (public.papel_atual() = 'gestor');

CREATE POLICY "multas: gestor atualiza"
  ON public.multas FOR UPDATE
  TO authenticated
  USING (public.papel_atual() = 'gestor')
  WITH CHECK (public.papel_atual() = 'gestor');

CREATE POLICY "multas: gestor exclui"
  ON public.multas FOR DELETE
  TO authenticated
  USING (public.papel_atual() = 'gestor');
