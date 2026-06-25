-- ── CONTRATO OPCIONAL ─────────────────────────────────────────────────────────
-- 'exige_contrato' é ortogonal a 'exige_certificado' (este decide o MÉTODO de
-- assinatura; aquele decide SE há contrato a assinar). Default true preserva o
-- comportamento atual de todas as propostas/parcerias existentes.

ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS exige_contrato BOOLEAN NOT NULL DEFAULT true;

-- aceitar_proposta com branch de contrato:
--   exige_contrato = true  → parceria 'pendente_assinatura' + contrato (como hoje)
--   exige_contrato = false → parceria 'ativa' direto, sem contrato
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
    CASE WHEN v_prop.exige_contrato THEN 'pendente_assinatura' ELSE 'ativa' END
  ) RETURNING id INTO v_parc_id;

  -- Só cria contrato quando exigido
  IF v_prop.exige_contrato THEN
    INSERT INTO public.contratos (parceria_id, empresa_id, posto_id, vigencia_inicio, exige_certificado)
    VALUES (v_parc_id, v_prop.empresa_id, v_prop.posto_id, CURRENT_DATE, COALESCE(v_prop.exige_certificado, false));
  END IF;

  UPDATE public.propostas    SET status = 'aceita', updated_at = NOW() WHERE id = p_proposta_id;
  UPDATE public.solicitacoes SET status = 'aceita', updated_at = NOW() WHERE id = v_prop.solicitacao_id;

  RETURN v_parc_id;
END;
$$;
