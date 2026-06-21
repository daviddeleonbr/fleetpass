import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { formatLimite } from '@/lib/qr-token'

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string }
    return [e.message, e.details, e.hint].filter(Boolean).join(' · ') || 'Erro no banco.'
  }
  return String(err)
}

/**
 * GET /api/frentista/requisicao/liberadas
 *
 * Lista as requisições já LIBERADAS (status 'ativo') no posto do frentista —
 * abastecimentos aguardando o registro de litros/valor. Após registrar, a
 * requisição vira 'concluido' e sai desta lista.
 */
export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any
    const { data: frentista } = await svc
      .from('frentistas')
      .select('id, posto_id, status')
      .eq('perfil_id', user.id)
      .single()
    if (!frentista || frentista.status !== 'ativo') {
      return NextResponse.json({ error: 'Apenas frentistas ativos podem registrar.' }, { status: 403 })
    }

    const { data, error } = await svc
      .from('requisicoes')
      .select(`
        id, codigo, combustivel, tipo_limite, limite_valor, limite_volume, validade, updated_at,
        veiculos ( placa, modelo, exigir_quilometragem ),
        motoristas ( nome ),
        empresas ( nome_empresa ),
        postos ( nome )
      `)
      .eq('posto_id', frentista.posto_id)
      .eq('status', 'ativo')
      .eq('eh_livre', false)
      .order('updated_at', { ascending: false })
      .limit(100)
    if (error) throw error

    const liberadas = (data ?? []).map((r: any) => {
      const v = r.veiculos   as { placa: string; modelo: string; exigir_quilometragem: boolean } | null
      const m = r.motoristas as { nome: string } | null
      const e = r.empresas   as { nome_empresa: string } | null
      const p = r.postos     as { nome: string } | null
      return {
        id:           r.id,
        codigo:       r.codigo,
        placa:        v?.placa ?? '—',
        veiculo:      v ? `${v.placa} · ${v.modelo}` : '—',
        exigirHodometro: !!v?.exigir_quilometragem,
        motorista:    m?.nome ?? null,
        empresa:      e?.nome_empresa ?? null,
        combustivel:  r.combustivel,
        limite:       formatLimite(r.tipo_limite, r.limite_valor, r.limite_volume),
        tipoLimite:   r.tipo_limite,
        posto:        p?.nome ?? '—',
        validade:     r.validade,
      }
    })

    return NextResponse.json({ liberadas })
  } catch (err) {
    console.error('[frentista/requisicao/liberadas]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
