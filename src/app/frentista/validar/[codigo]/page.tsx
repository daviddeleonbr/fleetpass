'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Car, User, Building2, Fuel, DollarSign, Calendar,
  Check, AlertTriangle, XCircle, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ABASTECIMENTOS, formatBRL } from '@/lib/relatorios-data'

export default function DetalheRequisicaoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = use(params)
  const [confirmed, setConfirmed] = useState(false)

  const req = ABASTECIMENTOS.find((a) => a.codigo === codigo)

  // ── Not found ────────────────────────────────────────────────────────────
  if (!req) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <Link
          href="/frentista/validar"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={16} /> Voltar
        </Link>

        <div className="bg-red-500 text-white rounded-xl px-6 py-4 flex items-center gap-4">
          <XCircle size={24} />
          <div>
            <p className="font-bold text-lg">Código não encontrado</p>
            <p className="font-mono text-red-100 text-sm">{codigo}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <XCircle size={28} className="text-red-400" />
          </div>
          <div>
            <p className="text-base font-semibold text-gray-800">Requisição inválida</p>
            <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto leading-relaxed">
              Nenhuma requisição foi encontrada com este código. Verifique se o código foi
              digitado corretamente ou solicite um novo QR Code ao motorista.
            </p>
          </div>
          <Link href="/frentista/validar">
            <Button variant="secondary">Tentar novamente</Button>
          </Link>
        </div>
      </div>
    )
  }

  // ── Confirmed ─────────────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={38} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Abastecimento confirmado!</h1>
          <p className="text-gray-400 text-sm mb-8">
            Registrado às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>

          <div className="bg-gray-50 rounded-xl p-5 text-left grid grid-cols-2 gap-3 mb-8">
            {[
              { label: 'Código',      value: req.codigo,                          mono: true },
              { label: 'Veículo',     value: req.veiculo },
              { label: 'Motorista',   value: req.motorista },
              { label: 'Empresa',     value: req.empresa },
              { label: 'Combustível', value: req.combustivel },
              { label: 'Valor',       value: formatBRL(req.valor),                bold: true },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
                <p className={`text-sm text-gray-900 ${item.mono ? 'font-mono font-bold' : item.bold ? 'font-bold' : 'font-medium'}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <Link href="/frentista/validar">
            <Button size="lg" className="px-10">Validar próximo</Button>
          </Link>
        </div>
      </div>
    )
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  const isContestado = req.status === 'contestado'
  const statusColor  = isContestado ? 'bg-red-500' : 'bg-emerald-500'
  const statusLabel  = isContestado ? '⚠️ Requisição contestada' : '✅ Requisição válida'

  const infoRows = [
    { icon: Car,        label: 'Veículo',     value: req.veiculo },
    { icon: User,       label: 'Motorista',   value: req.motorista },
    { icon: Building2,  label: 'Empresa',     value: req.empresa },
    { icon: Fuel,       label: 'Combustível', value: `${req.combustivel} · ${req.litros} L` },
    { icon: DollarSign, label: 'Valor',       value: `${formatBRL(req.valor)} (R$ ${req.valorUnitario.toFixed(2)}/L)` },
    { icon: Calendar,   label: 'Data',        value: req.data },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link
        href="/frentista/validar"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft size={16} /> Voltar
      </Link>

      {/* Status banner */}
      <div className={`${statusColor} text-white rounded-xl px-6 py-4 flex items-center justify-between`}>
        <div>
          <p className="font-bold text-lg">{statusLabel}</p>
          <p className="font-mono text-white/70 text-sm mt-0.5">{req.codigo}</p>
        </div>
        {!isContestado && (
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Check size={20} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Info card */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {infoRows.map((item) => (
            <div key={item.label} className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                <item.icon size={17} className="text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className="text-sm font-medium text-gray-900">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Action panel */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Confirmar abastecimento</p>
              <p className="text-xs text-gray-400 leading-relaxed">
                Ao confirmar, o abastecimento será registrado e a requisição marcada como concluída.
              </p>
            </div>

            {isContestado && (
              <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 leading-snug">
                  Requisição <strong>contestada</strong>. Consulte o supervisor antes de prosseguir.
                </p>
              </div>
            )}

            <button
              onClick={() => setConfirmed(true)}
              disabled={isContestado}
              className="mt-4 w-full h-12 bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Check size={17} /> Confirmar
            </button>

            <button className="mt-2 w-full py-2.5 text-xs text-gray-400 hover:text-red-500 flex items-center justify-center gap-1.5 transition-colors">
              <AlertTriangle size={12} /> Reportar problema
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
