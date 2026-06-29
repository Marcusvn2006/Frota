-- =============================================================
-- MIGRATION 004 — Políticas adicionais para checklist
-- Permite que o gestor inicie checklists de qualquer reserva
-- e atualize itens de qualquer checklist.
-- =============================================================

CREATE POLICY "checklists: gestor cria qualquer"
  ON public.checklists FOR INSERT
  TO authenticated
  WITH CHECK (public.papel_atual() = 'gestor');

CREATE POLICY "itens: gestor atualiza todos"
  ON public.checklist_itens FOR UPDATE
  TO authenticated
  USING (public.papel_atual() = 'gestor');
