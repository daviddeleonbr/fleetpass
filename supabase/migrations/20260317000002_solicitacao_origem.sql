-- ── SOLICITACOES: origem + vínculo com convite ───────────────────────────────
-- 'origem' rotula quem iniciou o vínculo. Default 'empresa' preserva todas as
-- linhas existentes. Quando o posto inicia (via convite), a solicitacao é criada
-- SEMPRE via service client (a RLS atual só permite INSERT pela empresa).

ALTER TABLE public.solicitacoes
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'empresa'
    CHECK (origem IN ('empresa','posto'));

ALTER TABLE public.solicitacoes
  ADD COLUMN IF NOT EXISTS convite_id UUID REFERENCES public.convites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_solicitacoes_convite_id ON public.solicitacoes(convite_id);

-- ── RPC: aceitar_convite ──────────────────────────────────────────────────────
-- Ancorada AQUI porque depende das colunas origem/convite_id acima. Cria a
-- solicitacao(origem='posto') e marca o convite como aceito. Guard de unicidade
-- espelha as checagens de api/empresa/solicitacoes/route.ts.
CREATE OR REPLACE FUNCTION public.aceitar_convite(p_convite_id UUID, p_empresa_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_conv   public.convites%ROWTYPE;
  v_sol_id UUID;
BEGIN
  SELECT * INTO v_conv FROM public.convites WHERE id = p_convite_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite não encontrado.' USING ERRCODE = 'P0001';
  END IF;
  IF v_conv.status <> 'pendente' THEN
    RAISE EXCEPTION 'Convite não está pendente (%).', v_conv.status USING ERRCODE = 'P0001';
  END IF;
  IF v_conv.expira_em IS NOT NULL AND v_conv.expira_em < NOW() THEN
    RAISE EXCEPTION 'Convite expirado.' USING ERRCODE = 'P0001';
  END IF;

  -- Guard: parceria ativa/pendente já existente para o par (respeita uq_parceria_ativa_ou_pendente)
  IF EXISTS (
    SELECT 1 FROM public.parcerias
    WHERE empresa_id = p_empresa_id AND posto_id = v_conv.posto_id
      AND status IN ('ativa','pendente_assinatura')
  ) THEN
    RAISE EXCEPTION 'Já existe uma parceria ativa ou pendente com este posto.' USING ERRCODE = 'P0001';
  END IF;

  -- Guard: solicitação ativa já existente para o par
  IF EXISTS (
    SELECT 1 FROM public.solicitacoes
    WHERE empresa_id = p_empresa_id AND posto_id = v_conv.posto_id
      AND status IN ('aguardando','proposta_recebida')
  ) THEN
    RAISE EXCEPTION 'Já existe uma solicitação ativa com este posto.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.solicitacoes (empresa_id, posto_id, combustiveis, mensagem, status, origem, convite_id)
  VALUES (p_empresa_id, v_conv.posto_id, v_conv.combustiveis, v_conv.mensagem, 'aguardando', 'posto', v_conv.id)
  RETURNING id INTO v_sol_id;

  UPDATE public.convites
    SET status = 'aceito', empresa_id = p_empresa_id, solicitacao_id = v_sol_id, aceito_em = NOW()
    WHERE id = p_convite_id;

  RETURN v_sol_id;
END;
$$;
