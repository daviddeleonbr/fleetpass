import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    // Service client para leitura pública dos postos (bypassa RLS)
    const supabase = createServiceClient()

    const { searchParams } = new URL(req.url)
    const search      = searchParams.get('search')      ?? ''
    const combustivel = searchParams.get('combustivel') ?? ''
    const bandeira    = searchParams.get('bandeira')    ?? ''

    // Tenta obter usuário para status de parceiro (opcional — não bloqueia)
    let empresa: { id: string } | null = null
    try {
      const authClient = await createClient()
      const { data: { user } } = await authClient.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('empresas')
          .select('id')
          .eq('perfil_id', user.id)
          .single()
        empresa = data
      }
    } catch { /* sem sessão — ok */ }

    // Busca postos ativos com média de avaliação e status de parceria
    let query = supabase
      .from('postos')
      .select(`
        id, nome, bandeira, combustiveis, endereco, numero, bairro, cidade, estado, lat, lng, telefone,
        avaliacoes ( nota ),
        parcerias ( id, status, empresa_id )
      `)
      .eq('status', 'ativo')
      .order('nome')

    if (combustivel) query = query.contains('combustiveis', [combustivel])
    // NOTE: database.types.ts está com o enum posto_bandeira desatualizado;
    // o valor é uma bandeira real válida no banco. Cast para passar o type-check.
    if (bandeira)    query = query.eq('bandeira', bandeira as never)

    const { data: postos, error } = await query

    if (error) throw error

    const result = (postos ?? [])
      .map((p) => {
        const notas = (p.avaliacoes as { nota: number }[]) ?? []
        const avaliacao = notas.length
          ? parseFloat((notas.reduce((s, a) => s + a.nota, 0) / notas.length).toFixed(1))
          : null

        const parceiro = empresa
          ? (p.parcerias as { id: string; status: string; empresa_id: string }[])
              .some((par) => par.empresa_id === empresa.id && par.status === 'ativa')
          : false

        const endereco = [p.endereco, p.numero, p.bairro, p.cidade, p.estado]
          .filter(Boolean).join(', ')

        return {
          id:           p.id,
          nome:         p.nome,
          bandeira:     p.bandeira,
          combustiveis: p.combustiveis as string[],
          endereco,
          lat:          p.lat ? Number(p.lat) : null,
          lng:          p.lng ? Number(p.lng) : null,
          telefone:     p.telefone,
          avaliacao,
          parceiro,
        }
      })
      .filter((p) => {
        if (!search) return true
        const q = search.toLowerCase()
        return p.nome.toLowerCase().includes(q) || p.endereco.toLowerCase().includes(q)
      })

    // Bandeiras e combustíveis únicos para os filtros
    const bandeiras    = [...new Set((postos ?? []).map((p) => p.bandeira))].sort()
    const combustiveis = [...new Set((postos ?? []).flatMap((p) => p.combustiveis as string[]))].sort()

    return NextResponse.json({ postos: result, bandeiras, combustiveis })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
