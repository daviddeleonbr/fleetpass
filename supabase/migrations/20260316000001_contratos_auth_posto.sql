-- Adiciona campos de autenticação separados para o posto
-- Os campos auth_* existentes passam a ser exclusivos da empresa
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS auth_ip_posto          TEXT,
  ADD COLUMN IF NOT EXISTS auth_navegador_posto   TEXT,
  ADD COLUMN IF NOT EXISTS auth_dispositivo_posto TEXT,
  ADD COLUMN IF NOT EXISTS auth_data_posto        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auth_hash_posto        TEXT;

COMMENT ON COLUMN public.contratos.auth_ip_posto IS 'IP público do signatário do posto';
COMMENT ON COLUMN public.contratos.auth_hash_posto IS 'SHA-256 do contrato assinado pelo posto';
