-- =============================================================
-- MIGRATION 024 — Isolamento por empresa no RLS (Etapa 2 de 4)
--
-- Reescreve todas as políticas para filtrar por empresa_atual().
-- Depende da MIGRATION 023 (empresa_id nas raízes + empresa_atual()).
--
-- Enquanto houver apenas uma empresa, empresa_atual() devolve a
-- mesma empresa para todos, então o comportamento é idêntico ao de
-- hoje — o isolamento só passa a ter efeito quando existir a 2ª
-- empresa. Além do escopo por empresa, esta migration também corrige
-- vazamentos em que o papel 'gestor' via dados de QUALQUER empresa
-- (fotos, checklists, manutenções, storage) e remove policies de
-- gestor redundantes (dobradas dentro das de "envolvido").
--
-- Padrão adotado:
--   • Tabelas-raiz (têm empresa_id): AND empresa_id = empresa_atual()
--   • Tabelas-filhas (sem empresa_id): EXISTS na tabela-pai com
--     pai.empresa_id = empresa_atual()
--   • "Linha própria" (id = auth.uid() / usuario_id = auth.uid() /
--     motorista_id = auth.uid()) permanece — já é mais restrito que
--     a empresa e o próprio usuário sempre pertence à sua empresa.
-- =============================================================

-- ── empresas: usuário só enxerga a própria ───────────────────
DROP POLICY IF EXISTS "empresas: leitura autenticada" ON public.empresas;
CREATE POLICY "empresas: leitura propria"
  ON public.empresas FOR SELECT TO authenticated
  USING (id = public.empresa_atual());

-- ── usuarios: gestor só vê os da própria empresa ─────────────
DROP POLICY IF EXISTS "usuarios: leitura autenticada" ON public.usuarios;
CREATE POLICY "usuarios: leitura propria empresa"
  ON public.usuarios FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual())
  );
-- "usuarios: atualiza proprio" permanece: id = auth.uid(), e o grant
-- de coluna (migration 019) já limita a UPDATE de 'nome'.

-- ── veiculos ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "veiculos: leitura autenticada" ON public.veiculos;
CREATE POLICY "veiculos: leitura propria empresa"
  ON public.veiculos FOR SELECT TO authenticated
  USING (empresa_id = public.empresa_atual());

DROP POLICY IF EXISTS "veiculos: gestor cria" ON public.veiculos;
CREATE POLICY "veiculos: gestor cria"
  ON public.veiculos FOR INSERT TO authenticated
  WITH CHECK (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual());

DROP POLICY IF EXISTS "veiculos: gestor atualiza" ON public.veiculos;
CREATE POLICY "veiculos: gestor atualiza"
  ON public.veiculos FOR UPDATE TO authenticated
  USING (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual())
  WITH CHECK (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual());

DROP POLICY IF EXISTS "veiculos: gestor exclui" ON public.veiculos;
CREATE POLICY "veiculos: gestor exclui"
  ON public.veiculos FOR DELETE TO authenticated
  USING (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual());

-- ── reservas ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "reservas: leitura autenticada" ON public.reservas;
CREATE POLICY "reservas: leitura propria empresa"
  ON public.reservas FOR SELECT TO authenticated
  USING (empresa_id = public.empresa_atual());

DROP POLICY IF EXISTS "reservas: funcionario cria solicitacao" ON public.reservas;
CREATE POLICY "reservas: funcionario cria solicitacao"
  ON public.reservas FOR INSERT TO authenticated
  WITH CHECK (
    public.papel_atual() = 'funcionario'
    AND solicitante_id = auth.uid()
    AND status = 'pendente'
    AND origem = 'solicitacao'
    AND veiculo_id IS NULL
    AND empresa_id = public.empresa_atual()
  );

DROP POLICY IF EXISTS "reservas: gestor cria" ON public.reservas;
CREATE POLICY "reservas: gestor cria"
  ON public.reservas FOR INSERT TO authenticated
  WITH CHECK (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual());

DROP POLICY IF EXISTS "reservas: gestor atualiza" ON public.reservas;
CREATE POLICY "reservas: gestor atualiza"
  ON public.reservas FOR UPDATE TO authenticated
  USING (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual())
  WITH CHECK (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual());

DROP POLICY IF EXISTS "reservas: gestor exclui" ON public.reservas;
CREATE POLICY "reservas: gestor exclui"
  ON public.reservas FOR DELETE TO authenticated
  USING (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual());

