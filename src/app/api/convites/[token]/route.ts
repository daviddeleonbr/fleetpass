import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

// GET /api/convites/[token] — PÚBLICO (sem sessão). Valida o token via service
// client e devolve dados mínimos para pré-preencher o cadastro/aceite. Não vaza
// e-mail completo nem IDs internos.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    if (!token) return NextResponse.json({ error: 'Token ausente.' }, { status: 400 })

    const svc = createServiceClient() as any
    const { data: convite } = await svc
      .from('convites')
      .select('status, expira_em, email_destino, cnpj_destino, nome_empresa_sugerido, combustiveis, mensagem, empresa_id, postos ( nome, cidade, estado )')
      .eq('token', token)
      .maybeSingle()

    if (!convite) return NextResponse.json({ error: 'Convite não encontrado.' }, { status: 404 })

    const expirado = convite.expira_em && new Date(convite.expira_em) < new Date()
    const valido = convite.status === 'pendente' && !expirado
    const p = convite.postos as { nome: string; cidade: string; estado: string } | null

    return NextResponse.json({
      valido,
      status:       expirado && convite.status === 'pendente' ? 'expirado' : convite.status,
      posto:        p?.nome ?? '—',
      cidade:       p ? `${p.cidade}, ${p.estado}` : '—',
      email:        convite.email_destino,
      cnpj:         convite.cnpj_destino,
      nomeEmpresa:  convite.nome_empresa_sugerido,
      combustiveis: convite.combustiveis ?? [],
      mensagem:     convite.mensagem,
      jaCadastrada: !!convite.empresa_id, // empresa global já existe → deve logar e aceitar em /empresa/convites
    })
  } catch (err) {
    console.error('[convites/[token] GET]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
