import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

// GET /api/empresa/liberacoes/historico
// Retorna abastecimentos provenientes de requisições livres (eh_livre = true)
export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    // IDs de requisições livres da empresa
    const { data: reqLivres } = await svc
      .from('requisicoes')
      .select('id')
      .eq('empresa_id', empresa.id)
      .eq('eh_livre', true)
      .eq('status', 'concluido')

    if (!reqLivres || reqLivres.length === 0) {
      return NextResponse.json({ historico: [], totais: { registros: 0, litros: 0, valor: 0 } })
    }

    const reqIds = reqLivres.map(r => r.id)

    const { data, error } = await svc
      .from('abastecimentos')
      .select('id, codigo, data, combustivel, litros, valor, veiculos(placa, modelo), motoristas(nome), postos(nome)')
      .in('requisicao_id', reqIds)
      .order('data', { ascending: false })
      .limit(100)

    if (error) throw error

    const historico = (data ?? []).map(a => {
      const v = a.veiculos  as unknown as { placa: string; modelo: string } | null
      const m = a.motoristas as unknown as { nome: string } | null
      const p = a.postos     as unknown as { nome: string } | null
      return {
        id:         a.id,
        codigo:     a.codigo,
        data:       a.data,
        combustivel: a.combustivel,
        litros:     Number(a.litros),
        valor:      Number(a.valor),
        placa:      v?.placa  ?? '—',
        modelo:     v?.modelo ?? '—',
        motorista:  m?.nome   ?? '—',
        posto:      p?.nome   ?? '—',
      }
    })

    const totais = {
      registros: historico.length,
      litros:    historico.reduce((s, h) => s + h.litros, 0),
      valor:     historico.reduce((s, h) => s + h.valor, 0),
    }

    return NextResponse.json({ historico, totais })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
