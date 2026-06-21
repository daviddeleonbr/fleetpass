import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const EMAIL = 'daviddeleondossantos@gmail.com'
const SENHA = '123456'

const { data: list } = await svc.auth.admin.listUsers({ perPage: 200 })
const user = list.users.find(u => u.email === EMAIL)
if (!user) {
  console.log('❌ Usuário não encontrado')
  process.exit(1)
}

const { error } = await svc.auth.admin.updateUserById(user.id, { password: SENHA })
if (error) {
  console.log('❌ Erro:', error.message)
  process.exit(1)
}

console.log(`✅ Senha redefinida para ${EMAIL}`)
console.log(`   Nova senha: ${SENHA}`)
console.log(`   ID: ${user.id}`)
console.log(`   Role: ${user.user_metadata?.role ?? '(sem role)'}`)
