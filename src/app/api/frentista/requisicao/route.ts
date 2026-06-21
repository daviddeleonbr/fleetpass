import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { signRequisicaoToken } from '@/lib/qr-token'

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string }
    return [e.message, e.details, e.hint].filter(Boolean).join(' · ') || 'Erro no banco.'
  }
  return String(err)
}

/** Normaliza placa: remove tudo que não for alfanumérico e põe em maiúsculo. */
function normPlaca(p: string): string {
  return p.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

/**
 * POST /api/frentista/requisicao  { placa }
 *
 * Passo 2 do fluxo: frentista logado informa a PLACA. Busca a requisição
 * pendente daquela placa NO POSTO do frentista e devolve um token assinado
 * (referência) para gerar o QR Code.
 *
 * NÃO retorna o código de autorização nem os dados do ticket — esses só são
 * revelados ao motorista (ao escanear) e ao frentista (após digitar o código).
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Autenticação — frentista ativo
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: frentista } = await svc
      .from('frentistas')
      .select('id, posto_id, status')
      .eq('perfil_id', user.id)
      .single()
    if (!frentista || frentista.status !== 'ativo') {
      return NextResponse.json({ error: 'Apenas frentistas ativos podem validar.' }, { status: 403 })
    }

    // 2. Placa informada
    const body = await req.json().catch(() => ({}))
    const placa = normPlaca(String(body?.placa ?? ''))
    if (!placa) return NextResponse.json({ error: 'Informe a placa do veículo.' }, { status: 400 })

    // 3. Requisição pendente daquela placa NO POSTO do frentista (anti-IDOR).
    //    A placa é normalizada de ambos os lados para tolerar com/sem hífen.
    const svcAny = svc as any
    const { data: rows, error } = await svcAny
      .from('requisicoes')
      .select(`
        id, status, validade, posto_id,
        veiculos!inner ( placa )
      `)
      .eq('posto_id', frentista.posto_id)
      .in('status', ['pendente', 'ativo'])
      .eq('eh_livre', false)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error

    const match = (rows ?? []).find((r: any) => normPlaca(r.veiculos?.placa ?? '') === placa)
    if (!match) {
      return NextResponse.json(
        { error: 'Nenhuma requisição pendente para esta placa neste posto.' },
        { status: 404 },
      )
    }
    if (match.validade && new Date(match.validade) < new Date()) {
      return NextResponse.json({ error: 'Requisição expirada.' }, { status: 409 })
    }

    // 4. Token de referência assinado (sem dados sensíveis)
    const token = signRequisicaoToken({ reqId: match.id, postoId: frentista.posto_id })

    return NextResponse.json({ reqId: match.id, token })
  } catch (err) {
    console.error('[frentista/requisicao POST]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
