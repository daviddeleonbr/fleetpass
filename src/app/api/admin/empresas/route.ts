import { NextResponse } from 'next/server'
import { requireAdmin, adminError } from '@/lib/admin-auth'

// GET /api/admin/empresas — lista empresas com agregados (parcerias, requisições, volume do mês)
export async function GET() {
  const a = await requireAdmin()
  if (!a.ok) return a.response
  const svc = a.svc as any

  try {
    const { data: empresas, error } = await svc
      .from('empresas')
      .select('id, nome_empresa, cnpj, created_at')
      .order('created_at', { ascending: false })
    if (error) throw error

    // Início do mês corrente
    const agora = new Date()
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

    // Agregados (escala admin — busca e agrupa em memória)
    const [{ data: parcerias }, { data: reqs }, { data: abast }] = await Promise.all([
      svc.from('parcerias').select('empresa_id, status'),
      svc.from('requisicoes').select('empresa_id, created_at').gte('created_at', inicioMes),
      svc.from('abastecimentos').select('empresa_id, valor, data').gte('data', inicioMes),
    ])

    const contaPorEmpresa = (rows: any[], campo = 'empresa_id') => {
      const m = new Map<string, number>()
      for (const r of rows ?? []) m.set(r[campo], (m.get(r[campo]) ?? 0) + 1)
      return m
    }
    const parceriasAtivas = contaPorEmpresa((parcerias ?? []).filter((p: any) => p.status === 'ativa'))
    const reqMes = contaPorEmpresa(reqs ?? [])
    const volMes = new Map<string, number>()
    for (const r of abast ?? []) volMes.set(r.empresa_id, (volMes.get(r.empresa_id) ?? 0) + Number(r.valor))

    const result = (empresas ?? []).map((e: any) => ({
      id:              e.id,
      nome:            e.nome_empresa,
      cnpj:            e.cnpj,
      postosParceiros: parceriasAtivas.get(e.id) ?? 0,
      requisicoesMes:  reqMes.get(e.id) ?? 0,
      volumeMes:       volMes.get(e.id) ?? 0,
      status:          'ativa' as const,
    }))

    return NextResponse.json({ empresas: result })
  } catch (err) {
    console.error('[admin/empresas]', err)
    return NextResponse.json({ error: adminError(err) }, { status: 500 })
  }
}
