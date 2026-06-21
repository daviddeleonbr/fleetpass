-- ── FIX: generate_requisicao_codigo usava gen_random_bytes() (pgcrypto) ───────
-- No Supabase hospedado a extensão pgcrypto fica no schema `extensions`, fora do
-- search_path da função (= public), causando:
--   "function gen_random_bytes(integer) does not exist"
-- Solução: gerar os caracteres aleatórios com random() (built-in, pg_catalog),
-- eliminando a dependência de pgcrypto.
CREATE OR REPLACE FUNCTION public.generate_requisicao_codigo()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  seg1  TEXT := ''; seg2 TEXT := '';
  candidate TEXT; i INT; ja_existe BOOLEAN;
BEGIN
  IF NEW.codigo IS NOT NULL AND NEW.codigo <> '' THEN RETURN NEW; END IF;
  LOOP
    seg1 := ''; seg2 := '';
    FOR i IN 1..3 LOOP seg1 := seg1 || substr(chars, floor(random() * length(chars))::int + 1, 1); END LOOP;
    FOR i IN 1..4 LOOP seg2 := seg2 || substr(chars, floor(random() * length(chars))::int + 1, 1); END LOOP;
    candidate := 'FL-' || seg1 || '-' || seg2;
    SELECT EXISTS(SELECT 1 FROM public.requisicoes WHERE codigo = candidate) INTO ja_existe;
    EXIT WHEN NOT ja_existe;
  END LOOP;
  NEW.codigo := candidate; RETURN NEW;
END; $$;
