-- ── MODELO DE COBRANÇA: plano único, valor por CNPJ (posto) cadastrado ────────
-- Substitui os tiers (Starter/Profissional/Rede/Enterprise) por um único plano.
-- A cobrança no Stripe passa a ser por quantidade = nº de CNPJs/postos da conta.
-- Não há mais teto de postos por plano.

-- 1. Plano único 'padrao' (alvo do FK contas_posto.plano_id). max_postos NULL = sem teto.
INSERT INTO public.planos (id, nome, preco_mensal, max_postos, stripe_price_id, ativo, features)
VALUES (
  'padrao',
  'FuelLink',
  49.90,
  NULL,
  '',
  true,
  '["Cobrança por CNPJ cadastrado","Postos ilimitados","Requisições ilimitadas","QR Code e validação","Relatórios e histórico"]'
)
ON CONFLICT (id) DO UPDATE SET
  nome         = EXCLUDED.nome,
  preco_mensal = EXCLUDED.preco_mensal,
  max_postos   = EXCLUDED.max_postos,
  ativo        = true,
  features     = EXCLUDED.features,
  updated_at   = NOW();

-- 2. Desativa os planos antigos (mantém as linhas por integridade referencial
--    de contas que ainda apontam para eles; não dá para apagar por causa do FK).
UPDATE public.planos
SET ativo = false, updated_at = NOW()
WHERE id IN ('starter', 'profissional', 'rede', 'enterprise');

-- 3. Remove o teto de postos por plano — agora paga-se por CNPJ, sem limite.
DROP TRIGGER IF EXISTS trg_postos_check_plano ON public.postos;
DROP FUNCTION IF EXISTS public.check_plano_max_postos();
