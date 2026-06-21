-- Tipo de bloqueio no veículo (NULL = desbloqueado)
ALTER TABLE public.veiculos ADD COLUMN bloqueio_tipo TEXT
  CHECK (bloqueio_tipo IN ('manutencao', 'operacional'));

-- Log de bloqueios / desbloqueios
CREATE TABLE public.veiculo_bloqueios (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id   UUID        NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  acao         TEXT        NOT NULL CHECK (acao IN ('bloqueio', 'desbloqueio')),
  tipo         TEXT        CHECK (tipo IN ('manutencao', 'operacional')),  -- preenchido apenas em bloqueio
  motivo       TEXT        NOT NULL,
  perfil_id    UUID        NOT NULL REFERENCES public.perfis(id) ON DELETE RESTRICT,
  perfil_nome  TEXT        NOT NULL,  -- desnormalizado para exibição no histórico
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_veiculo_bloqueios_veiculo_id ON public.veiculo_bloqueios(veiculo_id);
CREATE INDEX idx_veiculo_bloqueios_created_at ON public.veiculo_bloqueios(created_at DESC);

ALTER TABLE public.veiculo_bloqueios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "veiculo_bloqueios: empresa manage" ON public.veiculo_bloqueios FOR ALL
  USING (veiculo_id IN (
    SELECT v.id FROM public.veiculos v
    JOIN public.empresas e ON e.id = v.empresa_id
    WHERE e.perfil_id = auth.uid()
  ));

CREATE POLICY "veiculo_bloqueios: service role" ON public.veiculo_bloqueios FOR ALL
  USING (auth.role() = 'service_role');
