-- ── NEGOCIAÇÃO DE PROPOSTAS (chat + histórico de revisões) ────────────────────

-- 1) Novo status em solicitacoes: proposta pode entrar em negociação antes de aceita/rejeitada
ALTER TYPE public.solicitacao_status ADD VALUE IF NOT EXISTS 'em_negociacao' BEFORE 'aceita';

-- 2) Novo status em propostas: quando o posto envia revisão, a proposta anterior fica 'substituida'
ALTER TYPE public.proposta_status ADD VALUE IF NOT EXISTS 'substituida' AFTER 'rejeitada';

-- 3) Campo de versão em propostas (1 = original, 2, 3… = revisões)
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS versao INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_propostas_versao ON public.propostas(solicitacao_id, versao DESC);

-- 4) Tipos de evento no chat
CREATE TYPE public.parceria_mensagem_autor AS ENUM ('empresa','posto');
CREATE TYPE public.parceria_mensagem_tipo  AS ENUM (
  'mensagem',            -- texto livre entre as partes
  'proposta_enviada',    -- posto enviou primeira proposta
  'proposta_revisada',   -- posto enviou nova versão
  'proposta_recusada',   -- empresa recusou uma versão específica
  'proposta_aceita'      -- empresa aceitou uma versão (fim da negociação)
);

-- 5) Tabela de mensagens/eventos
CREATE TABLE public.parceria_mensagens (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  autor_tipo     public.parceria_mensagem_autor NOT NULL,
  autor_id       UUID NOT NULL,  -- empresa_id ou posto_id (validado em app)
  tipo           public.parceria_mensagem_tipo NOT NULL DEFAULT 'mensagem',
  conteudo       TEXT,
  proposta_id    UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
  lida_em        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_parceria_msg_solicitacao ON public.parceria_mensagens(solicitacao_id, created_at);
CREATE INDEX idx_parceria_msg_proposta    ON public.parceria_mensagens(proposta_id);

ALTER TABLE public.parceria_mensagens ENABLE ROW LEVEL SECURITY;

-- Empresa participante pode ler/escrever
CREATE POLICY "parceria_msg: empresa da solicitação"
  ON public.parceria_mensagens FOR ALL
  USING (
    solicitacao_id IN (
      SELECT s.id FROM public.solicitacoes s
      JOIN public.empresas e ON e.id = s.empresa_id
      WHERE e.perfil_id = auth.uid()
    )
  );

-- Posto participante pode ler/escrever
CREATE POLICY "parceria_msg: posto da solicitação"
  ON public.parceria_mensagens FOR ALL
  USING (
    solicitacao_id IN (
      SELECT s.id FROM public.solicitacoes s
      JOIN public.postos p     ON p.id = s.posto_id
      JOIN public.contas_posto cp ON cp.id = p.conta_posto_id
      WHERE cp.perfil_id = auth.uid()
    )
  );

CREATE POLICY "parceria_msg: service role"
  ON public.parceria_mensagens FOR ALL
  USING (auth.role() = 'service_role');
