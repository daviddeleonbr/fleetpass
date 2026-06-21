import crypto from 'crypto'

/**
 * Token assinado (HMAC-SHA256) embutido no QR Code de uma requisição.
 *
 * IMPORTANTE: o token é apenas uma REFERÊNCIA assinada (reqId + posto + expiração).
 * Ele NÃO carrega o código de autorização nem os dados do ticket — esses só são
 * revelados pelo backend ao MOTORISTA quando ele escaneia (ver rota /verificar).
 * Assim, o frentista — que segura o token para gerar o QR — não consegue extrair
 * o código inspecionando o QR. A assinatura impede QR forjado/adulterado.
 *
 * Formato do token: <payloadB64url>.<assinaturaB64url>
 * USO EXCLUSIVO NO SERVIDOR — depende de QR_SIGNING_SECRET.
 */

export interface QRRequisicaoPayload {
  reqId:   string   // id da requisição (resolvido no banco na verificação)
  postoId: string   // posto que emitiu (confere contra o estado atual)
  exp:     number   // epoch ms de expiração
}

function getSecret(): string {
  const s = process.env.QR_SIGNING_SECRET
  if (s && s.length >= 16) return s
  // Fallback: deriva da service role key para funcionar sem configuração extra.
  // Recomendado definir QR_SIGNING_SECRET dedicado em produção.
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (fallback) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[qr-token] QR_SIGNING_SECRET não definido — usando fallback derivado da service role key.')
    }
    return crypto.createHash('sha256').update('fuellink-qr:' + fallback).digest('hex')
  }
  throw new Error('QR_SIGNING_SECRET não configurado.')
}

const b64url = (buf: Buffer | string) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const fromB64url = (s: string) =>
  Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64')

function sign(dataB64: string): string {
  return b64url(crypto.createHmac('sha256', getSecret()).update(dataB64).digest())
}

/** Gera o token assinado a partir da referência (preenche exp se ausente). */
export function signRequisicaoToken(
  ref: { reqId: string; postoId: string; exp?: number },
  ttlMs = 5 * 60 * 1000,
): string {
  const full: QRRequisicaoPayload = {
    reqId:   ref.reqId,
    postoId: ref.postoId,
    exp:     ref.exp || Date.now() + ttlMs,
  }
  const dataB64 = b64url(JSON.stringify(full))
  return `${dataB64}.${sign(dataB64)}`
}

export type VerifyResult =
  | { ok: true;  payload: QRRequisicaoPayload }
  | { ok: false; reason: 'malformado' | 'assinatura' | 'expirado' }

/** Verifica a assinatura e a expiração do token. Não consulta o banco. */
export function verifyRequisicaoToken(token: string): VerifyResult {
  const parts = token.split('.')
  if (parts.length !== 2) return { ok: false, reason: 'malformado' }
  const [dataB64, sig] = parts

  const expected = sign(dataB64)
  const a = fromB64url(sig)
  const b = fromB64url(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'assinatura' }
  }

  let payload: QRRequisicaoPayload
  try {
    payload = JSON.parse(fromB64url(dataB64).toString('utf8'))
  } catch {
    return { ok: false, reason: 'malformado' }
  }

  if (!payload.exp || Date.now() > payload.exp) return { ok: false, reason: 'expirado' }
  return { ok: true, payload }
}

/** Monta o rótulo do limite a partir dos campos da requisição. */
export function formatLimite(
  tipo: string,
  valor: number | null,
  volume: number | null,
): string {
  if (tipo === 'tanque') return 'Tanque cheio'
  if (tipo === 'valor')  return `R$ ${Number(valor ?? 0).toFixed(2).replace('.', ',')}`
  return `${Number(volume ?? 0).toFixed(0)} L`
}
