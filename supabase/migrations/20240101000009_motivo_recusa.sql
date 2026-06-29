-- Adiciona coluna de motivo de recusa em reservas
ALTER TABLE public.reservas ADD COLUMN IF NOT EXISTS motivo_recusa TEXT NULL;
