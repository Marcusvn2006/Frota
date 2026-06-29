-- =============================================================
-- MIGRATION 001 — Schema completo
-- Sistema de Reserva e Controle de Veículos
-- =============================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE public.papel AS ENUM ('gestor', 'funcionario');

CREATE TYPE public.status_reserva AS ENUM (
  'pendente',
  'aprovada',
  'recusada',
  'concluida'
);

CREATE TYPE public.origem_reserva AS ENUM ('solicitacao', 'gestor');

CREATE TYPE public.status_checklist AS ENUM ('em_andamento', 'concluido');

CREATE TYPE public.tipo_foto AS ENUM (
  'painel_saida',
  'painel_chegada',
  'cupom'
);

-- =============================================================
-- TABELAS
-- =============================================================

-- Tabela: usuarios
-- Perfil público sincronizado com auth.users via trigger.
CREATE TABLE public.usuarios (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome       TEXT        NOT NULL,
  email      TEXT        NOT NULL UNIQUE,
  papel      public.papel NOT NULL DEFAULT 'funcionario',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.usuarios IS 'Perfil de cada usuário autenticado; sincronizado automaticamente com auth.users.';

-- Tabela: veiculos
CREATE TABLE public.veiculos (
  id                UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  modelo            TEXT         NOT NULL,
  cor               TEXT         NOT NULL,
  placa             TEXT         NOT NULL UNIQUE,
  em_manutencao     BOOLEAN      NOT NULL DEFAULT FALSE,
  manutencao_motivo TEXT,        -- nulo quando não está em manutenção
  precisa_atencao   BOOLEAN      NOT NULL DEFAULT FALSE
);

COMMENT ON COLUMN public.veiculos.manutencao_motivo    IS 'Nulo quando em_manutencao = false.';
COMMENT ON COLUMN public.veiculos.precisa_atencao      IS 'Ativado automaticamente quando item de vistoria é reprovado; desativado pelo gestor.';

-- Tabela: reservas
CREATE TABLE public.reservas (
  id             UUID                  PRIMARY KEY DEFAULT uuid_generate_v4(),
  solicitante_id UUID                  NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  veiculo_id     UUID                  REFERENCES public.veiculos(id) ON DELETE RESTRICT,
  motorista      TEXT                  NOT NULL,
  inicio         TIMESTAMPTZ           NOT NULL,
  fim            TIMESTAMPTZ           NOT NULL,
  status         public.status_reserva NOT NULL DEFAULT 'pendente',
  origem         public.origem_reserva NOT NULL DEFAULT 'solicitacao',
  created_at     TIMESTAMPTZ           NOT NULL DEFAULT NOW(),

  CONSTRAINT reserva_fim_apos_inicio CHECK (fim > inicio)
);

COMMENT ON COLUMN public.reservas.veiculo_id IS 'Nulo enquanto pendente; preenchido pelo gestor ao aprovar.';
COMMENT ON COLUMN public.reservas.motorista  IS 'Texto livre — pode ser diferente do solicitante.';

-- Tabela: reserva_destinos
CREATE TABLE public.reserva_destinos (
  id         UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  reserva_id UUID    NOT NULL REFERENCES public.reservas(id) ON DELETE CASCADE,
  destino    TEXT    NOT NULL,
  ordem      INTEGER NOT NULL DEFAULT 1
);

-- Tabela: checklists
-- Uma por reserva (UNIQUE em reserva_id).
CREATE TABLE public.checklists (
  id           UUID                    PRIMARY KEY DEFAULT uuid_generate_v4(),
  reserva_id   UUID                    NOT NULL UNIQUE REFERENCES public.reservas(id) ON DELETE CASCADE,
  km_saida     NUMERIC(10,1),
  hora_saida   TIME,                   -- horário real de retirada (HH:MM)
  km_chegada   NUMERIC(10,1),
  hora_chegada TIME,                   -- horário real de devolução (HH:MM)
  abasteceu    BOOLEAN                 NOT NULL DEFAULT FALSE,
  litros       NUMERIC(6,2),           -- nulo quando abasteceu = false
  valor        NUMERIC(10,2),          -- nulo quando abasteceu = false; R$
  status       public.status_checklist NOT NULL DEFAULT 'em_andamento'
);

-- Tabela: checklist_itens
-- Os 18 itens são pré-populados automaticamente pelo trigger on_checklist_created.
CREATE TABLE public.checklist_itens (
  id           UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID    NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  item         TEXT    NOT NULL,
  ok           BOOLEAN NOT NULL DEFAULT TRUE,
  obs          TEXT
);

-- Tabela: fotos
-- Acesso de leitura restrito ao gestor (RLS + UI).
CREATE TABLE public.fotos (
  id           UUID             PRIMARY KEY DEFAULT uuid_generate_v4(),
  checklist_id UUID             NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  veiculo_id   UUID             NOT NULL REFERENCES public.veiculos(id) ON DELETE RESTRICT,
  tipo         public.tipo_foto NOT NULL,
  url          TEXT             NOT NULL,
  tirada_em    TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

-- =============================================================
-- ÍNDICES
-- =============================================================

CREATE INDEX idx_reservas_solicitante   ON public.reservas(solicitante_id);
CREATE INDEX idx_reservas_veiculo       ON public.reservas(veiculo_id);
CREATE INDEX idx_reservas_status        ON public.reservas(status);
CREATE INDEX idx_reservas_periodo       ON public.reservas(inicio, fim);
CREATE INDEX idx_destinos_reserva       ON public.reserva_destinos(reserva_id);
CREATE INDEX idx_checklists_reserva     ON public.checklists(reserva_id);
CREATE INDEX idx_itens_checklist        ON public.checklist_itens(checklist_id);
CREATE INDEX idx_fotos_checklist        ON public.fotos(checklist_id);
CREATE INDEX idx_fotos_veiculo          ON public.fotos(veiculo_id);
