-- ── REMOVE A MAQUINARIA DE CONVITE ────────────────────────────────────────────
-- Substituída por "convidar = o posto cria a solicitação e envia a proposta".
-- Ordem: funções → coluna FK → tabela → enum.

DROP FUNCTION IF EXISTS public.aceitar_convite(uuid, uuid);
DROP FUNCTION IF EXISTS public.expire_convites();

-- Remove a FK antes de dropar a tabela referenciada
ALTER TABLE public.solicitacoes DROP COLUMN IF EXISTS convite_id;

DROP TABLE IF EXISTS public.convites;
DROP TYPE  IF EXISTS public.convite_status;

-- Mantidos de propósito:
--  • solicitacoes.origem ('empresa'|'posto') — ainda em uso (posto inicia).
--  • valores 'convite_recebido'/'convite_aceito'/'convite_recusado' em
--    notificacao_tipo — o Postgres não remove valores de enum sem recriar o
--    tipo; ficam inertes, sem impacto.
