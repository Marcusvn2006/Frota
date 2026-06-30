-- =============================================================
-- MIGRATION 016 — Reenvia alerta semanalmente para vencimentos vencidos
--
-- Antes: o cron só consultava vencimentos com data_vencimento >= hoje,
-- então assim que a janela de "vence hoje" (dias_antes = 0) passava, o
-- item nunca mais era avisado por e-mail — mesmo continuando vencido e
-- sem solução por semanas (ex.: motorista dirigindo com CNH vencida).
--
-- Agora o cron também processa itens vencidos (data_vencimento < hoje)
-- não resolvidos, reenviando um lembrete a cada 7 dias de atraso
-- (dias_antes negativo e múltiplo de 7: -7, -14, -21, ...).
-- =============================================================

ALTER TABLE public.alertas_enviados
  DROP CONSTRAINT alertas_enviados_dias_antes_valido;

ALTER TABLE public.alertas_enviados
  ADD CONSTRAINT alertas_enviados_dias_antes_valido
  CHECK (
    dias_antes IN (30, 15, 7, 1, 0)
    OR (dias_antes < 0 AND dias_antes % 7 = 0)
  );
