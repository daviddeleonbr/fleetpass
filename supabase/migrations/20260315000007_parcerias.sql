-- ── SOLICITACOES (empresa → posto, pede parceria) ─────────────────────────────
CREATE TABLE public.solicitacoes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  posto_id        UUID NOT NULL REFERENCES public.postos(id)   ON DELETE CASCADE,
  combustiveis    TEXT[] NOT NULL DEFAULT '{}',
  volume_estimado TEXT,
  valor_estimado  NUMERIC(12,2),
  mensagem        TEXT,
  status          public.solicitacao_status NOT NULL DEFAULT 'aguardando',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_solicitacoes_empresa_id ON public.solicitacoes(empresa_id);
CREATE INDEX idx_solicitacoes_posto_id   ON public.solicitacoes(posto_id);
CREATE INDEX idx_solicitacoes_status     ON public.solicitacoes(status);
ALTER TABLE public.solicitacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "solicitacoes: empresa manage"      ON public.solicitacoes FOR ALL
  USING (empresa_id IN (SELECT id FROM public.empresas WHERE perfil_id = auth.uid()));
CREATE POLICY "solicitacoes: posto read"          ON public.solicitacoes FOR SELECT
  USING (posto_id IN (SELECT p.id FROM public.postos p JOIN public.contas_posto cp ON cp.id = p.conta_posto_id WHERE cp.perfil_id = auth.uid()));
CREATE POLICY "solicitacoes: posto update status" ON public.solicitacoes FOR UPDATE
  USING (posto_id IN (SELECT p.id FROM public.postos p JOIN public.contas_posto cp ON cp.id = p.conta_posto_id WHERE cp.perfil_id = auth.uid()));
CREATE POLICY "solicitacoes: service role"        ON public.solicitacoes FOR ALL USING (auth.role() = 'service_role');

-- ── PROPOSTAS (posto → empresa, resposta comercial) ───────────────────────────
CREATE TABLE public.propostas (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id          UUID NOT NULL REFERENCES public.solicitacoes(id) ON DELETE CASCADE,
  posto_id                UUID NOT NULL REFERENCES public.postos(id)       ON DELETE CASCADE,
  empresa_id              UUID NOT NULL REFERENCES public.empresas(id)     ON DELETE CASCADE,
  combustiveis            JSONB NOT NULL DEFAULT '[]',  -- [{tipo, ativo, modal_preco, valor, unidade}]
  ciclo_tipo              public.ciclo_tipo NOT NULL,
  ciclo_intervalo_dias    INTEGER,
  ciclo_prazo_recebimento INTEGER NOT NULL DEFAULT 5,
  limite_credito          NUMERIC(12,2),
  volume_minimo           NUMERIC(12,3),
  validade_dias           INTEGER NOT NULL DEFAULT 15 CHECK (validade_dias IN (7,15,30)),
  validade_ate            TIMESTAMPTZ NOT NULL,        -- set by trigger: created_at + validade_dias
  observacoes             TEXT,
  status                  public.proposta_status NOT NULL DEFAULT 'pendente',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_propostas_solicitacao_id ON public.propostas(solicitacao_id);
CREATE INDEX idx_propostas_empresa_id     ON public.propostas(empresa_id);
CREATE INDEX idx_propostas_posto_id       ON public.propostas(posto_id);
CREATE INDEX idx_propostas_status         ON public.propostas(status);
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "propostas: posto manage"         ON public.propostas FOR ALL
  USING (posto_id IN (SELECT p.id FROM public.postos p JOIN public.contas_posto cp ON cp.id = p.conta_posto_id WHERE cp.perfil_id = auth.uid()));
CREATE POLICY "propostas: empresa read"         ON public.propostas FOR SELECT
  USING (empresa_id IN (SELECT id FROM public.empresas WHERE perfil_id = auth.uid()));
CREATE POLICY "propostas: empresa update status" ON public.propostas FOR UPDATE
  USING (empresa_id IN (SELECT id FROM public.empresas WHERE perfil_id = auth.uid()))
  WITH CHECK (status IN ('aceita','rejeitada'));
CREATE POLICY "propostas: service role"         ON public.propostas FOR ALL USING (auth.role() = 'service_role');

-- ── PARCERIAS (relação ativa após aceite) ─────────────────────────────────────
CREATE TABLE public.parcerias (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id              UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  posto_id                UUID NOT NULL REFERENCES public.postos(id)   ON DELETE CASCADE,
  proposta_id             UUID NOT NULL UNIQUE REFERENCES public.propostas(id) ON DELETE RESTRICT,
  combustiveis            JSONB NOT NULL DEFAULT '[]',
  ciclo_tipo              public.ciclo_tipo NOT NULL,
  ciclo_intervalo_dias    INTEGER,
  ciclo_prazo_recebimento INTEGER NOT NULL DEFAULT 5,
  limite_credito          NUMERIC(12,2),
  volume_minimo           NUMERIC(12,3),
  status                  public.parceria_status NOT NULL DEFAULT 'ativa',
  iniciada_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  encerrada_em            TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Partial unique: apenas 1 ativa por par (empresa, posto); permite reativar após encerramento
CREATE UNIQUE INDEX uq_parceria_ativa ON public.parcerias(empresa_id, posto_id) WHERE status = 'ativa';
CREATE INDEX idx_parcerias_empresa_id ON public.parcerias(empresa_id);
CREATE INDEX idx_parcerias_posto_id   ON public.parcerias(posto_id);
CREATE INDEX idx_parcerias_status     ON public.parcerias(status);
ALTER TABLE public.parcerias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parcerias: empresa read" ON public.parcerias FOR SELECT
  USING (empresa_id IN (SELECT id FROM public.empresas WHERE perfil_id = auth.uid()));
CREATE POLICY "parcerias: posto read"   ON public.parcerias FOR SELECT
  USING (posto_id IN (SELECT p.id FROM public.postos p JOIN public.contas_posto cp ON cp.id = p.conta_posto_id WHERE cp.perfil_id = auth.uid()));
CREATE POLICY "parcerias: service role" ON public.parcerias FOR ALL USING (auth.role() = 'service_role');

-- ── CONTRATOS (contrato digital da parceria) ──────────────────────────────────
CREATE TABLE public.contratos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceria_id         UUID NOT NULL UNIQUE REFERENCES public.parcerias(id) ON DELETE CASCADE,
  empresa_id          UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  posto_id            UUID NOT NULL REFERENCES public.postos(id)   ON DELETE CASCADE,
  vigencia_inicio     DATE NOT NULL,
  vigencia_fim        DATE,
  auth_hash           TEXT,
  auth_ip             TEXT,
  auth_dispositivo    TEXT,
  auth_navegador      TEXT,
  auth_data           TIMESTAMPTZ,
  assinado_empresa_em TIMESTAMPTZ,
  assinado_posto_em   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_contratos_parceria_id ON public.contratos(parceria_id);
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contratos: empresa manage" ON public.contratos FOR ALL
  USING (empresa_id IN (SELECT id FROM public.empresas WHERE perfil_id = auth.uid()));
CREATE POLICY "contratos: posto manage"   ON public.contratos FOR ALL
  USING (posto_id IN (SELECT p.id FROM public.postos p JOIN public.contas_posto cp ON cp.id = p.conta_posto_id WHERE cp.perfil_id = auth.uid()));
CREATE POLICY "contratos: service role"   ON public.contratos FOR ALL USING (auth.role() = 'service_role');
