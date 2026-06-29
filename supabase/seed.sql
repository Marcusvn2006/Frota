-- =============================================================
-- SEED — Dados iniciais
-- Execute APÓS aplicar as 3 migrations E após criar a conta
-- do gestor pelo fluxo normal de cadastro da aplicação.
-- =============================================================

-- =============================================================
-- PASSO 1 — Promover o gestor
-- Substitua 'gestor@empresa.com' pelo e-mail real e execute.
-- =============================================================

UPDATE public.usuarios
SET papel = 'gestor'
WHERE email = 'gestor@empresa.com';   -- ← altere aqui

-- Verifique:
-- SELECT id, nome, email, papel FROM public.usuarios;

-- =============================================================
-- PASSO 2 — Veículos iniciais (adapte à sua frota real)
-- =============================================================

INSERT INTO public.veiculos (modelo, cor, placa) VALUES
  ('Fiat Strada',      'Branca', 'ABC1D23'),
  ('Volkswagen Gol',   'Prata',  'DEF4G56'),
  ('Chevrolet Onix',   'Preta',  'GHI7J89')
ON CONFLICT (placa) DO NOTHING;

-- =============================================================
-- NOTAS
-- =============================================================
-- • Os 18 itens do checklist são inseridos automaticamente
--   pelo trigger on_checklist_created — nenhum seed necessário.
-- • O bucket de storage 'fotos-vistoria' é criado pela migration 002.
-- • Funcionários se cadastram normalmente pelo app; o papel
--   'funcionario' é atribuído automaticamente pelo trigger
--   on_auth_user_created.
