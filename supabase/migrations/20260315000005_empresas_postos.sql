-- ── EMPRESAS ──────────────────────────────────────────────────────────────────
CREATE TABLE public.empresas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id    UUID NOT NULL UNIQUE REFERENCES public.perfis(id) ON DELETE CASCADE,
  nome_empresa TEXT NOT NULL,
  cnpj         TEXT NOT NULL UNIQUE,
  segmento     public.empresa_segmento NOT NULL DEFAULT 'Outros',
  cidade       TEXT NOT NULL DEFAULT '',
  estado       CHAR(2) NOT NULL DEFAULT '',
  plano_id     TEXT REFERENCES public.planos(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_empresas_perfil_id ON public.empresas(perfil_id);
CREATE INDEX idx_empresas_cnpj      ON public.empresas(cnpj);
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "empresas: own write"          ON public.empresas FOR ALL    USING (perfil_id = auth.uid());
CREATE POLICY "empresas: authenticated read" ON public.empresas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "empresas: service role"       ON public.empresas FOR ALL    USING (auth.role() = 'service_role');

-- ── CONTAS_POSTO (dono da conta, gerencia múltiplos postos) ───────────────────
CREATE TABLE public.contas_posto (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id                  UUID NOT NULL UNIQUE REFERENCES public.perfis(id) ON DELETE CASCADE,
  plano_id                   TEXT NOT NULL REFERENCES public.planos(id) ON DELETE RESTRICT,
  stripe_customer_id         TEXT,
  stripe_subscription_id     TEXT,
  stripe_subscription_status public.stripe_subscription_status,
  assinatura_inicio          TIMESTAMPTZ,
  assinatura_fim             TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_contas_posto_perfil_id              ON public.contas_posto(perfil_id);
CREATE INDEX idx_contas_posto_stripe_customer_id     ON public.contas_posto(stripe_customer_id);
CREATE INDEX idx_contas_posto_stripe_subscription_id ON public.contas_posto(stripe_subscription_id);
ALTER TABLE public.contas_posto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contas_posto: own"          ON public.contas_posto FOR ALL USING (perfil_id = auth.uid());
CREATE POLICY "contas_posto: service role" ON public.contas_posto FOR ALL USING (auth.role() = 'service_role');

-- ── POSTOS (postos individuais) ───────────────────────────────────────────────
CREATE TABLE public.postos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_posto_id  UUID NOT NULL REFERENCES public.contas_posto(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  cnpj            TEXT NOT NULL UNIQUE,
  bandeira        public.posto_bandeira NOT NULL DEFAULT 'Independente',
  endereco        TEXT NOT NULL DEFAULT '',
  numero          TEXT NOT NULL DEFAULT '',
  complemento     TEXT,
  bairro          TEXT NOT NULL DEFAULT '',
  cidade          TEXT NOT NULL DEFAULT '',
  estado          CHAR(2) NOT NULL DEFAULT '',
  cep             TEXT NOT NULL DEFAULT '',
  lat             NUMERIC(10,7),
  lng             NUMERIC(10,7),
  telefone        TEXT,
  combustiveis    TEXT[] NOT NULL DEFAULT '{}',
  capacidade      TEXT,
  status          public.status_ativo_inativo NOT NULL DEFAULT 'ativo',
  asaas_id        TEXT,
  asaas_wallet_id TEXT,
  asaas_api_key   TEXT,   -- armazenar criptografado (pgcrypto ou base64 app-side)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_postos_conta_posto_id ON public.postos(conta_posto_id);
CREATE INDEX idx_postos_cnpj           ON public.postos(cnpj);
CREATE INDEX idx_postos_status         ON public.postos(status);
CREATE INDEX idx_postos_lat_lng        ON public.postos(lat, lng);
ALTER TABLE public.postos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "postos: owner manage" ON public.postos FOR ALL
  USING (conta_posto_id IN (SELECT id FROM public.contas_posto WHERE perfil_id = auth.uid()));
CREATE POLICY "postos: authenticated read active" ON public.postos FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'ativo');
CREATE POLICY "postos: service role" ON public.postos FOR ALL USING (auth.role() = 'service_role');
