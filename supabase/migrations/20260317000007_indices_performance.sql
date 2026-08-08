-- ── ÍNDICES DE PERFORMANCE ────────────────────────────────────────────────────
-- FKs sem índice (evita seq scan em joins/filtros por parceria/motorista/veículo)
CREATE INDEX IF NOT EXISTS idx_requisicoes_parceria_id     ON public.requisicoes(parceria_id);
CREATE INDEX IF NOT EXISTS idx_requisicoes_motorista_id    ON public.requisicoes(motorista_id);
CREATE INDEX IF NOT EXISTS idx_requisicoes_veiculo_id      ON public.requisicoes(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_faturamentos_parceria_id    ON public.faturamentos(parceria_id);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_motorista_id ON public.abastecimentos(motorista_id);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_veiculo_id   ON public.abastecimentos(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_abastecimentos_requisicao_id ON public.abastecimentos(requisicao_id);

-- Compostos (tenant, ordenação) para listagens que filtram por tenant e ordenam por data
CREATE INDEX IF NOT EXISTS idx_requisicoes_posto_created   ON public.requisicoes(posto_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requisicoes_empresa_created ON public.requisicoes(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_posto_created  ON public.solicitacoes(posto_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faturamentos_posto_data     ON public.faturamentos(posto_id, data_faturamento DESC);
CREATE INDEX IF NOT EXISTS idx_propostas_empresa_created   ON public.propostas(empresa_id, created_at DESC);
