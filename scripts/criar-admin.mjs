// Cria (ou promove) um usuário ADMIN do FuelLink.
// O trigger handle_new_user cria o perfil com role = user_metadata.role.
//
// Uso:
//   node scripts/criar-admin.mjs admin@fuellink.com.br SenhaForte123
//   node scripts/criar-admin.mjs admin@fuellink.com.br SenhaForte123 "Seu Nome"
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const EMAIL = process.argv[2]
const SENHA = process.argv[3]
const NOME  = process.argv[4] || 'Administrador'

if (!EMAIL || !SENHA) {
  console.error('Uso: node scripts/criar-admin.mjs <email> <senha> ["Nome"]')
  process.exit(1)
}

const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// 1. Cria o usuário no Auth (ou reaproveita se já existir)
let userId
const { data: created, error: createErr } = await svc.auth.admin.createUser({
  email: EMAIL,
  password: SENHA,
  email_confirm: true,
  user_metadata: { role: 'admin', nome: NOME },
})

if (createErr) {
  if (!createErr.message?.toLowerCase().includes('already')) {
    console.error('Erro ao criar usuário:', createErr.message)
    process.exit(1)
  }
  // Já existe → localiza e redefine senha/metadata
  const { data: list } = await svc.auth.admin.listUsers({ perPage: 1000 })
  const found = list.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase())
  if (!found) { console.error('Usuário existe mas não foi localizado.'); process.exit(1) }
  userId = found.id
  await svc.auth.admin.updateUserById(userId, {
    password: SENHA,
    user_metadata: { ...found.user_metadata, role: 'admin', nome: NOME },
  })
  console.log('Usuário já existia — senha redefinida e promovido a admin.')
} else {
  userId = created.user.id
  console.log('Usuário criado.')
}

// 2. Garante role = admin no perfil (caso o trigger tenha usado o default)
const { error: perfilErr } = await svc
  .from('perfis')
  .update({ role: 'admin', nome: NOME })
  .eq('id', userId)
if (perfilErr) {
  // Perfil pode ainda não existir se o trigger não rodou; insere.
  await svc.from('perfis').insert({ id: userId, role: 'admin', nome: NOME, email: EMAIL })
}

console.log(`\n✅ Admin pronto.`)
console.log(`   Email: ${EMAIL}`)
console.log(`   Acesse /login e você será redirecionado para /admin.`)
