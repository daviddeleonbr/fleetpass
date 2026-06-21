-- Extends contratos with fields for A1 certificate and gov.br digital signatures
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS auth_method        TEXT DEFAULT 'sistema',   -- 'sistema' | 'certificado_a1' | 'govbr'
  ADD COLUMN IF NOT EXISTS auth_cert_subject  TEXT,                     -- CN do certificado A1
  ADD COLUMN IF NOT EXISTS auth_cert_issuer   TEXT,                     -- AC emissora
  ADD COLUMN IF NOT EXISTS auth_cert_serial   TEXT,                     -- Número de série do cert
  ADD COLUMN IF NOT EXISTS auth_cert_validade DATE,                     -- Data de expiração do cert
  ADD COLUMN IF NOT EXISTS auth_govbr_cpf     TEXT,                     -- CPF mascarado (gov.br)
  ADD COLUMN IF NOT EXISTS auth_govbr_nivel   TEXT,                     -- 'baixa' | 'media' | 'alta'
  ADD COLUMN IF NOT EXISTS auth_signature     TEXT;                     -- Assinatura RSA base64 (A1)

COMMENT ON COLUMN public.contratos.auth_method IS
  'Método de assinatura da empresa: sistema (IP+hash), certificado_a1 (ICP-Brasil), govbr (Login Gov.br)';
