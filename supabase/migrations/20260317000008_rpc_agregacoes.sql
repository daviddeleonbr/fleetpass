-- ── RPCs DE AGREGAÇÃO ─────────────────────────────────────────────────────────
-- O PostgREST está com funções de agregação desabilitadas, então SUM/COUNT/GROUP
-- BY são feitos aqui (dentro de funções SQL) para não trazer milhares de linhas
-- ao app só para somar em memória. Chamadas via service client (rpc()).

-- Agregado por empresa dos abastecimentos de um conjunto de postos
-- (relatório "Linha do Tempo / clientes" do posto).
CREATE OR REPLACE FUNCTION public.posto_clientes_agg(p_posto_ids uuid[])
RETURNS TABLE(empresa_id uuid, total_abast bigint, total_valor numeric, ultima_data timestamptz, ultimo_codigo text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH agg AS (
    SELECT a.empresa_id, count(*) AS c, COALESCE(sum(a.valor), 0) AS s, max(a.data) AS md
    FROM public.abastecimentos a
    WHERE a.posto_id = ANY(p_posto_ids)
    GROUP BY a.empresa_id
  )
  SELECT agg.empresa_id, agg.c, agg.s, agg.md,
    (SELECT a2.codigo FROM public.abastecimentos a2
      WHERE a2.empresa_id = agg.empresa_id AND a2.posto_id = ANY(p_posto_ids) AND a2.data = agg.md
      ORDER BY a2.created_at DESC LIMIT 1)
  FROM agg;
$$;

-- Volume/valor por combustível no mês (admin dashboard).
CREATE OR REPLACE FUNCTION public.admin_abast_mes_agg(p_inicio timestamptz)
RETURNS TABLE(combustivel text, litros numeric, valor numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.combustivel, COALESCE(sum(a.litros), 0), COALESCE(sum(a.valor), 0)
  FROM public.abastecimentos a
  WHERE a.data >= p_inicio
  GROUP BY a.combustivel;
$$;

-- Agregados por empresa (admin lista de empresas): parcerias ativas, requisições
-- do mês e volume (R$) do mês.
CREATE OR REPLACE FUNCTION public.admin_empresas_agg(p_inicio timestamptz)
RETURNS TABLE(empresa_id uuid, parcerias_ativas bigint, req_mes bigint, vol_mes numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH pa AS (
    SELECT p.empresa_id, count(*) AS c FROM public.parcerias p WHERE p.status = 'ativa' GROUP BY p.empresa_id
  ),
  rq AS (
    SELECT r.empresa_id, count(*) AS c FROM public.requisicoes r WHERE r.created_at >= p_inicio GROUP BY r.empresa_id
  ),
  ab AS (
    SELECT a.empresa_id, sum(a.valor) AS s FROM public.abastecimentos a WHERE a.data >= p_inicio GROUP BY a.empresa_id
  )
  SELECT e.id, COALESCE(pa.c, 0), COALESCE(rq.c, 0), COALESCE(ab.s, 0)
  FROM public.empresas e
  LEFT JOIN pa ON pa.empresa_id = e.id
  LEFT JOIN rq ON rq.empresa_id = e.id
  LEFT JOIN ab ON ab.empresa_id = e.id;
$$;
