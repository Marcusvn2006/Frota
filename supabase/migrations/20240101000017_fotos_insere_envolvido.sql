-- =============================================================
-- MIGRATION 017 — Restringe INSERT em fotos a quem está envolvido
--
-- A política "fotos: insere autenticado" (migration 007) só verificava
-- que o checklist_id existia, sem checar se o usuário tinha qualquer
-- relação com a reserva daquele checklist — diferente de checklists e
-- checklist_itens, que já foram restritos a "envolvido" na migration 010.
-- Qualquer funcionário autenticado podia inserir uma linha em fotos
-- apontando para o checklist de QUALQUER outra reserva.
--
-- Mesmo critério de "envolvido" já usado em checklists/checklist_itens:
-- gestor, ou solicitante/motorista da reserva dona do checklist.
-- =============================================================

DROP POLICY IF EXISTS "fotos: insere autenticado" ON public.fotos;

CREATE POLICY "fotos: insere envolvido"
  ON public.fotos FOR INSERT
  TO authenticated
  WITH CHECK (
    public.papel_atual() = 'gestor'
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.reservas r ON r.id = cl.reserva_id
      WHERE cl.id = checklist_id
        AND (r.solicitante_id = auth.uid() OR r.motorista_id = auth.uid())
    )
  );
