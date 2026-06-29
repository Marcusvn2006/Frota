-- =============================================================
-- MIGRATION 002 — Row Level Security (RLS)
-- =============================================================

-- =============================================================
-- FUNÇÃO AUXILIAR — papel do usuário autenticado
-- SECURITY DEFINER: roda como o owner da função (postgres),
-- evitando recursão infinita quando chamada dentro de políticas RLS.
-- =============================================================

CREATE OR REPLACE FUNCTION public.papel_atual()
RETURNS public.papel
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN (SELECT papel FROM public.usuarios WHERE id = auth.uid());
END;
$$;

-- =============================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =============================================================

ALTER TABLE public.usuarios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reserva_destinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fotos           ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- POLÍTICAS: usuarios
-- =============================================================

-- Qualquer usuário autenticado pode ver todos os perfis
-- (necessário para o calendário mostrar nomes de reservas)
CREATE POLICY "usuarios: leitura autenticada"
  ON public.usuarios FOR SELECT
  TO authenticated
  USING (true);

-- Cada usuário só atualiza o próprio perfil (somente campo nome)
CREATE POLICY "usuarios: atualiza proprio"
  ON public.usuarios FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =============================================================
-- POLÍTICAS: veiculos
-- =============================================================

-- Todos os autenticados veem veículos (necessário para agendar e calendário)
CREATE POLICY "veiculos: leitura autenticada"
  ON public.veiculos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "veiculos: gestor cria"
  ON public.veiculos FOR INSERT
  TO authenticated
  WITH CHECK (papel_atual() = 'gestor');

CREATE POLICY "veiculos: gestor atualiza"
  ON public.veiculos FOR UPDATE
  TO authenticated
  USING  (papel_atual() = 'gestor')
  WITH CHECK (papel_atual() = 'gestor');

CREATE POLICY "veiculos: gestor exclui"
  ON public.veiculos FOR DELETE
  TO authenticated
  USING (papel_atual() = 'gestor');

-- =============================================================
-- POLÍTICAS: reservas
-- =============================================================

-- Todos veem todas as reservas (calendário visível a todos)
CREATE POLICY "reservas: leitura autenticada"
  ON public.reservas FOR SELECT
  TO authenticated
  USING (true);

-- Funcionário cria apenas a própria solicitação (sem atribuir carro)
CREATE POLICY "reservas: funcionario cria solicitacao"
  ON public.reservas FOR INSERT
  TO authenticated
  WITH CHECK (
    papel_atual() = 'funcionario'
    AND solicitante_id = auth.uid()
    AND status = 'pendente'
    AND origem = 'solicitacao'
    AND veiculo_id IS NULL
  );

-- Gestor cria reserva direta para qualquer pessoa, carro já definido
CREATE POLICY "reservas: gestor cria"
  ON public.reservas FOR INSERT
  TO authenticated
  WITH CHECK (papel_atual() = 'gestor');

-- Apenas o gestor aprova, recusa, altera ou cancela reservas
CREATE POLICY "reservas: gestor atualiza"
  ON public.reservas FOR UPDATE
  TO authenticated
  USING  (papel_atual() = 'gestor')
  WITH CHECK (papel_atual() = 'gestor');

CREATE POLICY "reservas: gestor exclui"
  ON public.reservas FOR DELETE
  TO authenticated
  USING (papel_atual() = 'gestor');

-- =============================================================
-- POLÍTICAS: reserva_destinos
-- =============================================================

-- Todos veem destinos (exibidos no calendário e na tela de reservas)
CREATE POLICY "destinos: leitura autenticada"
  ON public.reserva_destinos FOR SELECT
  TO authenticated
  USING (true);

-- Funcionário insere destinos da própria reserva
CREATE POLICY "destinos: funcionario insere propria reserva"
  ON public.reserva_destinos FOR INSERT
  TO authenticated
  WITH CHECK (
    papel_atual() = 'funcionario'
    AND EXISTS (
      SELECT 1 FROM public.reservas r
      WHERE r.id = reserva_id AND r.solicitante_id = auth.uid()
    )
  );

-- Gestor insere destinos em qualquer reserva
CREATE POLICY "destinos: gestor insere"
  ON public.reserva_destinos FOR INSERT
  TO authenticated
  WITH CHECK (papel_atual() = 'gestor');

