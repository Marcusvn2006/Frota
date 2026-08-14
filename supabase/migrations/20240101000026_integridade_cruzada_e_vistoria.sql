-- =============================================================
-- MIGRATION 026 — Integridade cross-empresa + trava de vistoria
-- concluída
--
-- (1) Nenhuma tabela com FK "solta" (sem constraint de banco) valida
--     hoje que a entidade referenciada pertence à MESMA empresa da
--     linha que a referencia. Isso permite, por exemplo, um gestor
--     vincular uma multa a um motorista de outra empresa — e, pior,
--     a policy "multas: motorista ve proprio" não filtra por
--     empresa_id, então esse motorista passaria a enxergar a multa
--     (valor, descrição) de uma empresa que não é a dele. Mesmo
--     problema estrutural em vencimentos.entidade_id e em
--     reservas.veiculo_id/motorista_id.
--
--     Corrigido com triggers SECURITY DEFINER (mesmo padrão de
--     valida_entidade_vencimento, migration 013) que verificam
--     empresa_id da entidade referenciada contra a empresa_id da
--     própria linha, e reforço na policy de leitura de multas.
--
-- (2) Uma vistoria com checklist.status = 'concluido' continua
--     editável por quem participou dela (RLS não exige status
--     "em_andamento", e as actions de app também não checavam).
--     Isso permite adulterar km/combustível/itens depois que a
--     vistoria já serviu de registro/auditoria. Gestor mantém a
--     capacidade de corrigir (não há hoje outra forma de consertar
--     um erro de digitação); o envolvido (solicitante/motorista) só
--     edita enquanto o checklist não está concluído.
-- =============================================================

-- =============================================================
-- (1a) multas: veiculo_id e motorista_id da mesma empresa
-- =============================================================

CREATE OR REPLACE FUNCTION public.valida_empresa_multa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.veiculos WHERE id = NEW.veiculo_id AND empresa_id = NEW.empresa_id
  ) THEN
    RAISE EXCEPTION 'veiculo_id % não pertence à empresa da multa', NEW.veiculo_id;
  END IF;

  IF NEW.motorista_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.motoristas WHERE id = NEW.motorista_id AND empresa_id = NEW.empresa_id
  ) THEN
    RAISE EXCEPTION 'motorista_id % não pertence à empresa da multa', NEW.motorista_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Nome ordena depois de "on_multa_carimba_empresa" (migration 023) —
-- o carimbo de empresa_id precisa rodar primeiro para NEW.empresa_id
-- já estar preenchido quando esta validação executa.
CREATE TRIGGER on_multa_valida_empresa
  BEFORE INSERT OR UPDATE OF veiculo_id, motorista_id, empresa_id ON public.multas
  FOR EACH ROW EXECUTE FUNCTION public.valida_empresa_multa();

REVOKE EXECUTE ON FUNCTION public.valida_empresa_multa() FROM anon, authenticated, public;

-- Defesa em profundidade: mesmo que uma linha antiga fique
-- inconsistente por algum motivo, a leitura "motorista vê próprio"
-- passa a exigir também que a multa seja da empresa atual do usuário.
DROP POLICY IF EXISTS "multas: motorista ve proprio" ON public.multas;
CREATE POLICY "multas: motorista ve proprio"
  ON public.multas FOR SELECT
  TO authenticated
  USING (motorista_id = auth.uid() AND empresa_id = public.empresa_atual());

-- =============================================================
-- (1b) vencimentos: entidade_id (veículo/motorista) da mesma empresa
-- Estende a validação já existente (migration 013), que só checava
-- se o id existia — agora também checa a empresa.
-- =============================================================

