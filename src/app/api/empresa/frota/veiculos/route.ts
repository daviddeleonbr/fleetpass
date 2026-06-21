import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/api-auth'

type VeiculoRow = {
  id: string
  placa: string
  modelo: string
  combustivel: string
  limite_mensal: number | null
  motorista_padrao_id: string | null
  exigir_quilometragem: boolean
  bloqueado: boolean
  bloqueio_tipo: string | null
  status: string
  motoristas: { id: string; nome: string } | null
}

// GET /api/empresa/frota/veiculos — lista veículos ativos
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const { data, error } = await svc
      .from('veiculos')
      .select('id, placa, modelo, combustivel, limite_mensal, motorista_padrao_id, exigir_quilometragem, bloqueado, bloqueio_tipo, status, motoristas(id, nome)')
      .eq('empresa_id', empresa.id)
      .eq('status', 'ativo')
      .order('created_at', { ascending: false }) as { data: VeiculoRow[] | null; error: unknown }

    if (error) throw error

    const veiculos = (data ?? []).map((v) => ({
      id:                  v.id,
      placa:               v.placa,
      modelo:              v.modelo,
      combustivel:         v.combustivel,
      limiteMensal:        v.limite_mensal ? Number(v.limite_mensal) : null,
      motoristaPadraoId:   v.motorista_padrao_id ?? null,
      motoristaNome:       v.motoristas?.nome ?? null,
      exigirQuilometragem: v.exigir_quilometragem,
      bloqueado:           v.bloqueado,
      bloqueioTipo:        v.bloqueio_tipo ?? null,
    }))

    return NextResponse.json({ veiculos })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST /api/empresa/frota/veiculos — cadastra veículo
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const body = await req.json() as {
      placa: string
      modelo: string
      combustivel: string
      limite_mensal?: number | null
      motorista_padrao_id?: string | null
      exigir_quilometragem: boolean
    }

    const { data, error } = await svc
      .from('veiculos')
      .insert({
        empresa_id:           empresa.id,
        placa:                body.placa.toUpperCase().trim(),
        modelo:               body.modelo.trim(),
        combustivel:          body.combustivel,
        limite_mensal:        body.limite_mensal ?? null,
        motorista_padrao_id:  body.motorista_padrao_id ?? null,
        exigir_quilometragem: body.exigir_quilometragem,
        status:               'ativo',
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Já existe um veículo com esta placa.' }, { status: 409 })
      if (error.code === '23514') return NextResponse.json({ error: 'Formato de placa inválido. Use AAA-0000 ou AAA0A00.' }, { status: 422 })
      throw error
    }

    return NextResponse.json({ veiculo: data }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
