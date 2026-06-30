-- =============================================================
-- MIGRATION 015 — Permite que o próprio motorista atualize sua CNH
--
-- A política anterior só deixava o gestor fazer UPDATE em motoristas.
-- Agora o usuário logado pode atualizar a própria linha (campos de CNH),
-- desde que o usuario_id coincida com auth.uid().
-- =============================================================

CREATE POLICY "motoristas: usuario atualiza proprio"
  ON public.motoristas FOR UPDATE
  TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());
