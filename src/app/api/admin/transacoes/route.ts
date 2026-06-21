import { NextResponse } from 'next/server'
import { requireAdmin, adminError } from '@/lib/admin-auth'

// GET /api/admin/transacoes — log de abastecimentos de toda a plataforma
export async function GET() {
  const a = await requireAdmin()
  if (!a.ok) return a.response
  const svc = a.svc as any

  try {
    const taxaPct = Number(process.env.FUELLINK_TAXA_SPLIT ?? '2.5')

    const { data, error } = await svc
      .from('abastecimentos')
      .select(`
        id, codigo, data, combustivel, litros, valor, status,
        postos ( nome ),
        empresas ( nome_empresa )
      `)
      .order('data', { ascending: false })
      .limit(500)
    if (error) throw error

    const transacoes = (data ?? []).map((t: any) => {
      const valorBruto = Number(t.valor)
      const taxa = Math.round(valorBruto * (taxaPct / 100) * 100) / 100
      return {
        id:           t.codigo ?? t.id,
        dataHora:     new Date(t.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }),
        posto:        t.postos?.nome ?? '—',
        empresa:      t.empresas?.nome_empresa ?? '—',
        combustivel:  t.combustivel,
        litros:       Number(t.litros),
        valorBruto,
        taxa,
        valorLiquido: Math.round((valorBruto - taxa) * 100) / 100,
        status:       t.status, // 'faturado' | 'pendente' | 'contestado'
      }
    })

    return NextResponse.json({ transacoes, taxaPct })
  } catch (err) {
    console.error('[admin/transacoes]', err)
    return NextResponse.json({ error: adminError(err) }, { status: 500 })
  }
}
