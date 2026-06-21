-- ── NOTIFICAÇÕES (inbox do usuário) ─────────────────────────────────────────

CREATE TYPE public.notificacao_tipo AS ENUM (
  'solicitacao_nova',
  'proposta_recebida',
  'proposta_revisada',
  'proposta_aceita',
  'proposta_rejeitada',
  'mensagem_negociacao',
  'contrato_pronto',
  'contrato_assinado_contraparte',
  'parceria_ativa',
  'parceria_suspensa',
  'parceria_encerrada'
);

CREATE TABLE public.notificacoes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id  UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
  tipo       public.notificacao_tipo NOT NULL,
  titulo     TEXT NOT NULL,
  descricao  TEXT,
  link       TEXT,
  lida_em    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notificacoes_perfil ON public.notificacoes(perfil_id, created_at DESC);
CREATE INDEX idx_notificacoes_nao_lidas ON public.notificacoes(perfil_id) WHERE lida_em IS NULL;

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notificacoes: dono lê"
  ON public.notificacoes FOR SELECT
  USING (perfil_id = auth.uid());

CREATE POLICY "notificacoes: dono marca como lida"
  ON public.notificacoes FOR UPDATE
  USING (perfil_id = auth.uid());

CREATE POLICY "notificacoes: service role"
  ON public.notificacoes FOR ALL
  USING (auth.role() = 'service_role');
