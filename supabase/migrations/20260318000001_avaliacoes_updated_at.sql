-- ── CORRIGE UPDATE EM avaliacoes ──────────────────────────────────────────────
-- `20260315000012_funcoes.sql` cria o trigger BEFORE UPDATE trg_avaliacoes_updated_at
-- (a tabela está na lista do loop), mas `20260315000011_avaliacoes.sql` criou
-- `avaliacoes` SEM a coluna `updated_at` — todas as outras tabelas da lista têm.
--
-- Efeito: todo UPDATE na tabela falhava com
--   42703: record "new" has no field "updated_at"
-- o que só apareceu agora, porque nenhuma rota escrevia em `avaliacoes` até a
-- Vitrine ganhar o fluxo de avaliação (POST /api/empresa/avaliacoes faz upsert).
--
-- Aditivo e reversível: ALTER TABLE public.avaliacoes DROP COLUMN updated_at;

-- O DEFAULT preenche as linhas existentes com o momento da migration. Não vale
-- tentar alinhá-las a created_at por UPDATE: o próprio trigger BEFORE UPDATE
-- sobrescreveria o valor com NOW() logo em seguida.
ALTER TABLE public.avaliacoes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
