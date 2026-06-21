CREATE TABLE public.perfis (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.user_role NOT NULL,
  nome       TEXT NOT NULL,
  email      TEXT NOT NULL,
  telefone   TEXT,
  cargo      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_perfis_role  ON public.perfis(role);
CREATE INDEX idx_perfis_email ON public.perfis(email);
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perfis: own read"     ON public.perfis FOR SELECT USING (auth.uid() = id);
CREATE POLICY "perfis: own insert"   ON public.perfis FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "perfis: own update"   ON public.perfis FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "perfis: service role" ON public.perfis FOR ALL   USING (auth.role() = 'service_role');