CREATE OR REPLACE FUNCTION public.valida_entidade_vencimento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.entidade_tipo = 'veiculo' THEN
    IF NOT EXISTS (SELECT 1 FROM public.veiculos WHERE id = NEW.entidade_id) THEN
      RAISE EXCEPTION 'entidade_id % não corresponde a um veículo existente', NEW.entidade_id;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.veiculos WHERE id = NEW.entidade_id AND empresa_id = NEW.empresa_id
    ) THEN
      RAISE EXCEPTION 'veículo % não pertence à empresa do vencimento', NEW.entidade_id;
    END IF;
  ELSIF NEW.entidade_tipo = 'motorista' THEN
    IF NOT EXISTS (SELECT 1 FROM public.motoristas WHERE id = NEW.entidade_id) THEN
      RAISE EXCEPTION 'entidade_id % não corresponde a um motorista existente', NEW.entidade_id;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.motoristas WHERE id = NEW.entidade_id AND empresa_id = NEW.empresa_id
    ) THEN
      RAISE EXCEPTION 'motorista % não pertence à empresa do vencimento', NEW.entidade_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- =============================================================
-- (1c) reservas: veiculo_id e motorista_id da mesma empresa
-- =============================================================

CREATE OR REPLACE FUNCTION public.valida_empresa_reserva()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.veiculo_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.veiculos WHERE id = NEW.veiculo_id AND empresa_id = NEW.empresa_id
  ) THEN
    RAISE EXCEPTION 'veiculo_id % não pertence à empresa da reserva', NEW.veiculo_id;
  END IF;

  IF NEW.motorista_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.motoristas WHERE id = NEW.motorista_id AND empresa_id = NEW.empresa_id
  ) THEN
    RAISE EXCEPTION 'motorista_id % não pertence à empresa da reserva', NEW.motorista_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Nome ordena depois de "on_reserva_carimba_empresa" (migration 023),
-- mesma razão do trigger de multas acima.
CREATE TRIGGER on_reserva_valida_empresa
  BEFORE INSERT OR UPDATE OF veiculo_id, motorista_id, empresa_id ON public.reservas
  FOR EACH ROW EXECUTE FUNCTION public.valida_empresa_reserva();

REVOKE EXECUTE ON FUNCTION public.valida_empresa_reserva() FROM anon, authenticated, public;

-- =============================================================
-- (1d) empresas: gestor pode atualizar (rotacionar) o código da
-- própria empresa. Não existia nenhuma policy de UPDATE em empresas
-- até aqui — necessária para o gestor poder invalidar um código
-- vazado sem depender do service_role.
-- =============================================================

CREATE POLICY "empresas: gestor atualiza propria"
  ON public.empresas FOR UPDATE
  TO authenticated
  USING (id = public.empresa_atual() AND public.papel_atual() = 'gestor')
  WITH CHECK (id = public.empresa_atual() AND public.papel_atual() = 'gestor');

-- =============================================================
-- (2) Trava vistoria concluída: só gestor edita depois de concluída
-- =============================================================

DROP POLICY IF EXISTS "checklists: atualiza envolvido" ON public.checklists;
CREATE POLICY "checklists: atualiza envolvido"
  ON public.checklists FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.reservas r
    WHERE r.id = reserva_id
      AND r.empresa_id = public.empresa_atual()
      AND (
        public.papel_atual() = 'gestor'
        OR (
          checklists.status <> 'concluido'
          AND (r.solicitante_id = auth.uid() OR r.motorista_id = auth.uid())
        )
      )
  ));

DROP POLICY IF EXISTS "itens: atualiza envolvido" ON public.checklist_itens;
CREATE POLICY "itens: atualiza envolvido"
  ON public.checklist_itens FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.checklists cl
    JOIN public.reservas r ON r.id = cl.reserva_id
    WHERE cl.id = checklist_id
      AND r.empresa_id = public.empresa_atual()
      AND (
        public.papel_atual() = 'gestor'
        OR (
          cl.status <> 'concluido'
          AND (r.solicitante_id = auth.uid() OR r.motorista_id = auth.uid())
        )
      )
  ));
