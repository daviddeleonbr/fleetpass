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

function parseBrowser(ua: string): string {
  if (/Edg\//i.test(ua))    return `Microsoft Edge / ${parseOS(ua)}`
  if (/Chrome\//i.test(ua)) return `Chrome ${ua.match(/Chrome\/([\d.]+)/)?.[1]?.split('.')[0]} / ${parseOS(ua)}`
  if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) return `Safari / ${parseOS(ua)}`
  if (/Firefox\//i.test(ua)) return `Firefox ${ua.match(/Firefox\/([\d.]+)/)?.[1]?.split('.')[0]} / ${parseOS(ua)}`
  return ua.slice(0, 80)
}

/**
 * POST — empresa assina contrato com consentimento simples (sem certificado digital).
 * Só permitido se o contrato tiver exige_certificado = false.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: contratoId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()

    const { data: empresa } = await svc
      .from('empresas')
      .select('id')
      .eq('perfil_id', user.id)
      .single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const { data: contrato } = await (svc as any)
      .from('contratos')
      .select('id, parceria_id, empresa_id, posto_id, assinado_empresa_em, exige_certificado')
      .eq('id', contratoId)
      .single()

    if (!contrato) return NextResponse.json({ error: 'Contrato não encontrado.' }, { status: 404 })
    if (contrato.empresa_id !== empresa.id) {
      return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
    }
    if (contrato.exige_certificado) {
      return NextResponse.json(
        { error: 'Este contrato exige assinatura com certificado digital.' },
        { status: 409 },
      )
    }
    if (contrato.assinado_empresa_em) {
      return NextResponse.json({ error: 'Contrato já assinado pela empresa.' }, { status: 409 })
    }

    // Busca dados da parceria para compor o hash
    const { data: parceria } = await svc
      .from('parcerias')
      .select('combustiveis, ciclo_tipo, limite_credito, iniciada_em')
      .eq('id', contrato.parceria_id)
      .single()

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

    const hashInput = JSON.stringify({
      parceria_id:    contrato.parceria_id,
      empresa_id:     contrato.empresa_id,
      posto_id:       contrato.posto_id,
      combustiveis:   parceria?.combustiveis ?? null,
      ciclo_tipo:     parceria?.ciclo_tipo ?? null,
      limite_credito: parceria?.limite_credito ?? null,
      iniciada_em:    parceria?.iniciada_em ?? null,
      signed_by:      user.email,
      signed_at:      agora,
      role:           'empresa',
    })
    const authHash = 'sha256:' + crypto.createHash('sha256').update(hashInput).digest('hex')

    const { data: updated, error: updateError } = await (svc as any)
      .from('contratos')
      .update({
        assinado_empresa_em: agora,
        auth_method:         'sistema',
        auth_ip:             ip,
        auth_dispositivo:    dispositivo,
        auth_navegador:      navegador,
        auth_data:           agora,
        auth_hash:           authHash,
      })
      .eq('id', contratoId)
      .select()
      .single()

    if (updateError) throw updateError

    // Ativa a parceria se o posto também já assinou
    const { data: contratoFinal } = await svc
      .from('contratos')
      .select('assinado_posto_em')
      .eq('id', contratoId)
      .single()
    const ativou = !!contratoFinal?.assinado_posto_em
    if (ativou) {
      await svc.from('parcerias').update({ status: 'ativa' }).eq('id', contrato.parceria_id)
    }

    // Notifica o posto
    try {
      const { criarNotificacao, perfilDoPosto } = await import('@/lib/notificacoes')
      const destino = await perfilDoPosto(svc, contrato.posto_id)
      if (destino) {
        await criarNotificacao(svc, {
          perfilId: destino,
          tipo: ativou ? 'parceria_ativa' : 'contrato_assinado_contraparte',
          titulo: ativou ? 'Parceria ativada' : 'Empresa assinou o contrato',
          descricao: ativou
            ? 'Ambas as partes assinaram. A parceria está ativa.'
            : 'A empresa assinou o contrato. Aguardando sua assinatura.',
          link: '/posto/parcerias/solicitacoes',
        })
      }
    } catch {}

    return NextResponse.json({ contrato: updated, authHash, ip, dispositivo, navegador, assinado_em: agora })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