-- ── reserva_destinos (escopo via reservas) ───────────────────
DROP POLICY IF EXISTS "destinos: leitura autenticada" ON public.reserva_destinos;
CREATE POLICY "destinos: leitura propria empresa"
  ON public.reserva_destinos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.reservas r
    WHERE r.id = reserva_id AND r.empresa_id = public.empresa_atual()
  ));

DROP POLICY IF EXISTS "destinos: funcionario insere propria reserva" ON public.reserva_destinos;
CREATE POLICY "destinos: funcionario insere propria reserva"
  ON public.reserva_destinos FOR INSERT TO authenticated
  WITH CHECK (
    public.papel_atual() = 'funcionario'
    AND EXISTS (
      SELECT 1 FROM public.reservas r
      WHERE r.id = reserva_id
        AND r.solicitante_id = auth.uid()
        AND r.empresa_id = public.empresa_atual()
    )
  );

DROP POLICY IF EXISTS "destinos: gestor insere" ON public.reserva_destinos;
CREATE POLICY "destinos: gestor insere"
  ON public.reserva_destinos FOR INSERT TO authenticated
  WITH CHECK (
    public.papel_atual() = 'gestor'
    AND EXISTS (
      SELECT 1 FROM public.reservas r
      WHERE r.id = reserva_id AND r.empresa_id = public.empresa_atual()
    )
  );

DROP POLICY IF EXISTS "destinos: gestor atualiza" ON public.reserva_destinos;
CREATE POLICY "destinos: gestor atualiza"
  ON public.reserva_destinos FOR UPDATE TO authenticated
  USING (
    public.papel_atual() = 'gestor'
    AND EXISTS (
      SELECT 1 FROM public.reservas r
      WHERE r.id = reserva_id AND r.empresa_id = public.empresa_atual()
    )
  );

DROP POLICY IF EXISTS "destinos: gestor exclui" ON public.reserva_destinos;
CREATE POLICY "destinos: gestor exclui"
  ON public.reserva_destinos FOR DELETE TO authenticated
  USING (
    public.papel_atual() = 'gestor'
    AND EXISTS (
      SELECT 1 FROM public.reservas r
      WHERE r.id = reserva_id AND r.empresa_id = public.empresa_atual()
    )
  );

-- ── checklists (escopo via reservas; gestor dobrado aqui) ─────
DROP POLICY IF EXISTS "checklists: leitura envolvido" ON public.checklists;
DROP POLICY IF EXISTS "checklists: gestor atualiza" ON public.checklists;
CREATE POLICY "checklists: leitura envolvido"
  ON public.checklists FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.reservas r
    WHERE r.id = reserva_id
      AND r.empresa_id = public.empresa_atual()
      AND (public.papel_atual() = 'gestor' OR r.solicitante_id = auth.uid() OR r.motorista_id = auth.uid())
  ));

DROP POLICY IF EXISTS "checklists: cria envolvido" ON public.checklists;
CREATE POLICY "checklists: cria envolvido"
  ON public.checklists FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.reservas r
    WHERE r.id = reserva_id
      AND r.status = 'aprovada'
      AND r.empresa_id = public.empresa_atual()
      AND (public.papel_atual() = 'gestor' OR r.solicitante_id = auth.uid() OR r.motorista_id = auth.uid())
  ));

DROP POLICY IF EXISTS "checklists: atualiza envolvido" ON public.checklists;
CREATE POLICY "checklists: atualiza envolvido"
  ON public.checklists FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.reservas r
    WHERE r.id = reserva_id
      AND r.empresa_id = public.empresa_atual()
      AND (public.papel_atual() = 'gestor' OR r.solicitante_id = auth.uid() OR r.motorista_id = auth.uid())
  ));

-- ── checklist_itens (escopo via checklists→reservas) ─────────
DROP POLICY IF EXISTS "itens: leitura envolvido" ON public.checklist_itens;
DROP POLICY IF EXISTS "itens: gestor atualiza todos" ON public.checklist_itens;
CREATE POLICY "itens: leitura envolvido"
  ON public.checklist_itens FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.checklists cl
    JOIN public.reservas r ON r.id = cl.reserva_id
    WHERE cl.id = checklist_id
      AND r.empresa_id = public.empresa_atual()
      AND (public.papel_atual() = 'gestor' OR r.solicitante_id = auth.uid() OR r.motorista_id = auth.uid())
  ));

DROP POLICY IF EXISTS "itens: atualiza envolvido" ON public.checklist_itens;
CREATE POLICY "itens: atualiza envolvido"
  ON public.checklist_itens FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.checklists cl
    JOIN public.reservas r ON r.id = cl.reserva_id
    WHERE cl.id = checklist_id
      AND r.empresa_id = public.empresa_atual()
      AND (public.papel_atual() = 'gestor' OR r.solicitante_id = auth.uid() OR r.motorista_id = auth.uid())
  ));

