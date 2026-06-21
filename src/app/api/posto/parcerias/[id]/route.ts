import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()

    const { data: parceria, error } = await svc
      .from('parcerias')
      .select(`
        id, status, iniciada_em, combustiveis, ciclo_tipo,
        ciclo_intervalo_dias, ciclo_prazo_recebimento, limite_credito,
        empresas ( nome_empresa, cnpj, cidade, estado ),
        postos ( nome, cnpj, endereco, numero, bairro, cidade, estado ),
        contratos ( auth_hash, auth_ip, auth_dispositivo, auth_navegador, auth_data,
                    auth_method, auth_cert_subject, auth_cert_issuer, auth_cert_serial, auth_cert_validade,
                    auth_hash_posto, auth_ip_posto, auth_dispositivo_posto, auth_navegador_posto, auth_data_posto,
                    assinado_empresa_em, assinado_posto_em )
      `)
      .eq('id', id)
      .single()

    if (error || !parceria) return NextResponse.json({ error: 'Parceria não encontrada.' }, { status: 404 })

    // Verify the posto belongs to this user
    const { data: conta } = await svc
      .from('contas_posto')
      .select('id')
      .eq('perfil_id', user.id)
      .single()

    if (!conta) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })

    const { data: postoCheck } = await svc
      .from('postos')
      .select('id')
      .eq('cnpj', (parceria.postos as { cnpj: string })?.cnpj ?? '')
      .eq('conta_posto_id', conta.id)
      .single()

    if (!postoCheck) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })

    // Busca tokens de assinatura para a timeline
    const { data: tokens } = await (svc as any)
      .from('assinatura_tokens')
      .select('id, role, created_at, used_at, expires_at')
      .eq('parceria_id', id)
      .order('created_at', { ascending: true })

    return NextResponse.json({ parceria, tokens: tokens ?? [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
