import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const svc = createServiceClient()

    // Posto data
    const { data: posto, error: postoError } = await svc
      .from('postos')
      .select('id, nome, bandeira, endereco, numero, bairro, cidade, estado, combustiveis, telefone, status')
      .eq('id', id)
      .eq('status', 'ativo')
      .single()

    if (postoError || !posto) return NextResponse.json({ error: 'Posto não encontrado.' }, { status: 404 })

    // Reviews
    const { data: avaliacoes } = await svc
      .from('avaliacoes')
      .select('nota, comentario, util_count, created_at, empresas(nome_empresa)')
      .eq('posto_id', id)
      .order('created_at', { ascending: false })

    const notas = (avaliacoes ?? []).map((a) => a.nota)
    const avaliacao = notas.length ? parseFloat((notas.reduce((s, n) => s + n, 0) / notas.length).toFixed(1)) : null

    const distribuicao = [5, 4, 3, 2, 1].map((n) => ({
      nota: n,
      count: notas.filter((x) => x === n).length,
    }))

    // Check parceiro / solicitacao status (optional - needs auth)
    let parceiro = false
    let solicitacaoPendente = false
    try {
      const authClient = await createClient()
      const { data: { user } } = await authClient.auth.getUser()
      if (user) {
        const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
        if (empresa) {
          const { data: parc } = await svc.from('parcerias')
            .select('id').eq('posto_id', id).eq('empresa_id', empresa.id).eq('status', 'ativa').maybeSingle()
          parceiro = !!parc

          const { data: sol } = await svc.from('solicitacoes')
            .select('id').eq('posto_id', id).eq('empresa_id', empresa.id)
            .in('status', ['aguardando', 'proposta_recebida']).maybeSingle()
          solicitacaoPendente = !!sol
        }
      }
    } catch { /* sem sessão */ }

    const endereco = [posto.endereco, posto.numero, posto.bairro, posto.cidade, posto.estado].filter(Boolean).join(', ')

    return NextResponse.json({
      posto: { ...posto, endereco, avaliacao, totalAvaliacoes: notas.length, parceiro, solicitacaoPendente },
      avaliacoes: (avaliacoes ?? []).map((a) => ({
        empresa: (a.empresas as { nome_empresa: string } | null)?.nome_empresa ?? 'Empresa',
        nota: a.nota,
        data: new Date(a.created_at).toLocaleDateString('pt-BR'),
        texto: a.comentario ?? '',
        util: a.util_count,
      })),
      distribuicaoNotas: distribuicao,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
