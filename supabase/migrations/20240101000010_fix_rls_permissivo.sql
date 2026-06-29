-- =============================================================
-- MIGRATION 010 — Corrige RLS permissivo introduzido na 007
--
-- A 007 abriu UPDATE de checklists e checklist_itens com USING (true),
-- permitindo que QUALQUER funcionário autenticado editasse a vistoria
-- de QUALQUER reserva. Agora que reservas.motorista_id existe (008),
-- restringimos corretamente ao solicitante, ao motorista ou ao gestor.
-- =============================================================

-- ── Checklists: UPDATE restrito a envolvidos ─────────────────
DROP POLICY IF EXISTS "checklists: atualiza autenticado" ON public.checklists;

CREATE POLICY "checklists: atualiza envolvido"
  ON public.checklists FOR UPDATE
  TO authenticated
  USING (
    public.papel_atual() = 'gestor'
    OR EXISTS (
      SELECT 1 FROM public.reservas r
      WHERE r.id = reserva_id
        AND (r.solicitante_id = auth.uid() OR r.motorista_id = auth.uid())
    )
  );

-- ── Checklist itens: UPDATE restrito a envolvidos ────────────
DROP POLICY IF EXISTS "itens: atualiza autenticado" ON public.checklist_itens;

CREATE POLICY "itens: atualiza envolvido"
  ON public.checklist_itens FOR UPDATE
  TO authenticated
  USING (
    public.papel_atual() = 'gestor'
    OR EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.reservas r ON r.id = cl.reserva_id
      WHERE cl.id = checklist_id
        AND (r.solicitante_id = auth.uid() OR r.motorista_id = auth.uid())
    )
  );

-- ── Storage: upload inclui o motorista (não só o solicitante) ─
DROP POLICY IF EXISTS "storage: upload proprio checklist" ON storage.objects;

CREATE POLICY "storage: upload proprio checklist"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'fotos-vistoria'
    AND (
      public.papel_atual() = 'gestor'
      OR EXISTS (
        SELECT 1 FROM public.checklists cl
        JOIN public.reservas r ON r.id = cl.reserva_id
        WHERE cl.id::text = split_part(name, '/', 1)
          AND (r.solicitante_id = auth.uid() OR r.motorista_id = auth.uid())
          AND r.status IN ('aprovada', 'concluida')
      )
    )
  );

-- ── Revoga EXECUTE direto (via RPC) das funções de trigger ───
-- Não tocar papel_atual(): é usada dentro das políticas RLS.
REVOKE EXECUTE ON FUNCTION public.handle_new_user()          FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_checklist()     FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_item_reprovado()    FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_checklist_concluido() FROM anon, authenticated, public;
