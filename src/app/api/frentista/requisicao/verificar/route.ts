import { NextRequest, NextResponse } from 'next/server'
import { createClient as createRawClient } from '@supabase/supabase-js'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { verifyRequisicaoToken, formatLimite } from '@/lib/qr-token'

/**
 * Resolve o usuário autenticado por cookie (web) OU por Bearer token (app mobile).
 * O app autentica via JWT do Supabase; a web, via sessão em cookie.
 */
async function getAuthUser(req: NextRequest) {
  const header = req.headers.get('authorization')
  if (header?.toLowerCase().startsWith('bearer ')) {
    const accessToken = header.slice(7).trim()
    const raw = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
    const { data: { user } } = await raw.auth.getUser(accessToken)
    return user
  }
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  return user
}

/**
 * POST /api/frentista/requisicao/verificar  { token }
 *
 * Passo 4: o MOTORISTA escaneia o QR Code. Verifica a assinatura e o estado da
 * requisição e REVELA o código de autorização ao motorista (que o repassa ao
 * frentista). Controles:
 *   - Exige usuário autenticado (a página do motorista é protegida por login).
 *   - BLOQUEIA o próprio frentista do posto de revelar o código por aqui — a
 *     revelação tem que acontecer no dispositivo do motorista, garantindo presença.
 */
export async function POST(req: NextRequest) {
  let token: string
  try {
    const body = await req.json()
    token = String(body?.token ?? '')
  } catch {
    return NextResponse.json({ valido: false, motivo: 'Requisição inválida.' }, { status: 400 })
  }
  if (!token) return NextResponse.json({ valido: false, motivo: 'Token ausente.' }, { status: 400 })

  // Autenticação: cookie (web) ou Bearer (app mobile)
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ valido: false, motivo: 'Faça login para escanear.' }, { status: 401 })

  // 1+2. Assinatura e expiração
  const result = verifyRequisicaoToken(token)
  if (!result.ok) {
    const motivo =
      result.reason === 'expirado'     ? 'QR Code expirado. Peça um novo ao frentista.'
      : result.reason === 'assinatura' ? 'QR Code inválido ou adulterado.'
      :                                  'QR Code não reconhecido.'
    return NextResponse.json({ valido: false, motivo }, { status: 200 })
  }

  const p = result.payload

  try {
    const svc = createServiceClient() as any

    // Impede o frentista do próprio posto de auto-revelar o código.
    const { data: frentista } = await svc
      .from('frentistas')
      .select('posto_id')
      .eq('perfil_id', user.id)
      .maybeSingle()
    if (frentista && frentista.posto_id === p.postoId) {
      return NextResponse.json({
        valido: false,
        motivo: 'O código deve ser liberado no aplicativo do motorista, não pelo frentista.',
      }, { status: 403 })
    }

    // 3. Estado atual da requisição
    const { data: r } = await svc
      .from('requisicoes')
      .select(`
        id, codigo, status, posto_id, validade, combustivel, tipo_limite, limite_valor, limite_volume,
        veiculos ( placa, modelo ),
        postos ( nome )
      `)
      .eq('id', p.reqId)
      .maybeSingle()

    if (!r)                       return NextResponse.json({ valido: false, motivo: 'Requisição não encontrada.' })
    if (r.posto_id !== p.postoId) return NextResponse.json({ valido: false, motivo: 'Posto não confere.' })
    if (r.status === 'concluido') return NextResponse.json({ valido: false, motivo: 'Requisição já abastecida.' })
    if (r.status === 'cancelado' || r.status === 'expirado')
      return NextResponse.json({ valido: false, motivo: `Requisição ${r.status}.` })
    if (r.validade && new Date(r.validade) < new Date())
      return NextResponse.json({ valido: false, motivo: 'Requisição expirada.' })

    const veiculo = r.veiculos as { placa: string; modelo: string } | null
    const posto   = r.postos   as { nome: string } | null

    // Válido — REVELA o código ao motorista
    return NextResponse.json({
      valido: true,
      reqId: r.id,
      codigo: r.codigo,
      requisicao: {
        veiculo:     veiculo ? `${veiculo.placa} · ${veiculo.modelo}` : '—',
        combustivel: r.combustivel,
        limite:      formatLimite(r.tipo_limite, r.limite_valor, r.limite_volume),
        posto:       posto?.nome ?? '—',
      },
    })
  } catch (err) {
    console.error('[frentista/requisicao/verificar]', err)
    return NextResponse.json({ valido: false, motivo: 'Erro ao verificar.' }, { status: 500 })
  }
}
