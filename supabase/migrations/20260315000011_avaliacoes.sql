CREATE TABLE public.avaliacoes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posto_id   UUID NOT NULL REFERENCES public.postos(id)   ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nota       INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario TEXT,
  util_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (posto_id, empresa_id)
);
CREATE INDEX idx_avaliacoes_posto_id   ON public.avaliacoes(posto_id);
CREATE INDEX idx_avaliacoes_empresa_id ON public.avaliacoes(empresa_id);
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "avaliacoes: empresa manage" ON public.avaliacoes FOR ALL
  USING (empresa_id IN (SELECT id FROM public.empresas WHERE perfil_id = auth.uid()));
CREATE POLICY "avaliacoes: public read"    ON public.avaliacoes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "avaliacoes: service role"   ON public.avaliacoes FOR ALL USING (auth.role() = 'service_role');
