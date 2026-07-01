-- =============================================================
-- MIGRATION 019 — Endurecimento de privilégios e integridade
--
-- (1) CRÍTICO — Escalação de privilégio em usuarios.papel
--     A policy "usuarios: atualiza proprio" permite o usuário editar a
--     própria linha (id = auth.uid()), e a role `authenticated` tinha
--     GRANT UPDATE em TODAS as colunas de usuarios — inclusive `papel`.
--     Resultado: qualquer funcionário podia se auto-promover a gestor com
--     PATCH /rest/v1/usuarios?id=eq.<uid> {"papel":"gestor"}. O comentário
--     da migration 002 já dizia "somente campo nome", mas o grant a nível
--     de coluna nunca foi aplicado. Corrigido abaixo: revoga UPDATE amplo
--     e concede apenas na coluna `nome`.
--
-- (2) papel_atual() deixa de ser executável por anon/authenticated via
--     RPC (/rest/v1/rpc/papel_atual). A função continua sendo usada
--     dentro das policies RLS normalmente — a avaliação da policy não
--     depende do EXECUTE do chamador (advisor 0028/0029 do Supabase).
--
-- (3) Integridade: km de chegada nunca menor que o de saída, e litros/
--     valor de abastecimento não-negativos. NOT VALID para não falhar em
--     linhas históricas eventualmente inconsistentes; passa a valer para
--     todo INSERT/UPDATE novo.
--
-- (4) Índice em reservas.motorista_id — usado no filtro de
--     /minhas-reservas (.or(solicitante_id, motorista_id)).
-- =============================================================

-- (1) ── Escalação de privilégio: trava UPDATE de usuarios a `nome` ──
REVOKE UPDATE ON public.usuarios FROM authenticated;
GRANT  UPDATE (nome) ON public.usuarios TO authenticated;

-- (2) ── Remove execução direta de papel_atual() via API ──
REVOKE EXECUTE ON FUNCTION public.papel_atual() FROM anon, authenticated, public;

-- (3) ── Integridade de quilometragem e abastecimento ──
ALTER TABLE public.checklists
  ADD CONSTRAINT checklists_km_chegada_valido
  CHECK (km_chegada IS NULL OR km_saida IS NULL OR km_chegada >= km_saida)
  NOT VALID;

ALTER TABLE public.checklists
  ADD CONSTRAINT checklists_litros_nao_negativo
  CHECK (litros IS NULL OR litros >= 0)
  NOT VALID;

ALTER TABLE public.checklists
  ADD CONSTRAINT checklists_valor_nao_negativo
  CHECK (valor IS NULL OR valor >= 0)
  NOT VALID;

-- (4) ── Índice para o filtro por motorista ──
CREATE INDEX IF NOT EXISTS idx_reservas_motorista ON public.reservas(motorista_id);
