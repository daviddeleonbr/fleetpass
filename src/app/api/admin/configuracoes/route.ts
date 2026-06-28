import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminError } from '@/lib/admin-auth'

// GET — retorna todas as configurações
export async function GET() {
  const a = await requireAdmin()
  if (!a.ok) return a.response
  const svc = a.svc as any
  try {
    const { data, error } = await svc.from('configuracoes').select('chave, valor, descricao')
    if (error) throw error
    return NextResponse.json({ configuracoes: data })
  } catch (err) {
    return NextResponse.json({ error: adminError(err) }, { status: 500 })
  }
}

// PATCH — atualiza uma chave específica
export async function PATCH(req: NextRequest) {
  const a = await requireAdmin()
  if (!a.ok) return a.response
  const svc = a.svc as any
  try {
    const { chave, valor } = await req.json()
    if (!chave || valor === undefined) {
      return NextResponse.json({ error: 'chave e valor são obrigatórios.' }, { status: 400 })
    }
    const { error } = await svc.from('configuracoes').update({ valor: String(valor) }).eq('chave', chave)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: adminError(err) }, { status: 500 })
  }
}
