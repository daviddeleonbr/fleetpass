# CLAUDE.md — FuelLink

Guia para o Claude Code (e humanos) trabalharem neste repositório. Responda e escreva
código em **português** — o domínio inteiro (UI, comentários, nomes de rota e tabelas)
está em pt-BR.

## Visão geral

**FuelLink** é um portal SaaS **centrado no posto**: o posto contrata a ferramenta
(assinatura Stripe por CNPJ) e a **oferece aos seus clientes transportadoras**. O posto
**convida** a transportadora (e-mail/link → tabela `convites`); ela se cadastra como
entidade **global** (atendível por vários postos) ou aceita o convite se já tiver conta.
A partir daí roda o motor **solicitação → proposta → negociação → parceria**; o
**contrato com assinatura é opcional** (`propostas.exige_contrato`: se falso, a parceria
ativa direto). Com a parceria ativa, a empresa emite requisições de abastecimento
(validadas por QR/código pelo frentista) e é faturada. Há painel **admin** e o papel
**frentista**. (Histórico: havia um marketplace onde a empresa descobria postos e iniciava
o vínculo — **removido** no pivô; agora quem inicia é o posto, via convite.)

Quatro papéis (`user_role`): **empresa**, **posto**, **frentista**, **motorista**
(motorista hoje é redirecionado para `/empresa`). O admin é distinto via `perfis.role = 'admin'`.

## Stack

- **Next.js 16** (App Router, React 19) — `next dev --webpack`
- **Supabase** (Postgres + Auth + RLS) via `@supabase/ssr` e `@supabase/supabase-js`
- **Tailwind CSS v4** (`@tailwindcss/postcss`)
- **Stripe** — assinatura dos postos (**plano único por CNPJ**)
- **Resend** — e-mail transacional (convites de posto; tokens de assinatura)
- **node-forge** + `crypto` — assinatura digital de contratos (ICP-Brasil A1, opcional)
- **jsPDF / xlsx** — exportação de relatórios; **leaflet / react-leaflet** — mapa no cadastro de posto
- **lucide-react** — ícones; **clsx + tailwind-merge** (`cn()` em `src/lib/utils.ts`)
- TypeScript `strict`. Alias de import: `@/*` → `src/*`.

## Comandos

```bash
npm run dev      # servidor de desenvolvimento (webpack)
npm run build    # build de produção
npm run start    # serve o build
npm run lint     # eslint (eslint-config-next)
```

Scripts utilitários (Node, leem `.env.local`): `scripts/reset-senha.mjs` (redefine senha
via service role), `scripts/verificar-conexao.mjs`, `scripts/seed-mock.mjs` (popula/limpa
dados de demonstração — usuários `@fuellink-mock.com.br`, senha `Mock@1234`; `--limpar`
só remove). Migrations em `supabase/migrations/` (aplicar com a Supabase CLI).

## Arquitetura

### Rotas (App Router) — `src/app`
Agrupadas por papel; cada grupo tem `layout.tsx` próprio com sidebar + topbar:
- `empresa/` — convites (recebidos), parcerias, frota (veículos/motoristas), requisições, liberações, histórico, faturamento
- `posto/` — meus-postos, **clientes** (convidar/listar convites), parcerias (solicitações/ativos), frentistas, relatórios, requisições, faturamento, perfil, configurações
- `frentista/` — validar requisição por `[codigo]`, histórico
- `motorista/` — visualização de requisição por `[codigo]`
- `admin/` — postos, empresas, transações, notas, planos Stripe, configurações
- `cadastro/` (empresa/posto — empresa aceita `?convite=token`), `convite/[token]` (aceite público), `login/`, `page.tsx` (landing)

### API — `src/app/api/*/route.ts`
Espelham os grupos acima + `convites/` (posto: criar/listar; empresa: aceitar/recusar;
`[token]` público), `stripe/`, `cadastro/`, `notificacoes/`, `planos/`, `parcerias/`.
**Toda a lógica de autorização vive aqui** (ver Cibersegurança).

### Camada de dados — `src/lib`
- `supabase.ts` — client de browser (anon key, respeita RLS). Usado em componentes `'use client'`.
- `supabase-server.ts` — **dois** clients:
  - `createClient()` — server client com cookie do usuário → **respeita RLS**.
  - `createServiceClient()` — usa `SUPABASE_SERVICE_ROLE_KEY` → **BYPASSA RLS**. Só pode
    ser usado após validar autenticação **e** autorização manualmente.
- `database.types.ts` — tipos gerados do schema Supabase.
- `mock-auth.ts` — **usuários de demonstração com senhas hardcoded** (fallback no login).
- `notificacoes.ts`, `relatorios-data.ts`, `export.ts`, `utils.ts`.

### Componentes — `src/components`
`layout/` (sidebars por papel + topbar), `ui/` (button, input, card, badge, modal, tabs,
date-range-picker, map-picker, fake-qr, qr-code), `parcerias/negociacao-painel.tsx`.
Hooks: `src/hooks/use-notificacoes.ts`, `use-parcerias-pendencias.ts`, `use-perfil-atual.ts`,
`use-abastecimentos.ts`.

