-- =============================================================
-- MIGRATION 018 — Restringe leitura e criação de checklists a envolvidos
--
-- A migration 007 abriu SELECT e INSERT de checklists para "true"/
-- "qualquer reserva aprovada" (qualquer autenticado), para resolver o
-- caso de motorista de reserva criada pelo gestor não conseguir ver o
-- próprio checklist. A migration 010 reapertou apenas o UPDATE para
-- "envolvido" (gestor, solicitante ou motorista), mas deixou SELECT e
-- INSERT abertos:
--   - SELECT: qualquer funcionário podia ler km, litros e valor gasto
--     de qualquer reserva, não só a própria.
--   - INSERT: qualquer funcionário podia criar um checklist para a
--     reserva aprovada de outra pessoa (sem checar envolvimento),
--     o que ficaria ainda mais visível depois de restringir o SELECT
--     (a tela mostraria "Iniciar vistoria" para quem não tem relação
--     com a reserva, e o clique criaria um checklist indevido).
--
-- Agora SELECT e INSERT usam o mesmo critério de "envolvido" já
-- aplicado ao UPDATE na migration 010. As policies antigas e
-- redundantes de "gestor ve todos" são substituídas por uma única
-- policy por tabela/operação.
-- =============================================================

-- ── Checklists ───────────────────────────────────────────────

DROP POLICY IF EXISTS "checklists: leitura autenticada" ON public.checklists;
DROP POLICY IF EXISTS "checklists: gestor ve todos"      ON public.checklists;

CREATE POLICY "checklists: leitura envolvido"
  ON public.checklists FOR SELECT
  TO authenticated
  USING (
    public.papel_atual() = 'gestor'
    OR EXISTS (
      SELECT 1 FROM public.reservas r
      WHERE r.id = reserva_id
        AND (r.solicitante_id = auth.uid() OR r.motorista_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "checklists: cria para reserva aprovada" ON public.checklists;
DROP POLICY IF EXISTS "checklists: gestor cria qualquer"        ON public.checklists;

CREATE POLICY "checklists: cria envolvido"
  ON public.checklists FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reservas r
      WHERE r.id = reserva_id
        AND r.status = 'aprovada'
        AND (
          public.papel_atual() = 'gestor'
          OR r.solicitante_id = auth.uid()
          OR r.motorista_id = auth.uid()
        )
    )
  );

-- ── Checklist itens ──────────────────────────────────────────

DROP POLICY IF EXISTS "itens: leitura autenticada" ON public.checklist_itens;
DROP POLICY IF EXISTS "itens: gestor ve todos"      ON public.checklist_itens;

CREATE POLICY "itens: leitura envolvido"
  ON public.checklist_itens FOR SELECT
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
