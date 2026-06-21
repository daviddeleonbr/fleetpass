-- ── FRENTISTAS ────────────────────────────────────────────────────────────────
CREATE TABLE public.frentistas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id  UUID UNIQUE REFERENCES public.perfis(id) ON DELETE SET NULL,
  posto_id   UUID NOT NULL REFERENCES public.postos(id) ON DELETE CASCADE,
  nome       TEXT NOT NULL,
  email      TEXT,
  telefone   TEXT,
  status     public.status_ativo_inativo NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_frentistas_posto_id  ON public.frentistas(posto_id);
CREATE INDEX idx_frentistas_perfil_id ON public.frentistas(perfil_id);
ALTER TABLE public.frentistas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "frentistas: own read"     ON public.frentistas FOR SELECT USING (perfil_id = auth.uid());
CREATE POLICY "frentistas: posto manage" ON public.frentistas FOR ALL
  USING (posto_id IN (
    SELECT p.id FROM public.postos p
    JOIN public.contas_posto cp ON cp.id = p.conta_posto_id
    WHERE cp.perfil_id = auth.uid()
  ));
CREATE POLICY "frentistas: service role" ON public.frentistas FOR ALL USING (auth.role() = 'service_role');

-- ── MOTORISTAS ────────────────────────────────────────────────────────────────
CREATE TABLE public.motoristas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  cpf             TEXT,
  rg              TEXT,
  data_nascimento DATE,
  telefone        TEXT,
  email           TEXT,
  cnh_numero      TEXT,
  cnh_categoria   public.cnh_categoria,
  cnh_validade    DATE,
  vinculo         public.motorista_vinculo,
  matricula       TEXT,
  observacao      TEXT,
  status          public.motorista_status NOT NULL DEFAULT 'pendente',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_motoristas_empresa_id ON public.motoristas(empresa_id);
CREATE INDEX idx_motoristas_cpf        ON public.motoristas(cpf);
CREATE INDEX idx_motoristas_status     ON public.motoristas(status);
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "motoristas: empresa manage"     ON public.motoristas FOR ALL
  USING (empresa_id IN (SELECT id FROM public.empresas WHERE perfil_id = auth.uid()));
CREATE POLICY "motoristas: authenticated read" ON public.motoristas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "motoristas: service role"       ON public.motoristas FOR ALL USING (auth.role() = 'service_role');

-- ── VEICULOS ──────────────────────────────────────────────────────────────────
CREATE TABLE public.veiculos (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id           UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  placa                TEXT NOT NULL,
  modelo               TEXT NOT NULL DEFAULT '',
  combustivel          TEXT NOT NULL DEFAULT '',
  limite_mensal        NUMERIC(12,2),
  motorista_padrao_id  UUID REFERENCES public.motoristas(id) ON DELETE SET NULL,
  exigir_quilometragem BOOLEAN NOT NULL DEFAULT false,
  status               public.status_ativo_inativo NOT NULL DEFAULT 'ativo',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (empresa_id, placa),
  CONSTRAINT chk_placa_format CHECK (
    placa ~ '^[A-Z]{3}-[0-9]{4}$' OR placa ~ '^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{3}$'
  )
);
CREATE INDEX idx_veiculos_empresa_id ON public.veiculos(empresa_id);
CREATE INDEX idx_veiculos_placa      ON public.veiculos(placa);
CREATE INDEX idx_veiculos_status     ON public.veiculos(status);
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "veiculos: empresa manage"     ON public.veiculos FOR ALL
  USING (empresa_id IN (SELECT id FROM public.empresas WHERE perfil_id = auth.uid()));
CREATE POLICY "veiculos: authenticated read" ON public.veiculos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "veiculos: service role"       ON public.veiculos FOR ALL USING (auth.role() = 'service_role');
