-- Passo 1: adiciona o novo valor ao enum
-- DEVE estar em arquivo separado pois PostgreSQL não permite usar o novo valor
-- na mesma transação em que ele foi adicionado (SQLSTATE 55P04).
ALTER TYPE public.parceria_status ADD VALUE IF NOT EXISTS 'pendente_assinatura';
