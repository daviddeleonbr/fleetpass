import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { formatLimite } from '@/lib/qr-token'

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string }
    return [e.message, e.details, e.hint].filter(Boolean).join(' · ') || 'Erro no banco.'
  }
  return String(err)
}

const normCodigo = (c: string) => c.trim().toUpperCase().replace(/\s+/g, '')

/**
 * POST /api/frentista/requisicao/liberar  { reqId, codigo }
 *
 * Passo 5: o frentista digita o código que o motorista revelou. Se conferir com
 * o código da requisição, libera o abastecimento (status → 'ativo') e devolve o
 * ticket completo. Só após esta liberação o frentista pode abastecer.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Autenticação — frentista ativo
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any
    const { data: frentista } = await svc
      .from('frentistas')
      .select('id, posto_id, status')
      .eq('perfil_id', user.id)
      .single()
    if (!frentista || frentista.status !== 'ativo') {
      return NextResponse.json({ error: 'Apenas frentistas ativos podem liberar.' }, { status: 403 })
    }

    // 2. Entrada
    const body = await req.json().catch(() => ({}))
    const reqId  = String(body?.reqId ?? '')
    const codigo = normCodigo(String(body?.codigo ?? ''))
    if (!reqId || !codigo) {
      return NextResponse.json({ error: 'Informe o código da requisição.' }, { status: 400 })
    }

    // 3. Requisição NO POSTO do frentista
    const { data: r } = await svc
      .from('requisicoes')
      .select(`
        id, codigo, status, posto_id, validade, combustivel, tipo_limite, limite_valor, limite_volume,
        veiculos ( placa, modelo ),
        motoristas ( nome ),
        empresas ( nome_empresa ),
        postos ( nome )
      `)
      .eq('id', reqId)
      .eq('posto_id', frentista.posto_id)
      .maybeSingle()

    if (!r) return NextResponse.json({ error: 'Requisição não encontrada neste posto.' }, { status: 404 })
    if (r.status === 'concluido') return NextResponse.json({ error: 'Esta requisição já foi abastecida.' }, { status: 409 })
    if (r.status === 'cancelado' || r.status === 'expirado')
      return NextResponse.json({ error: `Requisição ${r.status}.` }, { status: 409 })
    if (r.validade && new Date(r.validade) < new Date())
      return NextResponse.json({ error: 'Requisição expirada.' }, { status: 409 })

    // 4. Confere o código digitado
    if (normCodigo(r.codigo) !== codigo) {
      return NextResponse.json({ error: 'Código incorreto. Peça ao motorista para confirmar.' }, { status: 422 })
    }

    // 5. Libera (status → 'ativo'), se ainda não estiver
    if (r.status !== 'ativo') {
      const { error: updErr } = await svc
        .from('requisicoes')
        .update({ status: 'ativo' })
        .eq('id', r.id)
        .eq('posto_id', frentista.posto_id)
      if (updErr) throw updErr
    }

    const veiculo   = r.veiculos   as { placa: string; modelo: string } | null
    const motorista = r.motoristas as { nome: string } | null
    const empresa   = r.empresas   as { nome_empresa: string } | null
    const posto     = r.postos     as { nome: string } | null

    return NextResponse.json({
      liberado: true,
      ticket: {
        codigo:      r.codigo,
        veiculo:     veiculo ? `${veiculo.placa} · ${veiculo.modelo}` : '—',
        combustivel: r.combustivel,
        limite:      formatLimite(r.tipo_limite, r.limite_valor, r.limite_volume),
        posto:       posto?.nome ?? '—',
        motorista:   motorista?.nome ?? null,
        empresa:     empresa?.nome_empresa ?? null,
        validade:    r.validade,
      },
    })
  } catch (err) {
    console.error('[frentista/requisicao/liberar]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
