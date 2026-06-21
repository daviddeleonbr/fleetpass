-- ── TRIGGER: updated_at em todas as tabelas ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DO $$ DECLARE t TEXT; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'perfis','empresas','contas_posto','postos','frentistas','motoristas','veiculos',
    'solicitacoes','propostas','parcerias','contratos','requisicoes','validacoes',
    'abastecimentos','faturamentos','boletos','liberacoes','avaliacoes'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()',
      t, t);
  END LOOP;
END; $$;


-- ── TRIGGER: gera código FL-XXX-XXXX para requisicoes ─────────────────────────
CREATE OR REPLACE FUNCTION public.generate_requisicao_codigo()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  seg1  TEXT := ''; seg2 TEXT := '';
  candidate TEXT; i INT; exists BOOLEAN;
BEGIN
  IF NEW.codigo IS NOT NULL AND NEW.codigo <> '' THEN RETURN NEW; END IF;
  LOOP
    seg1 := ''; seg2 := '';
    FOR i IN 1..3 LOOP seg1 := seg1 || substr(chars, (get_byte(gen_random_bytes(1), 0) % length(chars)) + 1, 1); END LOOP;
    FOR i IN 1..4 LOOP seg2 := seg2 || substr(chars, (get_byte(gen_random_bytes(1), 0) % length(chars)) + 1, 1); END LOOP;
    candidate := 'FL-' || seg1 || '-' || seg2;
    SELECT EXISTS(SELECT 1 FROM public.requisicoes WHERE codigo = candidate) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  NEW.codigo := candidate; RETURN NEW;
END; $$;

CREATE TRIGGER trg_requisicoes_codigo
  BEFORE INSERT ON public.requisicoes
  FOR EACH ROW EXECUTE FUNCTION public.generate_requisicao_codigo();


-- ── TRIGGER: gera número FAT-YYYY-NNN para faturamentos ──────────────────────
CREATE OR REPLACE FUNCTION public.generate_faturamento_numero()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ano_atual INTEGER; next_seq INTEGER; BEGIN
  IF NEW.numero IS NOT NULL AND NEW.numero <> '' THEN RETURN NEW; END IF;
  ano_atual := EXTRACT(YEAR FROM NOW())::INTEGER;
  INSERT INTO public.faturamento_counters (ano, seq) VALUES (ano_atual, 1)
  ON CONFLICT (ano) DO UPDATE SET seq = faturamento_counters.seq + 1 RETURNING seq INTO next_seq;
  NEW.numero := 'FAT-' || ano_atual::TEXT || '-' || LPAD(next_seq::TEXT, 3, '0');
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_faturamentos_numero
  BEFORE INSERT ON public.faturamentos
  FOR EACH ROW EXECUTE FUNCTION public.generate_faturamento_numero();


-- ── TRIGGER: calcula validade_ate na proposta ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_proposta_validade()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.validade_ate := NOW() + (NEW.validade_dias || ' days')::INTERVAL; RETURN NEW; END; $$;

CREATE TRIGGER trg_propostas_validade
  BEFORE INSERT ON public.propostas
  FOR EACH ROW EXECUTE FUNCTION public.compute_proposta_validade();


-- ── TRIGGER: cria abastecimento ao inserir validacao ──────────────────────────
CREATE OR REPLACE FUNCTION public.create_abastecimento_from_validacao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req public.requisicoes%ROWTYPE; BEGIN
  SELECT * INTO v_req FROM public.requisicoes WHERE id = NEW.requisicao_id;
  INSERT INTO public.abastecimentos (
    codigo, empresa_id, posto_id, veiculo_id, motorista_id, parceria_id,
    requisicao_id, validacao_id, data, combustivel, litros, valor_unitario, valor, status
  ) VALUES (
    v_req.codigo, v_req.empresa_id, v_req.posto_id, v_req.veiculo_id, v_req.motorista_id,
    v_req.parceria_id, v_req.id, NEW.id, NEW.data_hora, v_req.combustivel,
    NEW.litros, NEW.valor_unitario, NEW.valor_cobrado, 'pendente'
  );
  UPDATE public.requisicoes SET status = 'concluido', updated_at = NOW() WHERE id = NEW.requisicao_id;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validacoes_create_abastecimento
  AFTER INSERT ON public.validacoes
  FOR EACH ROW EXECUTE FUNCTION public.create_abastecimento_from_validacao();


