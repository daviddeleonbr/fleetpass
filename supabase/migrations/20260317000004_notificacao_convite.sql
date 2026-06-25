-- ── NOTIFICAÇÕES: tipos de convite ────────────────────────────────────────────
-- ADD VALUE deve ficar em transação própria e não pode ser usado no mesmo
-- comando — aqui só declaramos os valores; o uso fica nas rotas de API.

ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'convite_recebido';
ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'convite_aceito';
ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'convite_recusado';
