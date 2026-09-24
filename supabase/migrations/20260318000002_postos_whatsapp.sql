-- ── WHATSAPP DE CONTATO DO POSTO ──────────────────────────────────────────────
-- Canal pelo qual a transportadora fala com um posto com quem ainda não tem
-- parceria (aba Descobrir da Vitrine).
--
-- Por que uma coluna nova e não reaproveitar `postos.telefone`:
--   • `telefone` nunca foi preenchido pelo app — o formulário de meus-postos
--     sequer captura o campo; os valores existentes vieram do seed;
--   • esses valores são telefones FIXOS ((41) 3222-1010, (51) 3466-8800), que
--     gerariam links wa.me mortos.
--
-- Fica NULL-ável de propósito. A obrigatoriedade é aplicada na camada de
-- aplicação, ao criar/editar um posto: assim os registros já existentes não
-- quebram, e um posto sem número simplesmente não exibe o botão de contato —
-- "o posto cadastrado corretamente poderá disponibilizar um número".
--
-- Reversível: ALTER TABLE public.postos DROP COLUMN whatsapp;

ALTER TABLE public.postos
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

COMMENT ON COLUMN public.postos.whatsapp IS
  'WhatsApp de contato do posto, só dígitos com DDI+DDD (ex.: 5527999250088). Obrigatório na aplicação ao cadastrar/editar; NULL nos registros anteriores à coluna.';