### Banco de dados — `supabase/migrations`
Migrations versionadas. Núcleo: `perfis` (1:1 com `auth.users`), `empresas`, `postos`,
`contas_posto` (assinatura Stripe), `planos`, `motoristas`, `veiculos` (+ logs de bloqueio),
`frentistas`, `convites` (posto→empresa), `parcerias` + `contratos` (assinatura opcional),
`solicitacoes` (com `origem 'empresa'|'posto'` + `convite_id`) / `propostas` (com
`exige_contrato`), `requisicoes`/`abastecimentos`, `faturamentos`/`boletos`, `liberacoes`,
`avaliacoes`, `notificacoes`, `configuracoes`, `assinatura_tokens`. RPCs-chave:
`aceitar_convite` (cria a solicitação âncora), `aceitar_proposta` (cria parceria; ativa
direto quando `exige_contrato=false`). Enums de status em `20260315000002_enums.sql` (pivô
adiciona `convite_status` e tipos `convite_*` em `notificacao_tipo`). **RLS habilitado** na
maioria das tabelas, com policy padrão `service_role` para `ALL`. Trigger `handle_new_user`
cria `perfis` ao criar usuário no Auth.

## Modelo de autenticação

- Login real via `supabase.auth.signInWithPassword`; o `role` vem de `perfis.role`.
- `src/middleware.ts` usa `getUser()` (valida o JWT no servidor) e redireciona páginas não
  públicas para `/login`. **Importante:** o middleware faz *early-return* para `/api`,
  `/_next` e arquivos — **não protege as rotas de API**.
- Os `layout.tsx` de cada papel checam o role **no cliente** (UX), o que **não é uma
  fronteira de segurança**. A autorização real precisa estar na rota de API + RLS.

## Integrações

- **Stripe** (`api/stripe/*`): checkout de assinatura + webhook (valida assinatura com
  `STRIPE_WEBHOOK_SECRET`). Sincroniza `contas_posto`.
- **Asaas**: o fluxo de subconta/split/boleto foi **removido** da aplicação; previsto
  apenas para **emissão de NF pelo admin** (não implementado).
- **Convites** (`api/posto/convites`, `api/empresa/convites/*`, `api/convites/[token]`):
  o posto convida a transportadora; e-mail via Resend (`src/lib/convites.ts`, não-fatal);
  ao aceitar (cadastro com `conviteToken` ou tela `/empresa/convites`) o RPC `aceitar_convite`
  cria a `solicitacao(origem='posto')`. Token público validado só via service client.
- **Assinatura de contrato** (`api/empresa/parcerias/contrato/[id]/assinar-*`) — **opcional**
  (só quando `propostas.exige_contrato`): assinatura simples ou com **certificado A1 ICP-Brasil**
  (verifica RSA/SHA-256 via node-forge, valida validade do cert, CNPJ no subject, anti-replay
  ≤ 5 min, grava `auth_hash`). Amparo: Lei 14.063/2020, MP 2.200-2/2001.
- **Resend** (e-mail) e **Twilio WhatsApp** — convites de posto e tokens de assinatura.
- **Validação de abastecimento** (`/frentista/validar`, fluxo de presença mútua):
  1. **Login** do frentista (página pública, modelo terminal) → **placa** →
     `POST /api/frentista/requisicao` busca a requisição pendente da placa no posto e
     devolve um **token assinado HMAC-SHA256** (`src/lib/qr-token.ts`, `QR_SIGNING_SECRET`) —
     apenas referência, **sem código nem ticket** (para o frentista não ver o código).
  2. A página gera um **QR real** (`qrcode`, `src/components/ui/qr-code.tsx`) com a URL
     `/motorista/validar?t=<token>`. Se a placa não tem requisição pendente, mostra aviso.
  3. **Motorista escaneia** (câmera, `html5-qrcode`); `POST .../verificar` confere assinatura +
     estado e **revela o código** ao motorista (bloqueia o próprio frentista de revelar).
  4. Frentista **digita o código** → `POST .../liberar` confere e marca a requisição como
     `ativo` (liberada). O token expira em 5 min.
  5. Após abastecer, em **`/frentista/registrar`** (lista as liberadas via
     `GET .../liberadas`), o frentista informa litros/valor → `POST .../registrar` cria a
     `validacao` (trigger gera o `abastecimento`) e marca a requisição como `concluido`.
     Daí aparece em `/frentista/historico` (`GET /api/frentista/validacoes`).

## Variáveis de ambiente

