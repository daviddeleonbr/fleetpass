-- ── LIBERACOES (abastecimento livre por parceria) ─────────────────────────────
CREATE TABLE public.liberacoes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceria_id           UUID NOT NULL UNIQUE REFERENCES public.parcerias(id) ON DELETE CASCADE,
  ativa                 BOOLEAN NOT NULL DEFAULT false,
  veiculos_config       public.liberacao_veiculos_config NOT NULL DEFAULT 'todos',
  usar_limite_por_abast BOOLEAN NOT NULL DEFAULT false,
  limite_tipo           public.liberacao_limite_tipo,
  limite_por_abast      NUMERIC(12,2),
  usar_limite_mensal    BOOLEAN NOT NULL DEFAULT false,
  limite_mensal         NUMERIC(12,2),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_lib_limite_abast  CHECK (NOT usar_limite_por_abast  OR (limite_tipo IS NOT NULL AND limite_por_abast IS NOT NULL)),
  CONSTRAINT chk_lib_limite_mensal CHECK (NOT usar_limite_mensal      OR limite_mensal IS NOT NULL)
);
CREATE INDEX idx_liberacoes_parceria_id ON public.liberacoes(parceria_id);
ALTER TABLE public.liberacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "liberacoes: posto manage" ON public.liberacoes FOR ALL
  USING (parceria_id IN (
    SELECT pa.id FROM public.parcerias pa JOIN public.postos p ON p.id = pa.posto_id
    JOIN public.contas_posto cp ON cp.id = p.conta_posto_id WHERE cp.perfil_id = auth.uid()
  ));
CREATE POLICY "liberacoes: empresa read" ON public.liberacoes FOR SELECT
  USING (parceria_id IN (
    SELECT id FROM public.parcerias WHERE empresa_id IN (
      SELECT id FROM public.empresas WHERE perfil_id = auth.uid()
    )
  ));
CREATE POLICY "liberacoes: service role" ON public.liberacoes FOR ALL USING (auth.role() = 'service_role');

-- ── LIBERACAO_VEICULOS (veículos selecionados quando config = 'selecionados') ──
CREATE TABLE public.liberacao_veiculos (
  liberacao_id UUID NOT NULL REFERENCES public.liberacoes(id) ON DELETE CASCADE,
  veiculo_id   UUID NOT NULL REFERENCES public.veiculos(id)   ON DELETE CASCADE,
  PRIMARY KEY (liberacao_id, veiculo_id)
);
CREATE INDEX idx_lib_veic_liberacao_id ON public.liberacao_veiculos(liberacao_id);
CREATE INDEX idx_lib_veic_veiculo_id   ON public.liberacao_veiculos(veiculo_id);
ALTER TABLE public.liberacao_veiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lib_veic: posto manage" ON public.liberacao_veiculos FOR ALL
  USING (liberacao_id IN (
    SELECT l.id FROM public.liberacoes l JOIN public.parcerias pa ON pa.id = l.parceria_id
    JOIN public.postos p ON p.id = pa.posto_id JOIN public.contas_posto cp ON cp.id = p.conta_posto_id
    WHERE cp.perfil_id = auth.uid()
  ));
CREATE POLICY "lib_veic: empresa read" ON public.liberacao_veiculos FOR SELECT
  USING (liberacao_id IN (
    SELECT l.id FROM public.liberacoes l JOIN public.parcerias pa ON pa.id = l.parceria_id
    WHERE pa.empresa_id IN (SELECT id FROM public.empresas WHERE perfil_id = auth.uid())
  ));
CREATE POLICY "lib_veic: service role" ON public.liberacao_veiculos FOR ALL USING (auth.role() = 'service_role');