-- ── TRIGGER: valida limite do plano ao criar posto ────────────────────────────
CREATE OR REPLACE FUNCTION public.check_plano_max_postos()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_max INTEGER; v_count INTEGER; BEGIN
  SELECT pl.max_postos INTO v_max FROM public.contas_posto cp
  JOIN public.planos pl ON pl.id = cp.plano_id WHERE cp.id = NEW.conta_posto_id;
  IF v_max IS NULL THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO v_count FROM public.postos
  WHERE conta_posto_id = NEW.conta_posto_id AND status = 'ativo';
  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Limite de postos do plano atingido (máximo: %). Faça upgrade.', v_max USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_postos_check_plano
  BEFORE INSERT ON public.postos
  FOR EACH ROW EXECUTE FUNCTION public.check_plano_max_postos();


-- ── AUTH TRIGGER: cria perfil ao criar usuário no Supabase Auth ───────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.perfis (id, role, nome, email, telefone, cargo)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'empresa'),
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'telefone',
    NEW.raw_user_meta_data->>'cargo'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── RPC: aceita proposta atomicamente ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.aceitar_proposta(p_proposta_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prop public.propostas%ROWTYPE; v_parc_id UUID; BEGIN
  SELECT * INTO v_prop FROM public.propostas WHERE id = p_proposta_id;
  IF NOT FOUND           THEN RAISE EXCEPTION 'Proposta não encontrada.'             USING ERRCODE = 'P0001'; END IF;
  IF v_prop.status <> 'pendente' THEN RAISE EXCEPTION 'Proposta não está pendente (%).', v_prop.status USING ERRCODE = 'P0001'; END IF;
  IF v_prop.validade_ate < NOW() THEN RAISE EXCEPTION 'Proposta expirada.'           USING ERRCODE = 'P0001'; END IF;
  INSERT INTO public.parcerias (
    empresa_id, posto_id, proposta_id, combustiveis, ciclo_tipo,
    ciclo_intervalo_dias, ciclo_prazo_recebimento, limite_credito, volume_minimo, status
  ) VALUES (
    v_prop.empresa_id, v_prop.posto_id, v_prop.id, v_prop.combustiveis, v_prop.ciclo_tipo,
    v_prop.ciclo_intervalo_dias, v_prop.ciclo_prazo_recebimento, v_prop.limite_credito, v_prop.volume_minimo, 'ativa'
  ) RETURNING id INTO v_parc_id;
  INSERT INTO public.contratos (parceria_id, empresa_id, posto_id, vigencia_inicio)
  VALUES (v_parc_id, v_prop.empresa_id, v_prop.posto_id, CURRENT_DATE);
  UPDATE public.propostas    SET status = 'aceita', updated_at = NOW() WHERE id = p_proposta_id;
  UPDATE public.solicitacoes SET status = 'aceita', updated_at = NOW() WHERE id = v_prop.solicitacao_id;
  RETURN v_parc_id;
END; $$;


-- ── FUNÇÕES DE EXPIRAÇÃO (chamar via pg_cron ou Edge Function) ────────────────
CREATE OR REPLACE FUNCTION public.expire_propostas()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.propostas SET status = 'expirada', updated_at = NOW()
  WHERE status = 'pendente' AND validade_ate < NOW();
END; $$;

CREATE OR REPLACE FUNCTION public.expire_requisicoes()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.requisicoes SET status = 'expirado', updated_at = NOW()
  WHERE status IN ('pendente','ativo') AND validade < NOW();
END; $$;


-- ── VIEW: estatísticas por posto ──────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_posto_stats AS
SELECT
  p.id                          AS posto_id,
  p.nome                        AS posto_nome,
  COUNT(DISTINCT pa.empresa_id) AS total_empresas_ativas,
  COUNT(a.id)                   AS total_abastecimentos,
  COALESCE(SUM(a.litros), 0)    AS total_litros,
  COALESCE(SUM(a.valor),  0)    AS total_valor
FROM public.postos p
LEFT JOIN public.parcerias      pa ON pa.posto_id = p.id AND pa.status = 'ativa'
LEFT JOIN public.abastecimentos a  ON a.posto_id  = p.id
GROUP BY p.id, p.nome;


-- ── pg_cron: agendar expiração (executar no Supabase SQL Editor) ──────────────
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('expire-propostas',   '0 * * * *',    $$ SELECT public.expire_propostas();   $$);
-- SELECT cron.schedule('expire-requisicoes', '*/15 * * * *', $$ SELECT public.expire_requisicoes(); $$);
