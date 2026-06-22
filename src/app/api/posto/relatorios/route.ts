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

/**
 * GET /api/posto/relatorios — abastecimentos dos postos da conta, no formato
 * consumido pelos relatórios (mesma shape do antigo mock). A agregação por
 * empresa/combustível/período acontece no cliente.
 */
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
    const postosOpt = [
      { id: 'todos', label: 'Todos os postos' },
      ...(postos ?? []).map((p: any) => ({ id: p.id, label: p.nome })),
    ]
    if (postoIds.length === 0) return NextResponse.json({ abastecimentos: [], postos: postosOpt })

    const { data, error } = await svc
      .from('abastecimentos')
      .select(`
        codigo, data, posto_id, combustivel, litros, valor_unitario, valor, status,
        empresas ( nome_empresa, cnpj, perfis ( nome, telefone, email ) ),
        veiculos ( placa ),
        motoristas ( nome )
      `)
      .in('posto_id', postoIds)
      .order('data', { ascending: false })
      .limit(2000)
    if (error) throw error

    const abastecimentos = (data ?? []).map((a: any) => {
      const emp = a.empresas as { nome_empresa: string; cnpj: string; perfis: { nome: string; telefone: string; email: string } | null } | null
      const p = emp?.perfis ?? null
      return {
        codigo:        a.codigo,
        data:          new Date(a.data).toLocaleDateString('pt-BR'),
        posto:         a.posto_id,
        empresa:       emp?.nome_empresa ?? '—',
        cnpj:          emp?.cnpj ?? '—',
        responsavel:   p?.nome ?? '—',
        telefone:      p?.telefone ?? '',
        email:         p?.email ?? '',
        veiculo:       (a.veiculos as { placa: string } | null)?.placa ?? '—',
        motorista:     (a.motoristas as { nome: string } | null)?.nome ?? '—',
        combustivel:   a.combustivel,
        litros:        Number(a.litros),
        valorUnitario: Number(a.valor_unitario),
        valor:         Number(a.valor),
        status:        a.status as 'faturado' | 'pendente' | 'contestado',
      }
    })

    return NextResponse.json({ abastecimentos, postos: postosOpt })
  } catch (err) {
    console.error('[posto/relatorios]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
