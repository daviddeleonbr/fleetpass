-- ── CONVITES (posto → transportadora) ────────────────────────────────────────
-- Pivô do modelo: o POSTO inicia o vínculo convidando seu cliente. O convite é
-- transiente; ao ser aceito ancora uma solicitacao(origem='posto') e o motor
-- existente (proposta → negociação → aceitar_proposta → parceria) roda como hoje.
-- A empresa permanece global (sem FK empresa→posto); o convite só casa o CNPJ
-- com uma empresa já existente quando houver.

CREATE TYPE public.convite_status AS ENUM
  ('pendente','aceito','recusado','expirado','cancelado');

CREATE TABLE public.convites (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posto_id              UUID NOT NULL REFERENCES public.postos(id)        ON DELETE CASCADE,
  empresa_id            UUID REFERENCES public.empresas(id)               ON DELETE SET NULL, -- NULL até a empresa existir
  email_destino         TEXT NOT NULL,
  cnpj_destino          TEXT,                       -- normalizado (só dígitos), para casar empresa global
  nome_empresa_sugerido TEXT,
  combustiveis          TEXT[] NOT NULL DEFAULT '{}',
  mensagem              TEXT,
  token                 TEXT NOT NULL UNIQUE,       -- gerado app-side, usado no link público
  status                public.convite_status NOT NULL DEFAULT 'pendente',
  solicitacao_id        UUID REFERENCES public.solicitacoes(id) ON DELETE SET NULL, -- âncora criada no aceite
  expira_em             TIMESTAMPTZ,
  aceito_em             TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_convites_posto_id   ON public.convites(posto_id);
CREATE INDEX idx_convites_empresa_id ON public.convites(empresa_id);
CREATE INDEX idx_convites_email      ON public.convites(lower(email_destino));
CREATE INDEX idx_convites_cnpj       ON public.convites(cnpj_destino);
CREATE INDEX idx_convites_status     ON public.convites(status);

-- Evita dois convites pendentes para o mesmo (posto, e-mail)
CREATE UNIQUE INDEX uq_convite_pendente_email
  ON public.convites(posto_id, lower(email_destino))
  WHERE status = 'pendente';

ALTER TABLE public.convites ENABLE ROW LEVEL SECURITY;

-- Posto dono gerencia seus convites
CREATE POLICY "convites: posto manage" ON public.convites FOR ALL
  USING (posto_id IN (
    SELECT p.id FROM public.postos p
    JOIN public.contas_posto cp ON cp.id = p.conta_posto_id
    WHERE cp.perfil_id = auth.uid()
  ));

-- Empresa convidada (já cadastrada) lê os próprios convites
CREATE POLICY "convites: empresa read" ON public.convites FOR SELECT
  USING (empresa_id IN (SELECT id FROM public.empresas WHERE perfil_id = auth.uid()));

-- Empresa convidada aceita/recusa (somente esses estados)
CREATE POLICY "convites: empresa update status" ON public.convites FOR UPDATE
  USING (empresa_id IN (SELECT id FROM public.empresas WHERE perfil_id = auth.uid()))
  WITH CHECK (status IN ('aceito','recusado'));

-- Service role (rotas de API; acesso por token é validado na aplicação, sem policy pública)
CREATE POLICY "convites: service role" ON public.convites FOR ALL
  USING (auth.role() = 'service_role');

-- updated_at automático (reusa a função existente)
CREATE TRIGGER trg_convites_updated_at
  BEFORE UPDATE ON public.convites
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
