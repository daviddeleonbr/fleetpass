import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'
import { maskCpfCnpj } from '@/lib/documento'

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string }
    return [e.message, e.details, e.hint].filter(Boolean).join(' · ') || 'Erro no banco.'
  }
  return String(err)
}

// GET /api/posto/empresas/buscar?q=<cnpj|nome>&postoId=<id>
// Busca transportadoras JÁ cadastradas (entidade global) para o posto convidar.
// Retorna o status do vínculo com o posto selecionado (disponível / convite / parceria / negociação).
export async function GET(req: NextRequest) {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any
    const { data: conta } = await svc.from('contas_posto').select('id').eq('perfil_id', user.id).single()
    if (!conta) return NextResponse.json({ error: 'Conta de posto não encontrada.' }, { status: 404 })

    const url = new URL(req.url)
    const q = (url.searchParams.get('q') ?? '').trim()
    const postoId = url.searchParams.get('postoId') ?? ''

    // postoId precisa pertencer à conta (anti-IDOR)
    if (postoId) {
      const { data: posto } = await svc.from('postos').select('id').eq('id', postoId).eq('conta_posto_id', conta.id).maybeSingle()
      if (!posto) return NextResponse.json({ error: 'Posto inválido.' }, { status: 400 })
    }

    if (q.length < 2) return NextResponse.json({ empresas: [] })

    const stripped = q.replace(/[^a-zA-Z0-9]/g, '')
    let query = svc.from('empresas').select('id, nome_empresa, cnpj, cidade, estado')
    if (stripped.length === 11 || stripped.length === 14) {
      // Documento completo → match exato pelo CNPJ formatado (como é armazenado)
      query = query.eq('cnpj', maskCpfCnpj(q))
    } else {
      // Parcial → busca por nome
      query = query.ilike('nome_empresa', `%${q}%`)
    }
    const { data: empresas } = await query.limit(10)
    const lista = (empresas ?? []) as Array<{ id: string; nome_empresa: string; cnpj: string; cidade: string; estado: string }>
    if (lista.length === 0) return NextResponse.json({ empresas: [] })

    // Status do vínculo com o posto selecionado
    const status: Record<string, string> = {}
    if (postoId) {
      const ids = lista.map((e) => e.id)
      const [{ data: parc }, { data: conv }, { data: sol }] = await Promise.all([
        svc.from('parcerias').select('empresa_id').eq('posto_id', postoId).in('empresa_id', ids).in('status', ['ativa', 'pendente_assinatura']),
        svc.from('convites').select('empresa_id').eq('posto_id', postoId).in('empresa_id', ids).eq('status', 'pendente'),
        svc.from('solicitacoes').select('empresa_id').eq('posto_id', postoId).in('empresa_id', ids).in('status', ['aguardando', 'proposta_recebida']),
      ])
      for (const p of parc ?? []) status[p.empresa_id] = 'parceria'
      for (const s of sol ?? []) if (!status[s.empresa_id]) status[s.empresa_id] = 'negociacao'
      for (const c of conv ?? []) if (!status[c.empresa_id]) status[c.empresa_id] = 'convite'
    }

    return NextResponse.json({
      empresas: lista.map((e) => ({
        id: e.id,
        nome: e.nome_empresa,
        cnpj: e.cnpj,
        cidade: e.cidade && e.estado ? `${e.cidade}, ${e.estado}` : (e.cidade || '—'),
        status: status[e.id] ?? 'disponivel',
      })),
    })
  } catch (err) {
    console.error('[posto/empresas/buscar]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
