import { NextResponse } from 'next/server'
import { requireAdmin, adminError } from '@/lib/admin-auth'

// GET /api/admin/postos — lista todos os postos da plataforma
export async function GET() {
  const a = await requireAdmin()
  if (!a.ok) return a.response
  const svc = a.svc as any

  try {
    const { data, error } = await svc
      .from('postos')
      .select(`
        id, nome, cidade, estado, cnpj, status, asaas_id,
        contas_posto ( plano_id )
      `)
      .order('created_at', { ascending: false })
    if (error) throw error

    const postos = (data ?? []).map((p: any) => ({
      id:         p.id,
      nome:       p.nome,
      cidade:     p.cidade,
      uf:         p.estado,
      cnpj:       p.cnpj,
      plano:      p.contas_posto?.plano_id ?? '—',
      subcontaId: p.asaas_id ?? null,
      status:     p.status, // 'ativo' | 'inativo'
    }))

    return NextResponse.json({ postos })
  } catch (err) {
    console.error('[admin/postos]', err)
    return NextResponse.json({ error: adminError(err) }, { status: 500 })
  }
}
