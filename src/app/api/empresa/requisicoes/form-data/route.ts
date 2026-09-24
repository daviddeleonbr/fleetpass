import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/api-auth'

// GET /api/empresa/requisicoes/form-data
// Retorna veículos, motoristas e parcerias ativas para popular o formulário
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const [veiculosRes, motoristasRes, parceriasRes] = await Promise.all([
      svc
        .from('veiculos')
        .select('id, placa, modelo, combustivel, exigir_quilometragem')
        .eq('empresa_id', empresa.id)
        .eq('status', 'ativo')
        .eq('bloqueado', false)
        .order('placa'),

      svc
        .from('motoristas')
        .select('id, nome')
        .eq('empresa_id', empresa.id)
        .eq('status', 'ativo')
        .eq('bloqueado', false)
        .order('nome'),

      // postos!inner + status = 'ativo' espelha a validação do POST desta mesma
      // rota. Sem isso o formulário oferecia parcerias cujo posto está inativo e
      // o usuário só descobria a recusa ao enviar.
      svc
        .from('parcerias')
        .select('id, combustiveis, postos!inner(id, nome, cidade, estado, status)')
        .eq('empresa_id', empresa.id)
        .eq('status', 'ativa')
        .eq('postos.status', 'ativo')
        .order('created_at', { ascending: false }),
    ])

    const veiculos = (veiculosRes.data ?? []).map(v => ({
      id:                  v.id,
      placa:               v.placa,
      modelo:              v.modelo,
      combustivel:         v.combustivel,
      exigirQuilometragem: v.exigir_quilometragem,
    }))

    const motoristas = motoristasRes.data ?? []

    const parcerias = (parceriasRes.data ?? []).map(p => {
      const posto = p.postos as unknown as { id: string; nome: string; cidade: string; estado: string } | null
      const raw   = (p.combustiveis as unknown as { tipo?: string; ativo?: boolean }[] | null) ?? []
      const combustiveis = raw.filter(c => c.ativo !== false).map(c => c.tipo ?? '').filter(Boolean)
      return {
        id:          p.id,
        postoId:     posto?.id   ?? '',
        postoNome:   posto?.nome ?? 'Posto',
        cidade:      posto ? `${posto.cidade}, ${posto.estado}` : '',
        combustiveis,
      }
    })

    return NextResponse.json({ veiculos, motoristas, parcerias })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
