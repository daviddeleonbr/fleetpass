-- ── REQUISICOES (autorizações de abastecimento) ───────────────────────────────
CREATE TABLE public.requisicoes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        TEXT NOT NULL UNIQUE DEFAULT '',   -- gerado por trigger: FL-XXX-XXXX
  empresa_id    UUID NOT NULL REFERENCES public.empresas(id)    ON DELETE CASCADE,
  veiculo_id    UUID NOT NULL REFERENCES public.veiculos(id)    ON DELETE RESTRICT,
  motorista_id  UUID REFERENCES public.motoristas(id)           ON DELETE SET NULL,
  parceria_id   UUID REFERENCES public.parcerias(id)            ON DELETE SET NULL,
  posto_id      UUID NOT NULL REFERENCES public.postos(id)      ON DELETE RESTRICT,
  combustivel   TEXT NOT NULL,
  tipo_limite   public.requisicao_tipo_limite NOT NULL DEFAULT 'valor',
  limite_valor  NUMERIC(12,2),
  limite_volume NUMERIC(12,3),
  validade      TIMESTAMPTZ NOT NULL,
  quilometragem INTEGER,
  observacao    TEXT,
  status        public.requisicao_status NOT NULL DEFAULT 'pendente',
  eh_livre      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_requisicao_limite CHECK (
    (tipo_limite = 'valor'  AND limite_valor  IS NOT NULL) OR
    (tipo_limite = 'volume' AND limite_volume IS NOT NULL) OR
    (tipo_limite = 'tanque')
  )
);
CREATE INDEX idx_requisicoes_empresa_id ON public.requisicoes(empresa_id);
CREATE INDEX idx_requisicoes_veiculo_id ON public.requisicoes(veiculo_id);
CREATE INDEX idx_requisicoes_posto_id   ON public.requisicoes(posto_id);
CREATE INDEX idx_requisicoes_status     ON public.requisicoes(status);
CREATE INDEX idx_requisicoes_codigo     ON public.requisicoes(codigo);
ALTER TABLE public.requisicoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requisicoes: empresa manage"          ON public.requisicoes FOR ALL
  USING (empresa_id IN (SELECT id FROM public.empresas WHERE perfil_id = auth.uid()));
CREATE POLICY "requisicoes: posto read"              ON public.requisicoes FOR SELECT
  USING (posto_id IN (SELECT p.id FROM public.postos p JOIN public.contas_posto cp ON cp.id = p.conta_posto_id WHERE cp.perfil_id = auth.uid()));
CREATE POLICY "requisicoes: frentista read"          ON public.requisicoes FOR SELECT
  USING (posto_id IN (SELECT posto_id FROM public.frentistas WHERE perfil_id = auth.uid()));
CREATE POLICY "requisicoes: frentista update status" ON public.requisicoes FOR UPDATE
  USING (posto_id IN (SELECT posto_id FROM public.frentistas WHERE perfil_id = auth.uid()))
  WITH CHECK (status IN ('ativo','concluido'));
CREATE POLICY "requisicoes: motorista read own"      ON public.requisicoes FOR SELECT
  USING (motorista_id IN (
    SELECT m.id FROM public.motoristas m
    JOIN public.perfis p ON p.email = m.email
    WHERE p.id = auth.uid() AND p.role = 'motorista'
  ));
CREATE POLICY "requisicoes: service role" ON public.requisicoes FOR ALL USING (auth.role() = 'service_role');

-- ── VALIDACOES (registro do abastecimento pelo frentista) ─────────────────────
CREATE TABLE public.validacoes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisicao_id  UUID NOT NULL UNIQUE REFERENCES public.requisicoes(id) ON DELETE RESTRICT,
  frentista_id   UUID REFERENCES public.frentistas(id) ON DELETE SET NULL,
  data_hora      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  litros         NUMERIC(12,3) NOT NULL,
  valor_cobrado  NUMERIC(12,2) NOT NULL,
  valor_unitario NUMERIC(8,4)  NOT NULL,
  hodometro      INTEGER,
  observacao     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_validacoes_requisicao_id ON public.validacoes(requisicao_id);