Ver `.env.local.example`. Resumo: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`; `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
`STRIPE_PRICE_*`, `STRIPE_WEBHOOK_SECRET`; `ASAAS_API_KEY`, `ASAAS_ENV`, `FUELLINK_TAXA_SPLIT`;
`RESEND_API_KEY`, `RESEND_FROM`; `TWILIO_*`; `NEXT_PUBLIC_APP_URL`;
`QR_SIGNING_SECRET` (HMAC dos QR Codes de validação — se ausente, deriva da service
role key; definir um dedicado em produção).
`.env*` está no `.gitignore` — **nunca commitar segredos**. Tudo com prefixo `NEXT_PUBLIC_`
é exposto ao browser (não colocar segredo lá).

## Convenções

- Idioma pt-BR em código, rotas e dados. Páginas interativas levam `'use client'`.
- Em rota de API, o padrão é: `getUser()` → resolver o tenant (`empresas`/`contas_posto` por
  `perfil_id`) → consultar/alterar via `createServiceClient()` escopado por `empresa_id`/
  `conta_posto_id`. **Mantenha esse escopo** — é o que substitui o RLS quando se usa o service client.
- Não introduza `getSession()` para decisões de segurança (não valida o JWT) — use `getUser()`.

---

## 🔒 Cibersegurança — REGRA PERMANENTE

> **Sempre que você criar ou alterar qualquer rota, componente ou migration, verifique a
> segurança antes de concluir.** Esta seção é uma instrução permanente, não opcional.

### Checklist obrigatório para TODA rota de API
Como o middleware não cobre `/api` e os layouts só checam role no cliente, **cada rota é a
sua própria fronteira de segurança**. Antes de finalizar uma rota, confirme:

1. **Autenticação** — chama `getUser()` e retorna 401 se não houver usuário? (Exceções:
   webhooks e a página pública de `planos`.)
2. **Autorização por role** — valida o `role` esperado (admin só admin; empresa só empresa;
   etc.)? Não confie no layout client-side.
3. **Ownership / anti-IDOR** — todo recurso acessado por `[id]`/query param é filtrado por
   `empresa_id`/`conta_posto_id`/`posto_id` do usuário **dentro da query**, e não em memória
   depois? IDs vindos do body (ex.: `veiculosIds`, `postoId`) são validados como pertencentes
   ao tenant?
4. **Uso do service client** — `createServiceClient()` (bypassa RLS) só após 1–3. Nunca em
   rota sem auth.
5. **Webhooks** — validam assinatura/token do provedor (Stripe `constructEvent`) antes de
   qualquer escrita?
6. **Validação de input** e **não vazar erros internos** — retorne mensagem genérica ao
   cliente; logue o detalhe no servidor (evite `String(err)`/`err.message` na resposta).
7. **Mass-assignment** — nunca leia `role` (ou outros campos privilegiados) do body; defina-os
   no servidor.

> Sugestão de hardening: criar helpers `requireAuth()`, `requireRole(role)` e `requireAdmin()`
> em `src/lib` e aplicá-los no topo de cada rota, padronizando o tratamento de erro.

### Pendências de segurança conhecidas (auditoria — corrigir antes de produção)

**CRÍTICO**
- `api/admin/configuracoes`, `api/admin/env-status`, `api/admin/stripe/produtos` — ainda
  **sem `requireAdmin()`**; usam service client. Qualquer um na internet lê/altera
  configurações e produtos Stripe; `env-status` revela quais segredos estão configurados.
  (As demais rotas admin — `dashboard`, `empresas`, `postos`, `transacoes` — já usam
  `requireAdmin()` de `src/lib/admin-auth.ts`.)
- `api/stripe/checkout` — opera sobre dados financeiros **sem auth/ownership** (parte do
  fluxo público de cadastro de posto; avaliar tokenizar).
- `api/frentista/validacoes` — exige login mas não valida role nem que o frentista pertence
  ao posto do usuário (IDOR entre postos; filtro feito em memória).
- `api/cadastro/*` — não ler `role` do body (definir sempre no servidor) num refactor futuro.

**ALTO**
- `api/empresa/liberacoes/[parceiaId]` e `api/empresa/historico` — `veiculosIds`/filtros não
  validados por `empresa_id` (cross-tenant).
- `api/stripe/webhook` — assinatura validada (ok), mas faz upsert por e-mail sem confirmar o
  vínculo tenant↔assinatura.
- `api/empresa/parcerias/contrato/[id]/assinar-simples` — check-then-update não atômico
  (risco de dupla assinatura).
- Vazamento de `err.message`/`detail` de DB ao cliente em alguns cadastros — padronizar
  para mensagem genérica (rotas novas já usam o helper `errorMessage`).

**MÉDIO/sistêmico**
- Ausência de checagem de **role** em todas as rotas `/api/empresa/*` e `/api/posto/*` (a
  proteção atual é acidental, via ownership/RLS).
- `String(err)` exposto ao cliente em rotas antigas — padronizar para mensagem genérica.
- (Resolvido) `mock-auth.ts` e os logins de demonstração foram **removidos**.

> Observação: rotas `/api/empresa/frota/*`, `posto/solicitacoes/[id]/proposta` e
> `posto/solicitacoes/[id]/rejeitar` foram verificadas e **estão com ownership correto**
> (não são IDOR).
