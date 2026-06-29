-- =============================================================
-- MIGRATION 008 — Adiciona motorista_id às reservas
--
-- Permite identificar o motorista por FK (UUID) em vez de texto,
-- resolvendo o problema de matching por nome na página Minhas Reservas.
-- =============================================================

ALTER TABLE public.reservas
  ADD COLUMN IF NOT EXISTS motorista_id UUID REFERENCES auth.users(id);

-- Backfill: reservas onde o solicitante é funcionário → motorista_id = solicitante_id
UPDATE public.reservas r
SET motorista_id = r.solicitante_id
WHERE r.motorista_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = r.solicitante_id
      AND u.papel = 'funcionario'
  );

-- Backfill: reservas criadas pelo gestor → tenta casar pelo nome exato
UPDATE public.reservas r
SET motorista_id = u.id
FROM public.usuarios u
WHERE r.motorista_id IS NULL
  AND r.motorista = u.nome;
