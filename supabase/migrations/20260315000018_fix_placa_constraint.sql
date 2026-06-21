-- Corrige a constraint de formato de placa:
-- Mercosul real tem 7 caracteres: ABC1D23 (3 letras + 1 dígito + 1 letra + 2 dígitos)
-- A constraint anterior exigia 3 dígitos no final (8 chars), o que é incorreto.
ALTER TABLE public.veiculos DROP CONSTRAINT chk_placa_format;

ALTER TABLE public.veiculos ADD CONSTRAINT chk_placa_format CHECK (
  placa ~ '^[A-Z]{3}-[0-9]{4}$'
  OR placa ~ '^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$'
);
