-- =============================================================
-- MIGRATION 014 — Datas de vencimento no cadastro de veículo
--
-- IPVA, licenciamento, revisão e seguro ficam como colunas em veiculos
-- (fonte de verdade editável na tela de cadastro), espelhadas em
-- vencimentos (entidade_tipo='veiculo') pela própria action de edição via
-- UPSERT — mesmo padrão usado para motoristas.cnh_validade.
-- =============================================================

ALTER TABLE public.veiculos
  ADD COLUMN ipva_validade         DATE,
  ADD COLUMN licenciamento_validade DATE,
  ADD COLUMN revisao_validade      DATE,
  ADD COLUMN seguro_validade       DATE;