CREATE POLICY "destinos: gestor atualiza"
  ON public.reserva_destinos FOR UPDATE
  TO authenticated
  USING (papel_atual() = 'gestor');

CREATE POLICY "destinos: gestor exclui"
  ON public.reserva_destinos FOR DELETE
  TO authenticated
  USING (papel_atual() = 'gestor');

-- =============================================================
-- POLÍTICAS: checklists
-- =============================================================

-- Gestor vê todos
CREATE POLICY "checklists: gestor ve todos"
  ON public.checklists FOR SELECT
  TO authenticated
  USING (papel_atual() = 'gestor');

-- Funcionário vê apenas o checklist da própria reserva
CREATE POLICY "checklists: funcionario ve proprio"
  ON public.checklists FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reservas r
      WHERE r.id = reserva_id AND r.solicitante_id = auth.uid()
    )
  );

-- Solicitante da reserva aprovada cria o checklist (inclui gestor se for o solicitante)
CREATE POLICY "checklists: solicitante cria"
  ON public.checklists FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reservas r
      WHERE r.id = reserva_id
        AND r.solicitante_id = auth.uid()
        AND r.status = 'aprovada'
    )
  );

-- Solicitante atualiza (preenche km/hora saída, itens, devolução)
CREATE POLICY "checklists: solicitante atualiza"
  ON public.checklists FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reservas r
      WHERE r.id = reserva_id AND r.solicitante_id = auth.uid()
    )
  );

-- Gestor atualiza qualquer checklist
CREATE POLICY "checklists: gestor atualiza"
  ON public.checklists FOR UPDATE
  TO authenticated
  USING (papel_atual() = 'gestor');

-- =============================================================
-- POLÍTICAS: checklist_itens
-- =============================================================
-- INSERT é feito exclusivamente pelo trigger SECURITY DEFINER (handle_new_checklist).
-- Funcionário não precisa de política INSERT aqui.

CREATE POLICY "itens: gestor ve todos"
  ON public.checklist_itens FOR SELECT
  TO authenticated
  USING (papel_atual() = 'gestor');

-- Funcionário vê itens do próprio checklist
CREATE POLICY "itens: solicitante ve proprio"
  ON public.checklist_itens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.reservas r ON r.id = cl.reserva_id
      WHERE cl.id = checklist_id AND r.solicitante_id = auth.uid()
    )
  );

-- Funcionário atualiza itens do próprio checklist (marca ok/não-ok, obs)
CREATE POLICY "itens: solicitante atualiza proprio"
  ON public.checklist_itens FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.reservas r ON r.id = cl.reserva_id
      WHERE cl.id = checklist_id AND r.solicitante_id = auth.uid()
    )
  );

-- =============================================================
-- POLÍTICAS: fotos (GALERIA RESTRITA AO GESTOR)
-- =============================================================

-- Apenas gestor pode ver registros de fotos
CREATE POLICY "fotos: apenas gestor ve"
  ON public.fotos FOR SELECT
  TO authenticated
  USING (papel_atual() = 'gestor');

-- Solicitante pode inserir foto do próprio checklist (sem leitura posterior)
CREATE POLICY "fotos: solicitante insere"
  ON public.fotos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.reservas r ON r.id = cl.reserva_id
      WHERE cl.id = checklist_id AND r.solicitante_id = auth.uid()
    )
  );

-- Gestor também pode inserir fotos (se necessário)
CREATE POLICY "fotos: gestor insere"
  ON public.fotos FOR INSERT
  TO authenticated
  WITH CHECK (papel_atual() = 'gestor');

CREATE POLICY "fotos: gestor exclui"
  ON public.fotos FOR DELETE
  TO authenticated
  USING (papel_atual() = 'gestor');

-- =============================================================
-- STORAGE: bucket fotos-vistoria
-- =============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fotos-vistoria',
  'fotos-vistoria',
  false,          -- bucket privado
  10485760,       -- 10 MB por arquivo
  ARRAY['image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Apenas gestor lista/lê arquivos do bucket
CREATE POLICY "storage: gestor ve fotos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'fotos-vistoria'
    AND public.papel_atual() = 'gestor'
  );

-- Usuário autenticado pode fazer upload
CREATE POLICY "storage: upload autenticado"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'fotos-vistoria');

-- Apenas gestor pode excluir arquivos do bucket
CREATE POLICY "storage: gestor exclui arquivo"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'fotos-vistoria'
    AND public.papel_atual() = 'gestor'
  );
