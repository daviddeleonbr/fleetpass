import { NextResponse } from 'next/server'
import { requireAdmin, adminError } from '@/lib/admin-auth'

// GET /api/admin/empresas — lista empresas com agregados (parcerias, requisições, volume do mês)
export async function GET() {
  const a = await requireAdmin()
  if (!a.ok) return a.response
  const svc = a.svc as any

  try {
    const agora = new Date()
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

    // Lista de empresas + agregados (parcerias/requisições/volume agrupados no
    // banco via RPC) em paralelo — antes eram 3 varreduras + agregação em memória.
    const [{ data: empresas, error }, { data: agg }] = await Promise.all([
      svc.from('empresas').select('id, nome_empresa, cnpj, created_at').order('created_at', { ascending: false }),
      svc.rpc('admin_empresas_agg', { p_inicio: inicioMes }),
    ])
    if (error) throw error

    const aggMap = new Map<string, any>((agg ?? []).map((r: any) => [r.empresa_id, r]))
    const result = (empresas ?? []).map((e: any) => {
      const g = aggMap.get(e.id)
      return {
        id:              e.id,
        nome:            e.nome_empresa,
        cnpj:            e.cnpj,
        postosParceiros: Number(g?.parcerias_ativas ?? 0),
        requisicoesMes:  Number(g?.req_mes ?? 0),
        volumeMes:       Number(g?.vol_mes ?? 0),
        status:          'ativa' as const,
      }
    })

    return NextResponse.json({ empresas: result })
  } catch (err) {
    console.error('[admin/empresas]', err)
    return NextResponse.json({ error: adminError(err) }, { status: 500 })
  }
}
