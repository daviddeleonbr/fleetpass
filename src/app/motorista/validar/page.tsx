'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  QrCode, Camera, CheckCircle2, XCircle, Car, Fuel, Gauge, MapPin,
  Loader2, ArrowLeft, ShieldCheck, Copy, Check,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface ValidaResult {
  valido: boolean
  motivo?: string
  codigo?: string
  requisicao?: {
    veiculo: string
    combustivel: string
    limite: string
    posto: string
  }
}

/** Extrai o token do conteúdo lido do QR (pode ser uma URL `...?t=token` ou o token cru). */
function extractToken(text: string): string | null {
  try {
    const url = new URL(text)
    const t = url.searchParams.get('t')
    if (t) return t
  } catch {
    // não é URL — segue para checagem de formato cru
  }
  // token cru tem o formato <base64url>.<base64url>
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(text.trim())) return text.trim()
  return null
}

function ValidarMotoristaInner() {
  const params  = useSearchParams()
  const urlToken = params.get('t')

  const [result, setResult]     = useState<ValidaResult | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [copied, setCopied]     = useState(false)

  const copiarCodigo = () => {
    if (!result?.codigo) return
    navigator.clipboard.writeText(result.codigo).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null)

  const verificar = useCallback(async (token: string) => {
    setVerifying(true)
    setScanError('')
    try {
      const res = await fetch('/api/frentista/requisicao/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data: ValidaResult = await res.json()
      setResult(data)
    } catch {
      setResult({ valido: false, motivo: 'Falha de conexão ao verificar o QR.' })
    } finally {
      setVerifying(false)
    }
  }, [])

  // Se chegou via URL escaneada (?t=...), verifica automaticamente.
  useEffect(() => {
    if (urlToken) verificar(urlToken)
  }, [urlToken, verificar])

  const stopScanner = useCallback(async () => {
    try {
      await scannerRef.current?.stop()
      scannerRef.current?.clear()
    } catch { /* noop */ }
    scannerRef.current = null
    setScanning(false)
  }, [])

  const iniciarScan = useCallback(async () => {
    setScanError('')
    setResult(null)
    setScanning(true)
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner as unknown as { stop: () => Promise<void>; clear: () => void }
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decoded: string) => {
          const token = extractToken(decoded)
          await stopScanner()
          if (token) verificar(token)
          else setScanError('QR Code não reconhecido pelo FuelLink.')
        },
        () => { /* ignora frames sem leitura */ },
      )
    } catch {
      setScanning(false)
      setScanError('Não foi possível acessar a câmera. Verifique as permissões.')
    }
  }, [stopScanner, verificar])

  useEffect(() => () => { void stopScanner() }, [stopScanner])

  const reset = () => { setResult(null); setScanError('') }

  return (
    <div className="max-w-md mx-auto space-y-4">
      <Link href="/motorista" className="inline-flex items-center gap-2 text-sm text-blue-600 font-medium">
        <ArrowLeft size={16} /> Voltar
      </Link>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Validar QR do frentista</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Escaneie o QR Code exibido pelo frentista para confirmar os dados do abastecimento.
        </p>
      </div>

      {/* ── Verificando ── */}
      {verifying && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-blue-500" />
          <p className="text-sm font-medium text-gray-600">Verificando QR Code…</p>
        </div>
      )}

      {/* ── Resultado válido ── */}
      {!verifying && result?.valido && result.requisicao && (
        <div className="space-y-4">
          <div className="bg-emerald-500 text-white rounded-2xl px-5 py-4 flex items-center gap-3">
            <CheckCircle2 size={22} />
            <div>
              <p className="font-bold text-base">QR Code válido</p>
              <p className="text-emerald-100 text-xs mt-0.5">Informe o código abaixo ao frentista.</p>
            </div>
          </div>

          {/* Código liberado — em destaque */}
          <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-sm p-5 text-center">
            <p className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Código de autorização</p>
            <p className="text-3xl font-mono font-bold text-blue-700 tracking-widest break-all">
              {result.codigo}
            </p>
            <button
              onClick={copiarCodigo}
              className="mt-3 inline-flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
              {copied ? 'Copiado!' : 'Copiar código'}
            </button>
            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
              Passe este código para o frentista digitar no sistema e liberar o abastecimento.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {[
              { icon: Car,  label: 'Veículo',     value: result.requisicao.veiculo },
              { icon: Fuel, label: 'Combustível', value: result.requisicao.combustivel },
              { icon: Gauge, label: 'Limite',     value: result.requisicao.limite },
              { icon: MapPin, label: 'Posto',     value: result.requisicao.posto },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                  <item.icon size={15} className="text-gray-500" />
                </div>
                <span className="text-[11px] text-gray-400 flex-1">{item.label}</span>
                <span className="text-sm font-medium text-gray-900 text-right">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 justify-center">
            <ShieldCheck size={13} className="text-emerald-500" /> Verificado pela assinatura digital do FuelLink
          </div>

          <Button variant="secondary" className="w-full" onClick={reset}>Escanear outro</Button>
        </div>
      )}

      {/* ── Resultado inválido ── */}
      {!verifying && result && !result.valido && (
        <div className="space-y-4">
          <div className="bg-red-500 text-white rounded-2xl px-5 py-4 flex items-center gap-3">
            <XCircle size={22} />
            <div>
              <p className="font-bold text-base">QR Code inválido</p>
              <p className="text-red-100 text-xs mt-0.5">{result.motivo ?? 'Não foi possível validar.'}</p>
            </div>
          </div>
          <Button className="w-full" onClick={() => { reset(); iniciarScan() }}>
            <Camera size={16} /> Escanear novamente
          </Button>
        </div>
      )}

      {/* ── Idle / Scanner ── */}
      {!verifying && !result && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          {/* container do leitor */}
          <div
            id="qr-reader"
            className={`mx-auto overflow-hidden rounded-xl ${scanning ? 'block' : 'hidden'}`}
            style={{ width: '100%', maxWidth: 320 }}
          />

          {!scanning ? (
            <>
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <QrCode size={26} className="text-blue-600" />
                </div>
                <p className="text-sm text-gray-500 max-w-xs">
                  Aponte a câmera para o QR Code gerado pelo frentista.
                </p>
              </div>
              {scanError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-center">
                  {scanError}
                </p>
              )}
              <Button className="w-full" onClick={iniciarScan}>
                <Camera size={16} /> Abrir câmera e escanear
              </Button>
            </>
          ) : (
            <Button variant="secondary" className="w-full" onClick={stopScanner}>
              Cancelar
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ValidarMotoristaPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin text-gray-400" /></div>}>
      <ValidarMotoristaInner />
    </Suspense>
  )
}
