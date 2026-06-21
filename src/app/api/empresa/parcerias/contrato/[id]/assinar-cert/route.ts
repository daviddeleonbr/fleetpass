/**
 * POST /api/empresa/parcerias/contrato/[id]/assinar-cert
 *
 * Assina o contrato com certificado digital A1 (ICP-Brasil).
 *
 * Fluxo:
 *   1. Cliente (browser) carrega o .pfx com node-forge, assina o payload e envia:
 *      { signature, certificate, payload }
 *   2. Este endpoint verifica a assinatura RSA com a chave pública do certificado
 *   3. Verifica que o payload.parceria_id corresponde ao contrato e pertence à empresa
 *   4. Verifica que o payload.timestamp é recente (anti-replay ≤ 5 min)
 *   5. Grava na tabela contratos os metadados do certificado + hash do contrato
 *
 * Tipo de assinatura: Assinatura Eletrônica Qualificada (ICP-Brasil A1)
 * Amparo legal: Lei 14.063/2020, MP 2.200-2/2001
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import forge  from 'node-forge'
import { createClient, createServiceClient } from '@/lib/supabase-server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: parceriaId } = await params

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user)
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()

    const { data: empresa } = await svc
      .from('empresas').select('id, cnpj').eq('perfil_id', user.id).single()
    if (!empresa)
      return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const { data: parceria } = await svc
      .from('parcerias')
      .select('id, empresa_id, posto_id, combustiveis, ciclo_tipo, limite_credito, iniciada_em')
      .eq('id', parceriaId)
      .eq('empresa_id', empresa.id)
      .single()
    if (!parceria)
      return NextResponse.json({ error: 'Parceria não encontrada.' }, { status: 404 })

    const { data: contrato } = await svc
      .from('contratos')
      .select('id, assinado_empresa_em')
      .eq('parceria_id', parceriaId)
      .single()
    if (!contrato)
      return NextResponse.json({ error: 'Contrato não encontrado.' }, { status: 404 })

    if (contrato.assinado_empresa_em)
      return NextResponse.json({ error: 'Contrato já assinado pela empresa.' }, { status: 409 })

    // ── Recebe dados do cliente ──────────────────────────────────────────────
    const body = await req.json() as {
      signature:   string  // base64 RSA PKCS#1 v1.5 SHA-256
      certificate: string  // PEM do certificado
      payload:     string  // JSON string exatamente como assinado
    }

    const { signature, certificate, payload: payloadStr } = body
    if (!signature || !certificate || !payloadStr)
      return NextResponse.json({ error: 'Dados incompletos.' }, { status: 400 })

    // ── Verifica payload ─────────────────────────────────────────────────────
    let payload: Record<string, string>
    try { payload = JSON.parse(payloadStr) } catch {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
    }

    if (payload.parceria_id !== parceriaId)
      return NextResponse.json({ error: 'Parceria ID não confere.' }, { status: 422 })

    // Anti-replay: timestamp deve estar dentro dos últimos 5 minutos
    const tsAge = Date.now() - new Date(payload.timestamp).getTime()
    if (isNaN(tsAge) || tsAge > 5 * 60 * 1000 || tsAge < 0)
      return NextResponse.json({ error: 'Timestamp expirado ou inválido.' }, { status: 422 })

    // ── Valida assinatura RSA com a chave pública do certificado ─────────────
    let cert: forge.pki.Certificate
    try { cert = forge.pki.certificateFromPem(certificate) } catch {
      return NextResponse.json({ error: 'Certificado PEM inválido.' }, { status: 422 })
    }

    // Verifica validade do certificado
    const now = new Date()
    if (cert.validity.notAfter < now)
      return NextResponse.json({ error: 'Certificado digital expirado.' }, { status: 422 })
    if (cert.validity.notBefore > now)
      return NextResponse.json({ error: 'Certificado ainda não é válido.' }, { status: 422 })

    // Verifica assinatura
    const md = forge.md.sha256.create()
    md.update(payloadStr, 'utf8')
    let signatureValid = false
    try {
      signatureValid = (cert.publicKey as forge.pki.rsa.PublicKey).verify(
        md.digest().bytes(),
        forge.util.decode64(signature),
      )
    } catch {
      return NextResponse.json({ error: 'Erro ao verificar assinatura.' }, { status: 422 })
    }
    if (!signatureValid)
      return NextResponse.json({ error: 'Assinatura inválida — certificado não confere com a chave privada usada.' }, { status: 422 })

    // ── Verifica que o CNPJ do certificado pertence à empresa ────────────────
    const cnpjEmpresa = (empresa.cnpj ?? '').replace(/\D/g, '')
    // Em certificados ICP-Brasil A1 (PJ), o CNPJ aparece no campo CN ou nos
    // atributos do subject (OID 2.16.76.1.3.3) ou como parte do CN.
    const certCN = (cert.subject.getField('CN')?.value as string) ?? ''
    // Extrai todos os dígitos contíguos com 14 chars (CNPJ) presentes no CN
    const cnpjsNoCert: string[] = certCN.match(/\d{14}/g) ?? []
    // Também tenta extrair do OID brasileiro (2.16.76.1.3.3) se presente
    const oidBrCnpj = cert.subject.getField({ name: '', type: '2.16.76.1.3.3' })
    if (oidBrCnpj?.value) {
      const oidDigits = (oidBrCnpj.value as string).replace(/\D/g, '')
      if (oidDigits.length >= 14) cnpjsNoCert.push(oidDigits.slice(0, 14))
    }

    if (cnpjEmpresa.length === 14) {
      const cnpjConfere = cnpjsNoCert.some(c => c === cnpjEmpresa)
      if (!cnpjConfere) {
        return NextResponse.json(
          { error: `O certificado digital não pertence ao CNPJ da empresa (${empresa.cnpj}). Utilize o certificado emitido para este CNPJ.` },
          { status: 422 },
        )
      }
    }

    // ── Extrai metadados do certificado ──────────────────────────────────────
    const certSubject  = certCN || cert.subject.attributes.map(a => `${a.shortName}=${a.value}`).join(', ')
    const certIssuer   = cert.issuer.getField('CN')?.value   as string ?? cert.issuer.attributes.map(a => `${a.shortName}=${a.value}`).join(', ')
    const certSerial   = (cert.serialNumber as string) || '—'
    const certValidade = cert.validity.notAfter ? cert.validity.notAfter.toISOString().split('T')[0] : '—'

    // ── Gera auth_hash do contrato ───────────────────────────────────────────
    const agora = new Date().toISOString()
    const ip =
      (body as Record<string, string>).clientIp ||
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '0.0.0.0'

    const hashInput = JSON.stringify({
      parceria_id:    parceriaId,
      empresa_id:     empresa.id,
      posto_id:       parceria.posto_id,
      combustiveis:   parceria.combustiveis,
      ciclo_tipo:     parceria.ciclo_tipo,
      limite_credito: parceria.limite_credito,
      iniciada_em:    parceria.iniciada_em,
      signed_by:      certSubject,
      signed_at:      agora,
      role:           'empresa',
      method:         'certificado_a1',
    })
    const authHash = 'sha256:' + crypto.createHash('sha256').update(hashInput).digest('hex')

    const { data: updated, error: updateError } = await svc
      .from('contratos')
      .update({
        auth_ip:            ip,
        auth_data:          agora,
        auth_hash:          authHash,
        auth_method:        'certificado_a1',
        auth_cert_subject:  certSubject,
        auth_cert_issuer:   certIssuer,
        auth_cert_serial:   certSerial,
        auth_cert_validade: certValidade,
        auth_signature:     signature,  // guarda apenas para auditoria
        assinado_empresa_em: agora,
      })
      .eq('id', contrato.id)
      .select()
      .single()

    if (updateError) throw updateError

    // Ativa a parceria se o posto também já assinou
    const { data: contratoFinal } = await svc
      .from('contratos').select('assinado_posto_em, posto_id').eq('id', contrato.id).single()
    const ativou = !!contratoFinal?.assinado_posto_em
    if (ativou) {
      await svc.from('parcerias').update({ status: 'ativa' }).eq('id', parceriaId)
    }

    // Notifica o posto
    try {
      const { criarNotificacao, perfilDoPosto } = await import('@/lib/notificacoes')
      const postoId = (contratoFinal as any)?.posto_id
      if (postoId) {
        const destino = await perfilDoPosto(svc, postoId)
        if (destino) {
          await criarNotificacao(svc, {
            perfilId: destino,
            tipo: ativou ? 'parceria_ativa' : 'contrato_assinado_contraparte',
            titulo: ativou ? 'Parceria ativada' : 'Empresa assinou o contrato',
            descricao: ativou
              ? 'Ambas as partes assinaram. A parceria está ativa.'
              : 'A empresa assinou o contrato com certificado digital. Aguardando sua assinatura.',
            link: '/posto/parcerias/solicitacoes',
          })
        }
      }
    } catch {}

    return NextResponse.json({
      assinado_em:    agora,
      method:         'certificado_a1',
      cert_subject:   certSubject,
      cert_issuer:    certIssuer,
      cert_serial:    certSerial,
      cert_validade:  certValidade,
      auth_ip:        ip,
      auth_hash:      authHash,
      contrato:       updated,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
