import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string }
    return [e.message, e.details, e.hint].filter(Boolean).join(' · ') || 'Erro no banco.'
  }
  return String(err)
}

// GET /api/posto/historico — abastecimentos concluídos nos postos da conta
export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any
    const { data: conta } = await svc.from('contas_posto').select('id').eq('perfil_id', user.id).single()
    if (!conta) return NextResponse.json({ error: 'Conta de posto não encontrada.' }, { status: 404 })

    const { data: postos } = await svc.from('postos').select('id, nome').eq('conta_posto_id', conta.id)
    const postoIds = (postos ?? []).map((p: any) => p.id)
    const postoNome: Record<string, string> = Object.fromEntries((postos ?? []).map((p: any) => [p.id, p.nome]))

    if (postoIds.length === 0) {
      return NextResponse.json({ historico: [], postos: [], empresas: [], combustiveis: [] })
    }

    const { data, error } = await svc
      .from('abastecimentos')
      .select(`
        id, data, combustivel, litros, valor, posto_id,
        empresas ( nome_empresa ),
        veiculos ( placa ),
        motoristas ( nome )
      `)
      .in('posto_id', postoIds)
      .order('data', { ascending: false })
      .limit(1000)
    if (error) throw error

    const historico = (data ?? []).map((a: any) => ({
      posto:       postoNome[a.posto_id] ?? '—',
      data:        new Date(a.data).toLocaleDateString('pt-BR'),
      empresa:     (a.empresas as { nome_empresa: string } | null)?.nome_empresa ?? '—',
      veiculo:     (a.veiculos as { placa: string } | null)?.placa ?? '—',
      motorista:   (a.motoristas as { nome: string } | null)?.nome ?? '—',
      combustivel: a.combustivel,
      litros:      `${Number(a.litros).toFixed(0)} L`,
      valor:       `R$ ${Number(a.valor).toFixed(2).replace('.', ',')}`,
    }))

    const uniq = (arr: string[]) => [...new Set(arr.filter(Boolean))].sort()

    return NextResponse.json({
      historico,
      postos:       (postos ?? []).map((p: any) => p.nome),
      empresas:     uniq(historico.map((h: any) => h.empresa)),
      combustiveis: uniq(historico.map((h: any) => h.combustivel)),
    })
  } catch (err) {
    console.error('[posto/historico]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
