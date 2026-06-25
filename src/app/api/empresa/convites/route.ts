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

// GET /api/empresa/convites — convites pendentes para a empresa do usuário
export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient() as any
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const { data: convites } = await svc
      .from('convites')
      .select('id, combustiveis, mensagem, status, expira_em, created_at, postos ( nome, cidade, estado, bandeira )')
      .eq('empresa_id', empresa.id)
      .eq('status', 'pendente')
      .order('created_at', { ascending: false })

    const lista = (convites ?? []).map((c: any) => {
      const p = c.postos as { nome: string; cidade: string; estado: string; bandeira: string } | null
      return {
        id:           c.id,
        combustiveis: c.combustiveis,
        mensagem:     c.mensagem,
        expira_em:    c.expira_em,
        created_at:   c.created_at,
        posto:        p?.nome ?? '—',
        cidade:       p ? `${p.cidade}, ${p.estado}` : '—',
        bandeira:     p?.bandeira ?? null,
      }
    })

    return NextResponse.json({ convites: lista })
  } catch (err) {
    console.error('[empresa/convites GET]', err)
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
