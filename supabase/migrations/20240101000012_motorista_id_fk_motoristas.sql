-- =============================================================
-- MIGRATION 012 — reservas.motorista_id passa a referenciar motoristas
--
-- Antes: motorista_id → auth.users(id). Só funcionava para quem tinha
-- login no sistema, deixando terceirizados de fora.
--
-- Como motoristas.id é a mesma PK de usuarios/auth.users para quem tem
-- login (migration 011), todo valor de motorista_id hoje válido continua
-- válido sob a nova FK — sem necessidade de tocar dados em reservas e
-- sem qualquer mudança nas políticas de RLS ou queries que comparam
-- motorista_id com auth.uid() (migrations 008 e 010).
-- =============================================================

ALTER TABLE public.reservas
  DROP CONSTRAINT reservas_motorista_id_fkey;

ALTER TABLE public.reservas
  ADD CONSTRAINT reservas_motorista_id_fkey
  FOREIGN KEY (motorista_id) REFERENCES public.motoristas(id);
