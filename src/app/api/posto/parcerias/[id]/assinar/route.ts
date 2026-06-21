import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient, createServiceClient } from '@/lib/supabase-server'

function parseDevice(ua: string): string {
  if (/iPad/i.test(ua))    return 'iPad'
  if (/iPhone/i.test(ua))  return 'iPhone'
  if (/Android/i.test(ua)) {
    const m = ua.match(/Android[^;]*;\s*([^)]+)/)
    return m ? m[1].trim() : 'Android'
  }
  if (/Macintosh/i.test(ua)) return 'macOS'
  if (/Windows NT/i.test(ua)) return 'Windows PC'
  if (/Linux/i.test(ua))   return 'Linux PC'
  return 'Navegador'
}

function parseBrowser(ua: string): string {
  if (/Edg\//i.test(ua))    return `Microsoft Edge / ${parseOS(ua)}`
  if (/Chrome\//i.test(ua)) return `Chrome ${ua.match(/Chrome\/([\d.]+)/)?.[1]?.split('.')[0]} / ${parseOS(ua)}`
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return `Safari / ${parseOS(ua)}`
  if (/Firefox\//i.test(ua)) return `Firefox ${ua.match(/Firefox\/([\d.]+)/)?.[1]?.split('.')[0]} / ${parseOS(ua)}`
  return ua.slice(0, 80)
}

function parseOS(ua: string): string {
  if (/iPhone OS ([\d_]+)/i.test(ua)) return `iOS ${ua.match(/iPhone OS ([\d_]+)/i)?.[1]?.replace(/_/g, '.')}`
  if (/Android ([\d.]+)/i.test(ua))   return `Android ${ua.match(/Android ([\d.]+)/i)?.[1]}`
  if (/Mac OS X ([\d_]+)/i.test(ua))  return `macOS ${ua.match(/Mac OS X ([\d_]+)/i)?.[1]?.replace(/_/g, '.')}`
  if (/Windows NT ([\d.]+)/i.test(ua)) {
    const v = ua.match(/Windows NT ([\d.]+)/i)?.[1]
    const map: Record<string, string> = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' }
    return `Windows ${map[v ?? ''] ?? v}`
  }
  return 'desconhecido'
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: parceriaId } = await params

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()

    // Verifica que o posto pertence à conta do usuário
    const { data: conta } = await svc.from('contas_posto').select('id').eq('perfil_id', user.id).single()
    if (!conta) return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 })

    const { data: parceria } = await svc
      .from('parcerias')
      .select('id, empresa_id, posto_id, combustiveis, ciclo_tipo, ciclo_prazo_recebimento, limite_credito, iniciada_em')
      .eq('id', parceriaId)
      .single()
    if (!parceria) return NextResponse.json({ error: 'Parceria não encontrada.' }, { status: 404 })

    // Verifica que o posto pertence ao usuário
    const { data: postoCheck } = await svc
      .from('postos')
      .select('id')
      .eq('id', parceria.posto_id)
      .eq('conta_posto_id', conta.id)
      .single()
    if (!postoCheck) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })

    const { data: contrato } = await svc
      .from('contratos')
      .select('id, assinado_posto_em')
      .eq('parceria_id', parceriaId)
      .single()
    if (!contrato) return NextResponse.json({ error: 'Contrato não encontrado.' }, { status: 404 })

    if (contrato.assinado_posto_em) {
      return NextResponse.json({ error: 'Contrato já assinado pelo posto.' }, { status: 409 })
    }

    // Coleta dados de autenticação
    let body: { clientIp?: string } = {}
    try { body = await req.json() } catch { /* sem body */ }

    const ip =
      body.clientIp ||
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '0.0.0.0'
    const ua          = req.headers.get('user-agent') ?? ''
    const dispositivo = parseDevice(ua)
    const navegador   = parseBrowser(ua)
    const agora       = new Date().toISOString()

    // Gera hash SHA-256 do conteúdo do contrato
    const hashInput = JSON.stringify({
      parceria_id:    parceriaId,
      empresa_id:     parceria.empresa_id,
      posto_id:       parceria.posto_id,
      combustiveis:   parceria.combustiveis,
      ciclo_tipo:     parceria.ciclo_tipo,
      limite_credito: parceria.limite_credito,
      iniciada_em:    parceria.iniciada_em,
      signed_by:      user.email,
      signed_at:      agora,
      role:           'posto',
    })
    const authHashPosto = 'sha256:' + crypto.createHash('sha256').update(hashInput).digest('hex')

    // Grava nos campos exclusivos do posto (_posto)
    const updatePayload: Record<string, string> = {
      assinado_posto_em:        agora,
      auth_ip_posto:            ip,
      auth_navegador_posto:     navegador,
      auth_dispositivo_posto:   dispositivo,
      auth_data_posto:          agora,
      auth_hash_posto:          authHashPosto,
    }

    const { data: updated, error: updateError } = await svc
      .from('contratos')
      .update(updatePayload)
      .eq('id', contrato.id)
      .select()
      .single()

    if (updateError) throw updateError

    // Ativa a parceria se a empresa também já assinou
    const { data: contratoFinal } = await svc
      .from('contratos').select('assinado_empresa_em').eq('id', contrato.id).single()
    const ativou = !!contratoFinal?.assinado_empresa_em
    if (ativou) {
      await svc.from('parcerias').update({ status: 'ativa' }).eq('id', parceriaId)
    }

    // Notifica a empresa
    try {
      const { criarNotificacao, perfilDaEmpresa } = await import('@/lib/notificacoes')
      const destino = await perfilDaEmpresa(svc, parceria.empresa_id)
      if (destino) {
        await criarNotificacao(svc, {
          perfilId: destino,
          tipo: ativou ? 'parceria_ativa' : 'contrato_assinado_contraparte',
          titulo: ativou ? 'Parceria ativada' : 'Posto assinou o contrato',
          descricao: ativou
            ? 'Ambas as partes assinaram. A parceria está ativa.'
            : 'O posto assinou o contrato. Aguardando sua assinatura.',
          link: '/empresa/parcerias',
        })
      }
    } catch {}

    return NextResponse.json({ contrato: updated, authHash: authHashPosto, ip, dispositivo, navegador, assinado_em: agora })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
