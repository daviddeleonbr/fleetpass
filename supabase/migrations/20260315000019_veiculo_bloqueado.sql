-- Adiciona coluna bloqueado em veiculos para bloquear abastecimentos sem remover o veículo
ALTER TABLE public.veiculos ADD COLUMN bloqueado BOOLEAN NOT NULL DEFAULT false;
