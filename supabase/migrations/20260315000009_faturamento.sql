-- ── FATURAMENTOS ──────────────────────────────────────────────────────────────
CREATE TABLE public.faturamentos (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero               TEXT NOT NULL UNIQUE DEFAULT '',  -- gerado por trigger: FAT-YYYY-NNN
  posto_id             UUID NOT NULL REFERENCES public.postos(id)     ON DELETE RESTRICT,
  empresa_id           UUID NOT NULL REFERENCES public.empresas(id)   ON DELETE CASCADE,
  parceria_id          UUID NOT NULL REFERENCES public.parcerias(id)  ON DELETE RESTRICT,
  periodo_inicio       DATE NOT NULL,
  periodo_fim          DATE NOT NULL,
  ciclo                TEXT NOT NULL DEFAULT '',
  desc_ciclo           TEXT NOT NULL DEFAULT '',
  data_faturamento     DATE NOT NULL,
  data_vencimento      DATE NOT NULL,
  total_abastecimentos INTEGER NOT NULL DEFAULT 0,
  total_litros         NUMERIC(12,3) NOT NULL DEFAULT 0,
  total_valor          NUMERIC(12,2) NOT NULL DEFAULT 0,
  status               public.faturamento_status NOT NULL DEFAULT 'pendente',
  pago_em              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.faturamento_counters (ano INTEGER PRIMARY KEY, seq INTEGER NOT NULL DEFAULT 0);
CREATE INDEX idx_faturamentos_posto_id   ON public.faturamentos(posto_id);
CREATE INDEX idx_faturamentos_empresa_id ON public.faturamentos(empresa_id);
CREATE INDEX idx_faturamentos_status     ON public.faturamentos(status);
ALTER TABLE public.faturamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faturamentos: posto manage" ON public.faturamentos FOR ALL
  USING (posto_id IN (SELECT p.id FROM public.postos p JOIN public.contas_posto cp ON cp.id = p.conta_posto_id WHERE cp.perfil_id = auth.uid()));
CREATE POLICY "faturamentos: empresa read" ON public.faturamentos FOR SELECT
  USING (empresa_id IN (SELECT id FROM public.empresas WHERE perfil_id = auth.uid()));
CREATE POLICY "faturamentos: service role" ON public.faturamentos FOR ALL USING (auth.role() = 'service_role');

-- ── FATURAMENTO_ABASTECIMENTOS (itens da fatura) ──────────────────────────────
CREATE TABLE public.faturamento_abastecimentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faturamento_id   UUID NOT NULL REFERENCES public.faturamentos(id)    ON DELETE CASCADE,
  abastecimento_id UUID NOT NULL REFERENCES public.abastecimentos(id)  ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (faturamento_id, abastecimento_id)
);
CREATE INDEX idx_fat_abast_faturamento_id   ON public.faturamento_abastecimentos(faturamento_id);
CREATE INDEX idx_fat_abast_abastecimento_id ON public.faturamento_abastecimentos(abastecimento_id);
ALTER TABLE public.faturamento_abastecimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fat_abast: posto manage" ON public.faturamento_abastecimentos FOR ALL
  USING (faturamento_id IN (
    SELECT f.id FROM public.faturamentos f JOIN public.postos p ON p.id = f.posto_id
    JOIN public.contas_posto cp ON cp.id = p.conta_posto_id WHERE cp.perfil_id = auth.uid()
  ));
CREATE POLICY "fat_abast: empresa read" ON public.faturamento_abastecimentos FOR SELECT
  USING (faturamento_id IN (
    SELECT id FROM public.faturamentos WHERE empresa_id IN (
      SELECT id FROM public.empresas WHERE perfil_id = auth.uid()
    )
  ));
CREATE POLICY "fat_abast: service role" ON public.faturamento_abastecimentos FOR ALL USING (auth.role() = 'service_role');

-- ── BOLETOS (cobranças Asaas por faturamento) ─────────────────────────────────
CREATE TABLE public.boletos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faturamento_id   UUID NOT NULL REFERENCES public.faturamentos(id) ON DELETE CASCADE,
  asaas_payment_id TEXT NOT NULL UNIQUE,
  status           TEXT NOT NULL DEFAULT 'PENDING',
  valor            NUMERIC(12,2) NOT NULL,
  vencimento       DATE NOT NULL,
  bank_slip_url    TEXT,
  bar_code         TEXT,
  invoice_url      TEXT,
  pago_em          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_boletos_faturamento_id   ON public.boletos(faturamento_id);
CREATE INDEX idx_boletos_asaas_payment_id ON public.boletos(asaas_payment_id);
ALTER TABLE public.boletos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boletos: posto manage" ON public.boletos FOR ALL
  USING (faturamento_id IN (
    SELECT f.id FROM public.faturamentos f JOIN public.postos p ON p.id = f.posto_id
    JOIN public.contas_posto cp ON cp.id = p.conta_posto_id WHERE cp.perfil_id = auth.uid()
  ));
CREATE POLICY "boletos: empresa read" ON public.boletos FOR SELECT
  USING (faturamento_id IN (
    SELECT id FROM public.faturamentos WHERE empresa_id IN (
      SELECT id FROM public.empresas WHERE perfil_id = auth.uid()
    )
  ));
CREATE POLICY "boletos: service role" ON public.boletos FOR ALL USING (auth.role() = 'service_role');
