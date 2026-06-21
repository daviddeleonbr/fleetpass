// Cria um cupom de 100% + um código promocional para liberar acesso GRÁTIS
// a um cliente de teste. O cliente digita o código no checkout do Stripe.
//
// Uso:
//   node scripts/criar-cupom-gratis.mjs                 -> código TESTE100, permanente
//   node scripts/criar-cupom-gratis.mjs PILOTOX         -> código PILOTOX, permanente
//   node scripts/criar-cupom-gratis.mjs PILOTOX 3       -> código PILOTOX, 100% por 3 meses
//
// Para parar de dar grátis: desative o código (Dashboard > Cupons) e remova o
// desconto da assinatura do cliente.
import Stripe from 'stripe'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const CODE  = (process.argv[2] || 'TESTE100').toUpperCase()
const MESES = process.argv[3] ? parseInt(process.argv[3], 10) : null

// A API padrão atual (clover) reestruturou a criação de promotion codes;
// fixamos uma versão estável só para este script de cupom.
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

// 1. Cupom de 100%
const couponParams = MESES
  ? { percent_off: 100, duration: 'repeating', duration_in_months: MESES, name: `Grátis ${MESES}m (teste)` }
  : { percent_off: 100, duration: 'forever', name: 'Grátis (teste)' }
const coupon = await stripe.coupons.create(couponParams)
console.log('Cupom criado:', coupon.id, '-', couponParams.name)

// 2. Código promocional (o que o cliente digita)
let promo
try {
  promo = await stripe.promotionCodes.create({ coupon: coupon.id, code: CODE })
  console.log('Código promocional criado:', promo.code)
} catch (err) {
  console.error('Falha ao criar o código (já existe?). Tente outro código.\n', err.message)
  process.exit(1)
}

console.log('\n✅ Pronto. Entregue este código ao cliente para usar no checkout:')
console.log(`   ${promo.code}`)
console.log(MESES ? `   (100% grátis por ${MESES} ${MESES === 1 ? 'mês' : 'meses'}, depois cobra por CNPJ)`
                  : '   (100% grátis enquanto o cupom estiver na assinatura)')
