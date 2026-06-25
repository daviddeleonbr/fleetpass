-- ── EXPIRAÇÃO DE CONVITES ─────────────────────────────────────────────────────
-- Marca convites pendentes vencidos como 'expirado'. Chamar via pg_cron ou
-- Edge Function, no mesmo padrão de expire_propostas/expire_requisicoes.
CREATE OR REPLACE FUNCTION public.expire_convites()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.convites SET status = 'expirado', updated_at = NOW()
  WHERE status = 'pendente' AND expira_em IS NOT NULL AND expira_em < NOW();
END; $$;

-- pg_cron (executar no Supabase SQL Editor, opcional):
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('expire-convites', '0 * * * *', $$ SELECT public.expire_convites(); $$);
