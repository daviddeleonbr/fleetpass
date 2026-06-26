import crypto from 'crypto'

/** Token opaco para o link público do convite. */
export function gerarTokenConvite(): string {
  return crypto.randomBytes(24).toString('hex')
}

interface EmailConviteInput {
  to: string
  postoNome: string
  link: string
  mensagem?: string | null
}

/**
 * Envia o e-mail de convite via Resend (API REST, sem SDK). Não-fatal: nunca
 * interrompe o fluxo que a chamou; retorna true se enviou. No-op sem RESEND_API_KEY.
 */
export async function enviarEmailConvite({ to, postoNome, link, mensagem }: EmailConviteInput): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  if (!key || !from) return false

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">
    <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:20px">
      <div style="width:32px;height:32px;border-radius:8px;background:#0e8285;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:700">FL</div>
      <span style="font-size:18px;font-weight:700">FuelLink</span>
    </div>
    <h1 style="font-size:20px;margin:0 0 8px">${escapeHtml(postoNome)} convidou você para o FuelLink</h1>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px">
      Gerencie os abastecimentos da sua frota neste posto: emita requisições pré-aprovadas,
      controle limites por veículo e acompanhe o faturamento — tudo em um só lugar.
    </p>
    ${mensagem ? `<blockquote style="border-left:3px solid #0e8285;margin:0 0 16px;padding:8px 14px;background:#f0fdfa;color:#0f766e;font-size:13px">${escapeHtml(mensagem)}</blockquote>` : ''}
    <a href="${link}" style="display:inline-block;background:#0e8285;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;font-size:14px">Aceitar convite</a>
    <p style="color:#94a3b8;font-size:12px;margin:20px 0 0">
      Se o botão não funcionar, copie e cole este link no navegador:<br>
      <span style="color:#0e8285;word-break:break-all">${link}</span>
    </p>
  </div>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to,
        subject: `${postoNome} convidou você para o FuelLink`,
        html,
      }),
    })
    if (!res.ok) {
      // Causa comum: domínio do RESEND_FROM não verificado no Resend.
      const detalhe = await res.text().catch(() => '')
      console.error(`[convites] Resend recusou o envio (${res.status}):`, detalhe)
    }
    return res.ok
  } catch (err) {
    console.error('[convites] falha ao enviar e-mail:', err)
    return false
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!
  ))
}
