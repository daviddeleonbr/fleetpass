CREATE TABLE public.planos (
  id               TEXT PRIMARY KEY,
  nome             TEXT NOT NULL,
  preco_mensal     NUMERIC(10,2) NOT NULL,
  max_postos       INTEGER,       -- NULL = ilimitado
  stripe_price_id  TEXT NOT NULL DEFAULT '',
  ativo            BOOLEAN NOT NULL DEFAULT true,
  features         JSONB NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.planos (id, nome, preco_mensal, max_postos, features) VALUES
  ('starter',      'Starter',      89.00,  1,    '["1 posto","Requisições ilimitadas","QR Code","Suporte e-mail"]'),
  ('profissional', 'Profissional', 189.00,  3,   '["Até 3 postos","Relatórios","Histórico 6m","Suporte prioritário"]'),
  ('rede',         'Rede',         349.00, 10,   '["Até 10 postos","Dashboard unificado","CSV/PDF","Histórico 12m"]'),
  ('enterprise',   'Enterprise',   599.00, NULL, '["Ilimitado","SLA","API própria","Gerente dedicado"]');

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "planos: public read"   ON public.planos FOR SELECT USING (true);
CREATE POLICY "planos: service write" ON public.planos FOR ALL    USING (auth.role() = 'service_role');
