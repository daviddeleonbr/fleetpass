-- Garante que a função set_updated_at existe (pode já existir de migrations anteriores)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Tabela de configurações globais da plataforma (chave/valor)
CREATE TABLE public.configuracoes (
  chave       TEXT PRIMARY KEY,
  valor       TEXT NOT NULL,
  descricao   TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed: taxa padrão de split
INSERT INTO public.configuracoes (chave, valor, descricao)
VALUES ('taxa_split', '2.5', 'Percentual retido pela FuelLink no split Asaas (0–100)');

-- Atualiza updated_at automaticamente
CREATE TRIGGER trg_configuracoes_updated_at
  BEFORE UPDATE ON public.configuracoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Apenas service role escreve; leitura autenticada permitida
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role full access"
  ON public.configuracoes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated read"
  ON public.configuracoes
  FOR SELECT
  TO authenticated
  USING (true);
