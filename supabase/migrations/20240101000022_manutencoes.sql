-- =============================================================
-- MIGRATION 022 — Histórico de manutenções com custo
--
-- Antes, "manutenção" era só um estado atual em veiculos
-- (em_manutencao + manutencao_motivo), sem custo e sem histórico —
-- ao remover da manutenção, o motivo era apagado (UPDATE ... SET
-- manutencao_motivo = NULL) e a informação se perdia.
--
-- Esta tabela registra cada evento de manutenção (motivo, quando
-- começou/terminou e quanto custou), permitindo relatório de custo
-- total por veículo (combustível + multas + manutenção). veiculos.
-- em_manutencao/manutencao_motivo continuam existindo como estão —
-- ainda são a fonte rápida do estado "atual" usada em toda a UI —
-- essa tabela é a fonte de verdade do histórico e do custo.
-- =============================================================

CREATE TABLE public.manutencoes (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  veiculo_id   UUID          NOT NULL REFERENCES public.veiculos(id) ON DELETE RESTRICT,
  motivo       TEXT          NOT NULL,
  custo        NUMERIC(10,2),
  data_inicio  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  data_fim     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.manutencoes.data_fim IS 'NULL enquanto a manutenção está em andamento. Preenchido (com custo) quando o gestor remove o veículo da manutenção.';
COMMENT ON COLUMN public.manutencoes.custo    IS 'Preenchido só ao finalizar — quanto foi pago pelo serviço.';

CREATE INDEX idx_manutencoes_veiculo ON public.manutencoes(veiculo_id);

-- No máximo uma manutenção "aberta" (data_fim IS NULL) por veículo.
CREATE UNIQUE INDEX idx_manutencoes_aberta_unica
  ON public.manutencoes(veiculo_id)
  WHERE data_fim IS NULL;

-- Backfill: veículos já em manutenção no momento desta migration
-- ganham um registro aberto, pra "remover da manutenção" continuar
-- funcionando sem precisar saber a data real de início.
INSERT INTO public.manutencoes (veiculo_id, motivo, data_inicio, data_fim)
SELECT id, COALESCE(manutencao_motivo, 'Motivo não registrado'), NOW(), NULL
FROM public.veiculos
WHERE em_manutencao = true;

-- =============================================================
-- RLS — informação de custo é gestão interna, mesmo padrão de
-- vencimentos: só o gestor lê/escreve.
-- =============================================================

ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manutencoes: gestor ve todos"
  ON public.manutencoes FOR SELECT
  TO authenticated
  USING (public.papel_atual() = 'gestor');

CREATE POLICY "manutencoes: gestor cria"
  ON public.manutencoes FOR INSERT
  TO authenticated
  WITH CHECK (public.papel_atual() = 'gestor');

CREATE POLICY "manutencoes: gestor atualiza"
  ON public.manutencoes FOR UPDATE
  TO authenticated
  USING (public.papel_atual() = 'gestor')
  WITH CHECK (public.papel_atual() = 'gestor');

CREATE POLICY "manutencoes: gestor exclui"
  ON public.manutencoes FOR DELETE
  TO authenticated
  USING (public.papel_atual() = 'gestor');
