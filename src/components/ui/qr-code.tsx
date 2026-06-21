'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeProps {
  /** Conteúdo a codificar (URL ou texto). */
  value: string
  size?: number
  /** Margem (quiet zone) em módulos. */
  margin?: number
}

/**
 * QR Code real e escaneável, renderizado em <canvas> via a lib `qrcode`.
 * Substitui o FakeQR (que era apenas decorativo).
 */
export function QRCodeCanvas({ value, size = 200, margin = 2 }: QRCodeProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    QRCode.toCanvas(
      ref.current,
      value,
      { width: size, margin, errorCorrectionLevel: 'M', color: { dark: '#111827', light: '#ffffff' } },
      (err) => setError(!!err),
    )
  }, [value, size, margin])

  if (error) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center text-xs text-red-500 bg-red-50 rounded-lg"
      >
        Erro ao gerar QR
      </div>
    )
  }

  return <canvas ref={ref} width={size} height={size} style={{ display: 'block' }} />
}
