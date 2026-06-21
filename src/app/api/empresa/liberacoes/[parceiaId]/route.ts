import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

// PUT /api/empresa/liberacoes/[parceiaId] — upsert configuração de liberação
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ parceiaId: string }> },
) {
  try {
    const { parceiaId } = await params

    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    // Garante que a parceria pertence à empresa
    const { data: parceria } = await svc
      .from('parcerias').select('id').eq('id', parceiaId).eq('empresa_id', empresa.id).eq('status', 'ativa').single()
    if (!parceria) return NextResponse.json({ error: 'Parceria não encontrada.' }, { status: 404 })

    const body = await req.json() as {
      ativa: boolean
      veiculosConfig: 'todos' | 'selecionados'
      veiculosIds: string[]
      usarLimitePorAbast: boolean
      limiteTipo: 'valor' | 'volume' | null
      limitePorAbast: number | null
      usarLimiteMensal: boolean
      limiteMensal: number | null
    }

    // Upsert liberacao
    const { data: lib, error: errLib } = await svc
      .from('liberacoes')
      .upsert({
        parceria_id:          parceiaId,
        ativa:                body.ativa,
        veiculos_config:      body.veiculosConfig,
        usar_limite_por_abast: body.usarLimitePorAbast,
        limite_tipo:          body.usarLimitePorAbast ? body.limiteTipo : null,
        limite_por_abast:     body.usarLimitePorAbast ? body.limitePorAbast : null,
        usar_limite_mensal:   body.usarLimiteMensal,
        limite_mensal:        body.usarLimiteMensal ? body.limiteMensal : null,
      }, { onConflict: 'parceria_id' })
      .select('id')
      .single()

    if (errLib) throw errLib

    // Sincroniza veículos selecionados
    await svc.from('liberacao_veiculos').delete().eq('liberacao_id', lib.id)

    if (body.veiculosConfig === 'selecionados' && body.veiculosIds.length > 0) {
      await svc.from('liberacao_veiculos').insert(
        body.veiculosIds.map(vid => ({ liberacao_id: lib.id, veiculo_id: vid }))
      )
    }

    return NextResponse.json({ ok: true, liberacaoId: lib.id })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
