import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// GET — retorna todas as configurações
export async function GET() {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('configuracoes')
      .select('chave, valor, descricao')

    if (error) throw error
    return NextResponse.json({ configuracoes: data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH — atualiza uma chave específica
export async function PATCH(req: NextRequest) {
  try {
    const { chave, valor } = await req.json()
    if (!chave || valor === undefined) {
      return NextResponse.json({ error: 'chave e valor são obrigatórios.' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase
      .from('configuracoes')
      .update({ valor: String(valor) })
      .eq('chave', chave)

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
