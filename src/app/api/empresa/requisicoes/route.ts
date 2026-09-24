import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/api-auth'

// Extrai uma mensagem legível de qualquer erro — Error nativo OU PostgrestError
// (objeto comum do Supabase com message/details/hint/code). Sem isso, um throw de
// erro do banco vira "[object Object]" quando passado por String(err).
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string; code?: string }
    return [e.message, e.details, e.hint].filter(Boolean).join(' · ')
      || `Erro no banco${e.code ? ` (${e.code})` : ''}.`
  }
  return String(err)
}

// GET /api/empresa/requisicoes — lista requisições da empresa
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const svcAny = svc as any

    const { data, error } = await svcAny
      .from('requisicoes')
      .select(`
        id, codigo, status, combustivel, tipo_limite, limite_valor, limite_volume,
        validade, quilometragem, observacao, eh_livre, created_at,
        veiculos(placa, modelo),
        motoristas(nome),
        postos(nome),
        validacoes(data_hora, litros, valor_cobrado, valor_unitario, hodometro, observacao,
          frentistas(nome))
      `)
      .eq('empresa_id', empresa.id)
      .eq('eh_livre', false)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error

    const requisicoes = (data ?? []).map((r: any) => {
      const v   = r.veiculos   as { placa: string; modelo: string } | null
      const m   = r.motoristas as { nome: string } | null
      const p   = r.postos     as { nome: string } | null
      const val = Array.isArray(r.validacoes) ? r.validacoes[0] : r.validacoes
      const fr  = val?.frentistas as { nome: string } | null

      const limiteDisplay =
        r.tipo_limite === 'tanque' ? 'Tanque cheio'
        : r.tipo_limite === 'valor'  ? `R$ ${Number(r.limite_valor).toFixed(2).replace('.', ',')}`
        : `${Number(r.limite_volume).toFixed(0)} L`

      return {
        id:          r.id,
        codigo:      r.codigo,
        criadaEm:    new Date(r.created_at).toLocaleDateString('pt-BR'),
        veiculo:     v ? `${v.placa} · ${v.modelo}` : '—',
        motorista:   m?.nome ?? '—',
        posto:       p?.nome ?? '—',
        combustivel: r.combustivel,
        limite:      limiteDisplay,
        validade:    new Date(r.validade).toLocaleDateString('pt-BR'),
        status:      r.status as string,
        validacao:   val ? {
          dataHora:    new Date(val.data_hora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).replace(',', ' às'),
          frentista:   fr?.nome ?? '—',
          litros:      `${Number(val.litros).toFixed(1).replace('.', ',')} L`,
          valorCobrado: `R$ ${Number(val.valor_cobrado).toFixed(2).replace('.', ',')}`,
          hodometro:   val.hodometro ? `${Number(val.hodometro).toLocaleString('pt-BR')} km` : '—',
          observacao:  val.observacao ?? undefined,
        } : undefined,
      }
    })

    return NextResponse.json({ requisicoes })
  } catch (err) {
    console.error('[requisicoes GET]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}

// POST /api/empresa/requisicoes — cria nova requisição
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const body = await req.json() as {
      veiculoId: string
      motoristaId: string | null
      parceriaId: string
      combustivel: string
      tipoLimite: 'valor' | 'volume' | 'tanque'
      limiteValor: number | null
      limiteVolume: number | null
      validade: string          // 'YYYY-MM-DD'
      quilometragem: number | null
      observacao: string | null
    }

    // Valida veículo pertence à empresa e está ativo
    const { data: veiculo } = await svc
      .from('veiculos')
      .select('id')
      .eq('id', body.veiculoId)
      .eq('empresa_id', empresa.id)
      .eq('status', 'ativo')
      .eq('bloqueado', false)
      .single()
    if (!veiculo) return NextResponse.json({ error: 'Veículo não encontrado ou indisponível.' }, { status: 422 })

    // Valida motorista (opcional) pertence à empresa
    if (body.motoristaId) {
      const { data: motorista } = await svc
        .from('motoristas')
        .select('id')
        .eq('id', body.motoristaId)
        .eq('empresa_id', empresa.id)
        .eq('status', 'ativo')
        .eq('bloqueado', false)
        .single()
      if (!motorista) return NextResponse.json({ error: 'Motorista não encontrado ou indisponível.' }, { status: 422 })
    }

    // Valida parceria e obtém posto_id
    const { data: parceria } = await svc
      .from('parcerias')
      .select('id, posto_id, postos(status)')
      .eq('id', body.parceriaId)
      .eq('empresa_id', empresa.id)
      .eq('status', 'ativa')
      .single()
    if (!parceria) return NextResponse.json({ error: 'Parceria não encontrada.' }, { status: 422 })

    // O posto também precisa estar ativo: antes disso, uma parceria ativa com posto
    // desativado ainda aceitava a requisição. A Vitrine já marca esse caso como
    // indisponível — aqui é a fronteira real, que não depende do frontend.
    const postoDaParceria = parceria.postos as unknown as { status: string } | null
    if (postoDaParceria?.status !== 'ativo') {
      return NextResponse.json({ error: 'Posto indisponível no momento.' }, { status: 422 })
    }

    // Validade: fim do dia selecionado (23:59:59 no horário local → ISO string)
    const validadeEOD = new Date(`${body.validade}T23:59:59`)
    if (isNaN(validadeEOD.getTime())) {
      return NextResponse.json({ error: 'Data de validade inválida.' }, { status: 422 })
    }
    if (validadeEOD < new Date()) {
      return NextResponse.json({ error: 'A validade não pode ser no passado.' }, { status: 422 })
    }

    const svcAny = svc as any

    const { data: req_, error: errReq } = await svcAny
      .from('requisicoes')
      .insert({
        empresa_id:    empresa.id,
        veiculo_id:    body.veiculoId,
        motorista_id:  body.motoristaId ?? null,
        parceria_id:   body.parceriaId,
        posto_id:      parceria.posto_id,
        combustivel:   body.combustivel,
        tipo_limite:   body.tipoLimite,
        limite_valor:  body.tipoLimite === 'valor'  ? body.limiteValor  : null,
        limite_volume: body.tipoLimite === 'volume' ? body.limiteVolume : null,
        validade:      validadeEOD.toISOString(),
        quilometragem: body.quilometragem ?? null,
        observacao:    body.observacao   ?? null,
        status:        'pendente',
        eh_livre:      false,
      })
      .select('id, codigo')
      .single()

    if (errReq) throw errReq

    return NextResponse.json({ ok: true, id: req_.id, codigo: req_.codigo })
  } catch (err) {
    console.error('[requisicoes POST]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
