-- =============================================================
-- MIGRATION 005 — Security Fixes
-- =============================================================

-- 1. Habilita btree_gist para constraint de exclusão temporal
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Previne dupla reserva (TOCTOU) a nível de banco de dados.
--    Duas reservas APROVADAS para o mesmo veículo não podem ter períodos sobrepostos.
ALTER TABLE public.reservas
  ADD CONSTRAINT no_sobreposicao_reservas
  EXCLUDE USING gist (
    veiculo_id WITH =,
    tstzrange(inicio, fim, '[)') WITH &&
  )
  WHERE (status = 'aprovada' AND veiculo_id IS NOT NULL);

-- 3. Restringe leitura de usuarios:
--    - Funcionários só veem o próprio perfil (evita exposição de e-mails alheios)
--    - Gestor vê todos os perfis
DROP POLICY IF EXISTS "usuarios: leitura autenticada" ON public.usuarios;

CREATE POLICY "usuarios: leitura autenticada"
  ON public.usuarios FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.papel_atual() = 'gestor');

-- 4. Restringe upload no storage ao próprio checklist do solicitante.
--    O path deve começar com o UUID do checklist vinculado à reserva do usuário.
DROP POLICY IF EXISTS "storage: upload autenticado" ON storage.objects;

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
          AND r.solicitante_id = auth.uid()
          AND r.status = 'aprovada'
      )
    )
  );
