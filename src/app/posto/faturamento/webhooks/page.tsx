'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Wifi, WifiOff, CheckCircle2, Clock, AlertCircle, XCircle, ArrowLeft, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

type AsaasEvent = {
  id: string
  receivedAt: string
  event: string
  paymentId: string
  status: string
  value: number
  dueDate: string
  paymentDate: string | null
  raw: Record<string, unknown>
}

const STATUS_LABEL: Record<string, string> = {
  PENDING:            'Aguardando',
  RECEIVED:           'Recebido',
  CONFIRMED:          'Confirmado',
  OVERDUE:            'Vencido',
  REFUNDED:           'Estornado',
  RECEIVED_IN_CASH:   'Recebido em dinheiro',
  REFUND_REQUESTED:   'Estorno solicitado',
  CHARGEBACK_DISPUTE: 'Disputa de chargeback',
  AWAITING_CHARGEBACK_REVERSAL: 'Aguardando reversão',
  DUNNING_REQUESTED:  'Negativação solicitada',
  DUNNING_RECEIVED:   'Negativação recebida',
  AWAITING_RISK_ANALYSIS: 'Análise de risco',
}

const EVENT_LABEL: Record<string, string> = {
  PAYMENT_CREATED:   'Cobrança criada',
  PAYMENT_UPDATED:   'Cobrança atualizada',
  PAYMENT_CONFIRMED: 'Pagamento confirmado',
  PAYMENT_RECEIVED:  'Pagamento recebido',
  PAYMENT_OVERDUE:   'Cobrança vencida',
  PAYMENT_DELETED:   'Cobrança removida',
  PAYMENT_RESTORED:  'Cobrança restaurada',
  PAYMENT_REFUNDED:  'Pagamento estornado',
  PAYMENT_RECEIVED_IN_CASH_UNDONE: 'Recebimento em dinheiro desfeito',
}

function statusColor(s: string) {
  if (s === 'RECEIVED' || s === 'CONFIRMED' || s === 'RECEIVED_IN_CASH') return 'text-emerald-600 bg-emerald-50'
  if (s === 'OVERDUE') return 'text-red-600 bg-red-50'
  if (s === 'PENDING') return 'text-amber-600 bg-amber-50'
  return 'text-gray-600 bg-gray-100'
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'RECEIVED' || status === 'CONFIRMED' || status === 'RECEIVED_IN_CASH')
    return <CheckCircle2 size={14} className="text-emerald-500" />
  if (status === 'OVERDUE')  return <XCircle size={14} className="text-red-500" />
  if (status === 'PENDING')  return <Clock size={14} className="text-amber-500" />
  return <AlertCircle size={14} className="text-gray-400" />
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDT(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('pt-BR')
}

export default function WebhooksPage() {
  const [events,       setEvents]       = useState<AsaasEvent[]>([])
  const [loading,      setLoading]      = useState(false)
  const [autoRefresh,  setAutoRefresh]  = useState(true)
  const [lastUpdate,   setLastUpdate]   = useState<Date | null>(null)
  const [expanded,     setExpanded]     = useState<string | null>(null)
  const [copied,       setCopied]       = useState(false)
  const [webhookUrl,   setWebhookUrl]   = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/asaas/webhook`)
    }
  }, [])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/asaas/webhook')
      if (res.ok) {
        const data = await res.json()
        setEvents(data)
        setLastUpdate(new Date())
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(fetchEvents, 5000)
    return () => clearInterval(t)
  }, [autoRefresh, fetchEvents])

  function copyUrl() {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/posto/faturamento">
          <Button variant="secondary" size="sm">
            <ArrowLeft size={14} />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Monitor de Webhooks</h1>
          <p className="text-sm text-gray-500">Eventos de pagamento recebidos do Asaas em tempo real</p>
        </div>
      </div>

      {/* URL do webhook */}
      <Card padding="md">
        <p className="text-xs font-medium text-gray-500 mb-2">URL do webhook (registre no painel Asaas)</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-gray-700 truncate">
            {webhookUrl || 'Carregando...'}
          </code>
          <Button variant="secondary" size="sm" onClick={copyUrl}>
            <Copy size={14} />
            {copied ? 'Copiado!' : 'Copiar'}
          </Button>
        </div>
        <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 space-y-1">
          <p className="font-medium">Como configurar no Asaas (sandbox):</p>
          <ol className="list-decimal list-inside space-y-0.5 text-blue-600">
            <li>Acesse o painel sandbox do Asaas → Configurações → Integrações → Webhooks</li>
            <li>Adicione a URL acima como endpoint</li>
            <li>Para testes locais, use <strong>ngrok</strong>: <code className="bg-blue-100 px-1 rounded">ngrok http 3000</code> e substitua o host pela URL do ngrok</li>
            <li>Selecione os eventos: PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE</li>
          </ol>
        </div>
      </Card>

      {/* Controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">
            {events.length} evento{events.length !== 1 ? 's' : ''} recebido{events.length !== 1 ? 's' : ''}
          </span>
          {lastUpdate && (
            <span className="text-xs text-gray-400">
              Atualizado {lastUpdate.toLocaleTimeString('pt-BR')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
              autoRefresh
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}
          >
            {autoRefresh ? <Wifi size={12} /> : <WifiOff size={12} />}
            Auto-refresh {autoRefresh ? 'ativo' : 'pausado'}
          </button>
          <Button variant="secondary" size="sm" onClick={fetchEvents} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Lista de eventos */}
      {events.length === 0 ? (
        <Card padding="md">
          <div className="text-center py-12 text-gray-400">
            <Wifi size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum evento recebido ainda.</p>
            <p className="text-xs mt-1">Configure o webhook no Asaas e realize um pagamento de teste.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {events.map((ev) => (
            <Card key={ev.id} padding="md" className="hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-3">
                <StatusIcon status={ev.status} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">
                      {EVENT_LABEL[ev.event] ?? ev.event}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(ev.status)}`}>
                      {STATUS_LABEL[ev.status] ?? ev.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                    <span>ID: <code className="font-mono text-gray-600">{ev.paymentId}</code></span>
                    <span>Valor: <strong className="text-gray-700">{formatBRL(ev.value)}</strong></span>
                    <span>Vencimento: {ev.dueDate}</span>
                    {ev.paymentDate && <span className="text-emerald-600">Pago em: {ev.paymentDate}</span>}
                    <span className="text-gray-400">{formatDT(ev.receivedAt)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setExpanded(expanded === ev.id ? null : ev.id)}
                  className="text-xs text-blue-500 hover:text-blue-700 shrink-0"
                >
                  {expanded === ev.id ? 'Ocultar' : 'Ver raw'}
                </button>
              </div>
              {expanded === ev.id && (
                <pre className="mt-3 text-xs bg-gray-50 border border-gray-100 rounded-lg p-3 overflow-x-auto text-gray-600 max-h-48">
                  {JSON.stringify(ev.raw, null, 2)}
                </pre>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
