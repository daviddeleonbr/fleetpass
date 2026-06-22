import { NextResponse } from 'next/server'
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

// GET /api/posto/requisicoes — requisições recebidas pelos postos da conta
export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any
    const { data: conta } = await svc.from('contas_posto').select('id').eq('perfil_id', user.id).single()
    if (!conta) return NextResponse.json({ error: 'Conta de posto não encontrada.' }, { status: 404 })

    const { data: postos } = await svc
      .from('postos').select('id, nome').eq('conta_posto_id', conta.id)
    const postoIds = (postos ?? []).map((p: any) => p.id)
    const postoNome: Record<string, string> = Object.fromEntries((postos ?? []).map((p: any) => [p.id, p.nome]))

    if (postoIds.length === 0) {
      return NextResponse.json({ requisicoes: [], postos: [] })
    }

    const { data, error } = await svc
      .from('requisicoes')
      .select(`
        id, codigo, status, combustivel, tipo_limite, limite_valor, limite_volume, validade, created_at, posto_id,
        empresas ( nome_empresa ),
        veiculos ( placa ),
        motoristas ( nome ),
        validacoes ( data_hora, litros, valor_cobrado, hodometro, observacao, frentistas ( nome ) )
      `)
      .in('posto_id', postoIds)
      .eq('eh_livre', false)
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw error

    const requisicoes = (data ?? []).map((r: any) => {
      const val = Array.isArray(r.validacoes) ? r.validacoes[0] : r.validacoes
      const fr  = val?.frentistas as { nome: string } | null
      return {
        id:          r.codigo,
        posto:       postoNome[r.posto_id] ?? '—',
        criadaEm:    new Date(r.created_at).toLocaleDateString('pt-BR'),
        empresa:     (r.empresas as { nome_empresa: string } | null)?.nome_empresa ?? '—',
        veiculo:     (r.veiculos as { placa: string } | null)?.placa ?? '—',
        motorista:   (r.motoristas as { nome: string } | null)?.nome ?? '—',
        combustivel: r.combustivel,
        limite:      formatLimite(r.tipo_limite, r.limite_valor, r.limite_volume),
        validade:    new Date(r.validade).toLocaleDateString('pt-BR'),
        status:      r.status as string,
        validacao:   val ? {
          dataHora:     new Date(val.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).replace(',', ' às').replace(':', 'h'),
          frentista:    fr?.nome ?? '—',
          litros:       `${Number(val.litros).toFixed(1).replace('.', ',')} L`,
          valorCobrado: `R$ ${Number(val.valor_cobrado).toFixed(2).replace('.', ',')}`,
          hodometro:    val.hodometro ? `${Number(val.hodometro).toLocaleString('pt-BR')} km` : '—',
          observacao:   val.observacao ?? undefined,
        } : undefined,
      }
    })

    return NextResponse.json({
      requisicoes,
      postos: (postos ?? []).map((p: any) => p.nome),
    })
  } catch (err) {
    console.error('[posto/requisicoes]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