-- ── fotos (escopo via checklists→reservas) ───────────────────
-- SELECT: só gestor da empresa dona do checklist (antes: qualquer gestor).
DROP POLICY IF EXISTS "fotos: apenas gestor ve" ON public.fotos;
CREATE POLICY "fotos: gestor ve propria empresa"
  ON public.fotos FOR SELECT TO authenticated
  USING (
    public.papel_atual() = 'gestor'
    AND EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.reservas r ON r.id = cl.reserva_id
      WHERE cl.id = checklist_id AND r.empresa_id = public.empresa_atual()
    )
  );

-- INSERT: gestor (dobrado) ou envolvido, sempre da mesma empresa.
DROP POLICY IF EXISTS "fotos: insere envolvido" ON public.fotos;
DROP POLICY IF EXISTS "fotos: gestor insere" ON public.fotos;
CREATE POLICY "fotos: insere envolvido"
  ON public.fotos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.checklists cl
    JOIN public.reservas r ON r.id = cl.reserva_id
    WHERE cl.id = checklist_id
      AND r.empresa_id = public.empresa_atual()
      AND (public.papel_atual() = 'gestor' OR r.solicitante_id = auth.uid() OR r.motorista_id = auth.uid())
  ));

DROP POLICY IF EXISTS "fotos: gestor exclui" ON public.fotos;
CREATE POLICY "fotos: gestor exclui"
  ON public.fotos FOR DELETE TO authenticated
  USING (
    public.papel_atual() = 'gestor'
    AND EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.reservas r ON r.id = cl.reserva_id
      WHERE cl.id = checklist_id AND r.empresa_id = public.empresa_atual()
    )
  );

-- ── motoristas (têm empresa_id) ──────────────────────────────
DROP POLICY IF EXISTS "motoristas: gestor ve todos" ON public.motoristas;
CREATE POLICY "motoristas: gestor ve todos"
  ON public.motoristas FOR SELECT TO authenticated
  USING (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual());
-- "motoristas: usuario ve proprio" (usuario_id = auth.uid()) permanece.

DROP POLICY IF EXISTS "motoristas: gestor cria" ON public.motoristas;
CREATE POLICY "motoristas: gestor cria"
  ON public.motoristas FOR INSERT TO authenticated
  WITH CHECK (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual());

DROP POLICY IF EXISTS "motoristas: gestor atualiza" ON public.motoristas;
CREATE POLICY "motoristas: gestor atualiza"
  ON public.motoristas FOR UPDATE TO authenticated
  USING (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual())
  WITH CHECK (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual());
-- "motoristas: usuario atualiza proprio" (usuario_id = auth.uid()) permanece.

DROP POLICY IF EXISTS "motoristas: gestor exclui" ON public.motoristas;
CREATE POLICY "motoristas: gestor exclui"
  ON public.motoristas FOR DELETE TO authenticated
  USING (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual());

-- ── multas (têm empresa_id) ──────────────────────────────────
DROP POLICY IF EXISTS "multas: gestor ve todos" ON public.multas;
CREATE POLICY "multas: gestor ve todos"
  ON public.multas FOR SELECT TO authenticated
  USING (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual());
-- "multas: motorista ve proprio" (motorista_id = auth.uid()) permanece.

DROP POLICY IF EXISTS "multas: gestor cria" ON public.multas;
CREATE POLICY "multas: gestor cria"
  ON public.multas FOR INSERT TO authenticated
  WITH CHECK (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual());

DROP POLICY IF EXISTS "multas: gestor atualiza" ON public.multas;
CREATE POLICY "multas: gestor atualiza"
  ON public.multas FOR UPDATE TO authenticated
  USING (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual())
  WITH CHECK (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual());

DROP POLICY IF EXISTS "multas: gestor exclui" ON public.multas;
CREATE POLICY "multas: gestor exclui"
  ON public.multas FOR DELETE TO authenticated
  USING (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual());

-- ── vencimentos (têm empresa_id) ─────────────────────────────
DROP POLICY IF EXISTS "vencimentos: gestor ve todos" ON public.vencimentos;
CREATE POLICY "vencimentos: gestor ve todos"
  ON public.vencimentos FOR SELECT TO authenticated
  USING (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual());

DROP POLICY IF EXISTS "vencimentos: gestor cria" ON public.vencimentos;
CREATE POLICY "vencimentos: gestor cria"
  ON public.vencimentos FOR INSERT TO authenticated
  WITH CHECK (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual());

