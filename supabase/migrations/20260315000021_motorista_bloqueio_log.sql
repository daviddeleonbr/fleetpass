-- Bloqueio de motorista (separado do status ativo/pendente/inativo)
ALTER TABLE public.motoristas ADD COLUMN bloqueado BOOLEAN NOT NULL DEFAULT false;

-- Log geral de movimentações do motorista
CREATE TABLE public.motorista_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id UUID        NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  acao         TEXT        NOT NULL CHECK (acao IN ('cadastro','edicao','bloqueio','desbloqueio','inativacao','reativacao')),
  motivo       TEXT,                 -- obrigatório para bloqueio/desbloqueio/inativacao
  perfil_id    UUID        NOT NULL REFERENCES public.perfis(id) ON DELETE RESTRICT,
  perfil_nome  TEXT        NOT NULL,
  detalhes     JSONB,                -- campos alterados na edição, etc.
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_motorista_logs_motorista_id ON public.motorista_logs(motorista_id);
CREATE INDEX idx_motorista_logs_created_at   ON public.motorista_logs(created_at DESC);

ALTER TABLE public.motorista_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "motorista_logs: empresa manage" ON public.motorista_logs FOR ALL
  USING (motorista_id IN (
    SELECT m.id FROM public.motoristas m
    JOIN public.empresas e ON e.id = m.empresa_id
    WHERE e.perfil_id = auth.uid()
  ));

CREATE POLICY "motorista_logs: service role" ON public.motorista_logs FOR ALL
  USING (auth.role() = 'service_role');
