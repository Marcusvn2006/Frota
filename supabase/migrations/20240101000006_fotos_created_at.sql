-- Adiciona created_at em fotos para ordenação na limpeza automática
ALTER TABLE public.fotos
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
