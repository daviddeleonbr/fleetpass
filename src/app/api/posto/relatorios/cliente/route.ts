import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string }
    return [e.message, e.details, e.hint].filter(Boolean).join(' · ') || 'Erro no banco.'
  }
  return String(err)
}

const dataBR = (d: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—')

// GET /api/posto/relatorios/cliente — empresas parceiras dos postos da conta
export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any
    const { data: conta } = await svc.from('contas_posto').select('id').eq('perfil_id', user.id).single()
    if (!conta) return NextResponse.json({ error: 'Conta de posto não encontrada.' }, { status: 404 })

    const { data: postos } = await svc.from('postos').select('id').eq('conta_posto_id', conta.id)
    const postoIds = (postos ?? []).map((p: any) => p.id)
    if (postoIds.length === 0) return NextResponse.json({ clientes: [] })

    // Parcerias dos postos → empresas parceiras
    const { data: parcerias } = await svc
      .from('parcerias')
      .select('empresa_id, status, iniciada_em, empresas ( nome_empresa, cnpj, cidade, estado )')
      .in('posto_id', postoIds)
      .order('iniciada_em', { ascending: false })

    // Abastecimentos dos postos (para agregados por empresa)
    const { data: abast } = await svc
      .from('abastecimentos')
      .select('empresa_id, codigo, valor, data')
      .in('posto_id', postoIds)

    const agg: Record<string, { count: number; valor: number; ultimoCodigo: string; ultimaData: string }> = {}
    for (const a of abast ?? []) {
      const id = a.empresa_id
      if (!agg[id]) agg[id] = { count: 0, valor: 0, ultimoCodigo: '', ultimaData: '' }
      agg[id].count++
      agg[id].valor += Number(a.valor)
      if (!agg[id].ultimaData || new Date(a.data) > new Date(agg[id].ultimaData)) {
        agg[id].ultimaData = a.data
        agg[id].ultimoCodigo = a.codigo
      }
    }

    // Uma linha por empresa (parceria mais recente)
    const vistos = new Set<string>()
    const clientes = (parcerias ?? [])
      .filter((p: any) => { if (vistos.has(p.empresa_id)) return false; vistos.add(p.empresa_id); return true })
      .map((p: any) => {
        const emp = p.empresas as { nome_empresa: string; cnpj: string; cidade: string; estado: string } | null
        const a = agg[p.empresa_id] ?? { count: 0, valor: 0, ultimoCodigo: '', ultimaData: '' }
        return {
          id:           p.empresa_id,
          empresa:      emp?.nome_empresa ?? '—',
          cnpj:         emp?.cnpj ?? '—',
          cidade:       emp ? `${emp.cidade}, ${emp.estado}` : '—',
          desde:        dataBR(p.iniciada_em),
          status:       (p.status === 'ativa' ? 'ativo' : 'bloqueado') as 'ativo' | 'bloqueado',
          totalAbast:   a.count,
          totalValor:   a.valor,
          totalEventos: a.count,
          bloqueios:    0,
          ultimoEvento: a.ultimoCodigo ? `Abastecimento ${a.ultimoCodigo}` : 'Parceria iniciada',
          ultimaData:   a.ultimaData ? dataBR(a.ultimaData) : dataBR(p.iniciada_em),
        }
      })

    return NextResponse.json({ clientes })
  } catch (err) {
    console.error('[posto/relatorios/cliente]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
