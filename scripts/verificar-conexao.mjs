import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Carrega .env.local manualmente
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const URL  = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SVC  = env.SUPABASE_SERVICE_ROLE_KEY

console.log('\n━━━ Variáveis de ambiente ━━━')
console.log('URL:        ', URL ? `${URL.slice(0, 50)}…` : '❌ AUSENTE')
console.log('ANON_KEY:   ', ANON ? `${ANON.slice(0, 20)}…` : '❌ AUSENTE')
console.log('SERVICE_KEY:', SVC  ? `${SVC.slice(0, 20)}…`  : '❌ AUSENTE')

if (!URL || !ANON || !SVC) process.exit(1)

// Teste com anon key (usado pelo front)
console.log('\n━━━ Conexão anon (cliente público) ━━━')
const anon = createClient(URL, ANON)
const { count: c1, error: e1 } = await anon.from('perfis').select('id', { count: 'exact', head: true })
if (e1) console.log('❌ Erro:', e1.message)
else    console.log('✅ perfis visíveis (via RLS):', c1 ?? 0)

// Teste com service role
console.log('\n━━━ Conexão service role (bypassa RLS) ━━━')
const svc = createClient(URL, SVC, { auth: { persistSession: false } })
const { count: c2, error: e2 } = await svc.from('perfis').select('id', { count: 'exact', head: true })
if (e2) console.log('❌ Erro:', e2.message)
else    console.log('✅ perfis total no banco:', c2 ?? 0)

// Lista usuários do auth
console.log('\n━━━ Usuários cadastrados ━━━')
const { data: usersList, error: uErr } = await svc.auth.admin.listUsers({ perPage: 50 })
if (uErr) {
  console.log('❌ Erro:', uErr.message)
} else {
  console.log(`✅ ${usersList.users.length} usuários no auth.users`)
  usersList.users.forEach(u => {
    const confirmed = u.email_confirmed_at ? '✅' : '❌ não confirmado'
    const banned = u.banned_until ? `🚫 banido até ${u.banned_until}` : ''
    console.log(`  - ${u.email}  role=${u.user_metadata?.role ?? '?'}  ${confirmed} ${banned}`)
  })
}

// Tabelas críticas
console.log('\n━━━ Tabelas ━━━')
for (const tbl of ['perfis', 'empresas', 'postos', 'solicitacoes', 'propostas', 'parcerias', 'contratos', 'parceria_mensagens', 'notificacoes']) {
  const { count, error } = await svc.from(tbl).select('id', { count: 'exact', head: true })
  if (error) console.log(`  ❌ ${tbl}: ${error.message}`)
  else       console.log(`  ✅ ${tbl}: ${count ?? 0} registros`)
}

// Verifica RPCs
console.log('\n━━━ RPCs / Funções ━━━')
const { error: rpcErr } = await svc.rpc('aceitar_proposta', { p_proposta_id: '00000000-0000-0000-0000-000000000000' })
if (rpcErr && rpcErr.message.includes('não encontrada')) {
  console.log('  ✅ aceitar_proposta: função existe')
} else if (rpcErr) {
  console.log(`  ⚠️  aceitar_proposta: ${rpcErr.message}`)
} else {
  console.log('  ✅ aceitar_proposta: função existe')
}

console.log('')
