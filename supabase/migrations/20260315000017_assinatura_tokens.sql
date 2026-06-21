-- Tokens OTP para assinatura de contratos (email + WhatsApp)
CREATE TABLE public.assinatura_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parceria_id UUID NOT NULL REFERENCES public.parcerias(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('empresa', 'posto')),
  code_hash   TEXT NOT NULL,       -- SHA-256 do código de 6 dígitos
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assinatura_tokens_parceria_id ON public.assinatura_tokens(parceria_id);

ALTER TABLE public.assinatura_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assinatura_tokens: service role"
  ON public.assinatura_tokens FOR ALL USING (auth.role() = 'service_role');
