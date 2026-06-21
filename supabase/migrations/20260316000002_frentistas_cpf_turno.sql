-- Adiciona campos CPF e turno na tabela frentistas
ALTER TABLE public.frentistas
  ADD COLUMN IF NOT EXISTS cpf   TEXT,
  ADD COLUMN IF NOT EXISTS turno TEXT;