CREATE INDEX idx_validacoes_frentista_id  ON public.validacoes(frentista_id);
CREATE INDEX idx_validacoes_data_hora     ON public.validacoes(data_hora);
ALTER TABLE public.validacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "validacoes: frentista insert" ON public.validacoes FOR INSERT
  WITH CHECK (frentista_id IN (SELECT id FROM public.frentistas WHERE perfil_id = auth.uid()));
CREATE POLICY "validacoes: posto read"       ON public.validacoes FOR SELECT
  USING (requisicao_id IN (
    SELECT r.id FROM public.requisicoes r
    JOIN public.postos p ON p.id = r.posto_id
    JOIN public.contas_posto cp ON cp.id = p.conta_posto_id
    WHERE cp.perfil_id = auth.uid()
  ));
CREATE POLICY "validacoes: empresa read"     ON public.validacoes FOR SELECT
  USING (requisicao_id IN (
    SELECT id FROM public.requisicoes WHERE empresa_id IN (
      SELECT id FROM public.empresas WHERE perfil_id = auth.uid()
    )
  ));
CREATE POLICY "validacoes: service role"     ON public.validacoes FOR ALL USING (auth.role() = 'service_role');

-- ── ABASTECIMENTOS (registro final — criado automaticamente por trigger) ───────
CREATE TABLE public.abastecimentos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo         TEXT NOT NULL UNIQUE,
  empresa_id     UUID NOT NULL REFERENCES public.empresas(id)  ON DELETE CASCADE,
  posto_id       UUID NOT NULL REFERENCES public.postos(id)    ON DELETE RESTRICT,
  veiculo_id     UUID NOT NULL REFERENCES public.veiculos(id)  ON DELETE RESTRICT,
  motorista_id   UUID REFERENCES public.motoristas(id)         ON DELETE SET NULL,
  parceria_id    UUID REFERENCES public.parcerias(id)          ON DELETE SET NULL,
  requisicao_id  UUID REFERENCES public.requisicoes(id)        ON DELETE SET NULL,
  validacao_id   UUID REFERENCES public.validacoes(id)         ON DELETE SET NULL,
  data           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  combustivel    TEXT NOT NULL,
  litros         NUMERIC(12,3) NOT NULL,
  valor_unitario NUMERIC(8,4)  NOT NULL,
  valor          NUMERIC(12,2) NOT NULL,
  status         public.abastecimento_status NOT NULL DEFAULT 'pendente',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_abastecimentos_empresa_id  ON public.abastecimentos(empresa_id);
CREATE INDEX idx_abastecimentos_posto_id    ON public.abastecimentos(posto_id);
CREATE INDEX idx_abastecimentos_parceria_id ON public.abastecimentos(parceria_id);
CREATE INDEX idx_abastecimentos_data        ON public.abastecimentos(data);
CREATE INDEX idx_abastecimentos_status      ON public.abastecimentos(status);
CREATE INDEX idx_abastecimentos_codigo      ON public.abastecimentos(codigo);
ALTER TABLE public.abastecimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "abastecimentos: empresa read"   ON public.abastecimentos FOR SELECT
  USING (empresa_id IN (SELECT id FROM public.empresas WHERE perfil_id = auth.uid()));
CREATE POLICY "abastecimentos: posto read"     ON public.abastecimentos FOR SELECT
  USING (posto_id IN (SELECT p.id FROM public.postos p JOIN public.contas_posto cp ON cp.id = p.conta_posto_id WHERE cp.perfil_id = auth.uid()));
CREATE POLICY "abastecimentos: motorista read" ON public.abastecimentos FOR SELECT
  USING (motorista_id IN (
    SELECT m.id FROM public.motoristas m JOIN public.perfis p ON p.email = m.email
    WHERE p.id = auth.uid() AND p.role = 'motorista'
  ));
CREATE POLICY "abastecimentos: service role"   ON public.abastecimentos FOR ALL USING (auth.role() = 'service_role');
