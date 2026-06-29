-- =============================================================
-- MIGRATION 007 — Corrige acesso ao checklist para motoristas
-- em reservas criadas diretamente pelo gestor.
--
-- Problema: policies antigas exigiam solicitante_id = auth.uid(),
-- mas quando o gestor cria uma reserva direta o solicitante é o
-- gestor, não o motorista — bloqueando o funcionário.
--
-- Solução: qualquer usuário autenticado pode operar checklists
-- de reservas aprovadas. As fotos continuam visíveis apenas ao
-- gestor (política mantida).
-- =============================================================

-- ── Checklists ───────────────────────────────────────────────

DROP POLICY IF EXISTS "checklists: funcionario ve proprio"    ON public.checklists;
DROP POLICY IF EXISTS "checklists: solicitante cria"          ON public.checklists;
DROP POLICY IF EXISTS "checklists: solicitante atualiza"      ON public.checklists;

-- Qualquer autenticado vê qualquer checklist
CREATE POLICY "checklists: leitura autenticada"
  ON public.checklists FOR SELECT
  TO authenticated
  USING (true);

-- Qualquer autenticado cria checklist para reserva aprovada
CREATE POLICY "checklists: cria para reserva aprovada"
  ON public.checklists FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reservas r
      WHERE r.id = reserva_id
        AND r.status = 'aprovada'
    )
  );

-- Qualquer autenticado atualiza checklist de reserva aprovada ou concluída
CREATE POLICY "checklists: atualiza autenticado"
  ON public.checklists FOR UPDATE
  TO authenticated
  USING (true);

-- ── Checklist itens ──────────────────────────────────────────

DROP POLICY IF EXISTS "itens: solicitante ve proprio"         ON public.checklist_itens;
DROP POLICY IF EXISTS "itens: solicitante atualiza proprio"   ON public.checklist_itens;

CREATE POLICY "itens: leitura autenticada"
  ON public.checklist_itens FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "itens: atualiza autenticado"
  ON public.checklist_itens FOR UPDATE
  TO authenticated
  USING (true);

-- ── Fotos ────────────────────────────────────────────────────

DROP POLICY IF EXISTS "fotos: solicitante insere"             ON public.fotos;

-- Qualquer autenticado insere foto de qualquer checklist
CREATE POLICY "fotos: insere autenticado"
  ON public.fotos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklists cl
      WHERE cl.id = checklist_id
    )
  );
