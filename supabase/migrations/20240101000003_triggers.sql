-- =============================================================
-- MIGRATION 003 — Triggers e funções de automação
-- =============================================================

-- =============================================================
-- TRIGGER 1: Sincroniza auth.users → public.usuarios no cadastro
-- Ao criar conta, cria o perfil público como 'funcionario'.
-- O gestor é promovido manualmente via seed.sql após o cadastro.
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.usuarios (id, nome, email, papel)
  VALUES (
    NEW.id,
    -- Usa o campo 'nome' dos metadados do cadastro, ou extrai do e-mail
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'nome'), ''),
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    'funcionario'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- TRIGGER 2: Pré-popula os 18 itens fixos ao criar um checklist
-- Ao INSERT em checklists, insere automaticamente as 18 linhas
-- em checklist_itens (ok = true por padrão).
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_new_checklist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.checklist_itens (checklist_id, item, ok, obs)
  VALUES
    (NEW.id, 'Abastecido',               true, NULL),
    (NEW.id, 'Pneus calibrados (32 lbs)', true, NULL),
    (NEW.id, 'Lataria amassada',          true, NULL),
    (NEW.id, 'Sujo',                      true, NULL),
    (NEW.id, 'Limpadores funcionando',    true, NULL),
    (NEW.id, 'Seta funcionando',          true, NULL),
    (NEW.id, 'Farol baixo',               true, NULL),
    (NEW.id, 'Pisca',                     true, NULL),
    (NEW.id, 'Vidros funcionando',        true, NULL),
    (NEW.id, 'Interior limpo',            true, NULL),
    (NEW.id, 'Em bom estado',             true, NULL),
    (NEW.id, 'Arranhada',                 true, NULL),
    (NEW.id, 'Vidros trincados',          true, NULL),
    (NEW.id, 'Retrovisor danificado',     true, NULL),
    (NEW.id, 'Luz de ré',                 true, NULL),
    (NEW.id, 'Farol alto',                true, NULL),
    (NEW.id, 'Lanterna',                  true, NULL),
    (NEW.id, 'Ar-condicionado',           true, NULL);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_checklist_created
  AFTER INSERT ON public.checklists
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_checklist();

-- =============================================================
-- TRIGGER 3: Ativa precisa_atencao no veículo quando item ok=false
-- Dispara após INSERT ou UPDATE em checklist_itens.
-- Obtém o veiculo_id via: checklist_itens → checklists → reservas → veiculo_id
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_item_reprovado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _veiculo_id UUID;
BEGIN
  -- Só age quando ok muda de true/null para false
  IF NEW.ok = false AND (OLD IS NULL OR OLD.ok IS DISTINCT FROM false) THEN
    SELECT r.veiculo_id INTO _veiculo_id
    FROM public.checklists cl
    JOIN public.reservas r ON r.id = cl.reserva_id
    WHERE cl.id = NEW.checklist_id
      AND r.veiculo_id IS NOT NULL;

    IF FOUND AND _veiculo_id IS NOT NULL THEN
      UPDATE public.veiculos
      SET precisa_atencao = true
      WHERE id = _veiculo_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_checklist_item_reprovado
  AFTER INSERT OR UPDATE OF ok ON public.checklist_itens
  FOR EACH ROW EXECUTE FUNCTION public.handle_item_reprovado();

-- =============================================================
-- TRIGGER 4: Muda reserva para 'concluida' quando checklist é concluído
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_checklist_concluido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'concluido' AND OLD.status = 'em_andamento' THEN
    UPDATE public.reservas
    SET status = 'concluida'
    WHERE id = NEW.reserva_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_checklist_concluido
  AFTER UPDATE OF status ON public.checklists
  FOR EACH ROW EXECUTE FUNCTION public.handle_checklist_concluido();