DROP POLICY IF EXISTS "vencimentos: gestor atualiza" ON public.vencimentos;
CREATE POLICY "vencimentos: gestor atualiza"
  ON public.vencimentos FOR UPDATE TO authenticated
  USING (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual())
  WITH CHECK (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual());

DROP POLICY IF EXISTS "vencimentos: gestor exclui" ON public.vencimentos;
CREATE POLICY "vencimentos: gestor exclui"
  ON public.vencimentos FOR DELETE TO authenticated
  USING (public.papel_atual() = 'gestor' AND empresa_id = public.empresa_atual());

-- ── alertas_enviados (escopo via vencimentos) ────────────────
DROP POLICY IF EXISTS "alertas_enviados: gestor ve" ON public.alertas_enviados;
CREATE POLICY "alertas_enviados: gestor ve"
  ON public.alertas_enviados FOR SELECT TO authenticated
  USING (
    public.papel_atual() = 'gestor'
    AND EXISTS (
      SELECT 1 FROM public.vencimentos v
      WHERE v.id = vencimento_id AND v.empresa_id = public.empresa_atual()
    )
  );

-- ── manutencoes (escopo via veiculos) ────────────────────────
DROP POLICY IF EXISTS "manutencoes: gestor ve todos" ON public.manutencoes;
CREATE POLICY "manutencoes: gestor ve todos"
  ON public.manutencoes FOR SELECT TO authenticated
  USING (
    public.papel_atual() = 'gestor'
    AND EXISTS (
      SELECT 1 FROM public.veiculos ve
      WHERE ve.id = veiculo_id AND ve.empresa_id = public.empresa_atual()
    )
  );

DROP POLICY IF EXISTS "manutencoes: gestor cria" ON public.manutencoes;
CREATE POLICY "manutencoes: gestor cria"
  ON public.manutencoes FOR INSERT TO authenticated
  WITH CHECK (
    public.papel_atual() = 'gestor'
    AND EXISTS (
      SELECT 1 FROM public.veiculos ve
      WHERE ve.id = veiculo_id AND ve.empresa_id = public.empresa_atual()
    )
  );

DROP POLICY IF EXISTS "manutencoes: gestor atualiza" ON public.manutencoes;
CREATE POLICY "manutencoes: gestor atualiza"
  ON public.manutencoes FOR UPDATE TO authenticated
  USING (
    public.papel_atual() = 'gestor'
    AND EXISTS (
      SELECT 1 FROM public.veiculos ve
      WHERE ve.id = veiculo_id AND ve.empresa_id = public.empresa_atual()
    )
  );

DROP POLICY IF EXISTS "manutencoes: gestor exclui" ON public.manutencoes;
CREATE POLICY "manutencoes: gestor exclui"
  ON public.manutencoes FOR DELETE TO authenticated
  USING (
    public.papel_atual() = 'gestor'
    AND EXISTS (
      SELECT 1 FROM public.veiculos ve
      WHERE ve.id = veiculo_id AND ve.empresa_id = public.empresa_atual()
    )
  );

-- ── storage.objects: fotos-vistoria escopado por empresa ─────
-- O nome do objeto começa com o UUID do checklist ("<checklistId>/..."),
-- então dá para chegar na empresa via checklists→reservas.
DROP POLICY IF EXISTS "storage: gestor ve fotos" ON storage.objects;
CREATE POLICY "storage: gestor ve fotos"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'fotos-vistoria'
    AND public.papel_atual() = 'gestor'
    AND EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.reservas r ON r.id = cl.reserva_id
      WHERE cl.id::text = split_part(name, '/', 1)
        AND r.empresa_id = public.empresa_atual()
    )
  );

DROP POLICY IF EXISTS "storage: upload proprio checklist" ON storage.objects;
CREATE POLICY "storage: upload proprio checklist"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'fotos-vistoria'
    AND EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.reservas r ON r.id = cl.reserva_id
      WHERE cl.id::text = split_part(name, '/', 1)
        AND r.empresa_id = public.empresa_atual()
        AND (
          public.papel_atual() = 'gestor'
          OR r.solicitante_id = auth.uid()
          OR r.motorista_id = auth.uid()
        )
        AND r.status IN ('aprovada', 'concluida')
    )
  );

DROP POLICY IF EXISTS "storage: gestor exclui arquivo" ON storage.objects;
CREATE POLICY "storage: gestor exclui arquivo"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'fotos-vistoria'
    AND public.papel_atual() = 'gestor'
    AND EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.reservas r ON r.id = cl.reserva_id
      WHERE cl.id::text = split_part(name, '/', 1)
        AND r.empresa_id = public.empresa_atual()
    )
  );
