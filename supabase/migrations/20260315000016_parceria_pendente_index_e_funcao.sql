-- Passo 2: recria índice único e atualiza aceitar_proposta
-- Arquivo separado porque o novo valor do enum só pode ser usado
-- depois que a transação anterior (ADD VALUE) foi comitada.

-- Remove índice antigo que cobria só 'ativa'
DROP INDEX IF EXISTS public.uq_parceria_ativa;

-- Novo índice cobre 'ativa' e 'pendente_assinatura'
CREATE UNIQUE INDEX uq_parceria_ativa_ou_pendente
  ON public.parcerias(empresa_id, posto_id)
  WHERE status IN ('ativa', 'pendente_assinatura');

-- Atualiza aceitar_proposta: parceria nasce como pendente_assinatura
-- e só se torna 'ativa' depois que ambas as partes assinarem o contrato.
CREATE OR REPLACE FUNCTION public.aceitar_proposta(p_proposta_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prop    public.propostas%ROWTYPE;
  v_parc_id UUID;
BEGIN
  SELECT * INTO v_prop FROM public.propostas WHERE id = p_proposta_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposta não encontrada.' USING ERRCODE = 'P0001';
  END IF;
  IF v_prop.status <> 'pendente' THEN
    RAISE EXCEPTION 'Proposta não está pendente (%).', v_prop.status USING ERRCODE = 'P0001';
  END IF;
  IF v_prop.validade_ate < NOW() THEN
    RAISE EXCEPTION 'Proposta expirada.' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.parcerias (
    empresa_id, posto_id, proposta_id, combustiveis, ciclo_tipo,
    ciclo_intervalo_dias, ciclo_prazo_recebimento, limite_credito, volume_minimo,
    status
  ) VALUES (
    v_prop.empresa_id, v_prop.posto_id, v_prop.id, v_prop.combustiveis, v_prop.ciclo_tipo,
    v_prop.ciclo_intervalo_dias, v_prop.ciclo_prazo_recebimento, v_prop.limite_credito, v_prop.volume_minimo,
    'pendente_assinatura'
  ) RETURNING id INTO v_parc_id;

  INSERT INTO public.contratos (parceria_id, empresa_id, posto_id, vigencia_inicio)
  VALUES (v_parc_id, v_prop.empresa_id, v_prop.posto_id, CURRENT_DATE);

  UPDATE public.propostas    SET status = 'aceita', updated_at = NOW() WHERE id = p_proposta_id;
  UPDATE public.solicitacoes SET status = 'aceita', updated_at = NOW() WHERE id = v_prop.solicitacao_id;

  RETURN v_parc_id;
END;
$$;
