'use client'

import { useEffect, useState } from 'react'
import {
  Fuel, Loader2, AlertCircle, CheckCircle2, Car, User, Building2,
  Gauge, Hash, Calendar, Droplets, DollarSign, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Liberada {
  id:           string
  codigo:       string
  placa:        string
  veiculo:      string
  exigirHodometro: boolean
  motorista:    string | null
  empresa:      string | null
  combustivel:  string
  limite:       string
  tipoLimite:   string
  posto:        string
  validade:     string | null
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function RegistrarPage() {
  const [itens, setItens]     = useState<Liberada[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [msg, setMsg]         = useState('')

  const carregar = () => {
    setLoading(true)
    setError('')
    fetch('/api/frentista/requisicao/liberadas')
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Erro ao carregar.')
        return data
      })
      .then((data) => setItens(data.liberadas ?? []))
      .catch((e) => { setError(e instanceof Error ? e.message : 'Erro ao carregar.'); setItens([]) })
      .finally(() => setLoading(false))
  }

  useEffect(carregar, [])

  const concluir = (id: string, codigo: string) => {
    setItens((prev) => prev.filter((x) => x.id !== id))
    setMsg(`Abastecimento ${codigo} registrado e concluído.`)
    setTimeout(() => setMsg(''), 5000)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <Fuel size={15} className="text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Registrar abastecimento</h1>
          </div>
          <p className="text-gray-500 text-sm">
            Abastecimentos liberados aguardando o registro de litros e valor.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={carregar} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Atualizar
        </Button>
      </div>

      {msg && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-3">
          <CheckCircle2 size={16} className="shrink-0" />
          {msg}
        </div>
      )}

      {error ? (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <Loader2 size={28} className="animate-spin" />
          <p className="text-sm">Carregando abastecimentos…</p>
        </div>
      ) : itens.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 gap-2">
          <Fuel size={28} className="text-gray-200" />
          <p className="text-sm text-gray-400 font-medium">Nenhum abastecimento aguardando registro</p>
          <p className="text-xs text-gray-400">Libere um abastecimento na tela de validação.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {itens.map((item) => (
            <CardRegistro key={item.id} item={item} onConcluido={concluir} />
          ))}
        </div>
      )}
    </div>
  )
}

function CardRegistro({
  item,
  onConcluido,
}: {
  item: Liberada
  onConcluido: (id: string, codigo: string) => void
}) {
  const [litros, setLitros]               = useState('')
  const [valorUnitario, setValorUnitario] = useState('')
  const [hodometro, setHodometro]         = useState('')
  const [saving, setSaving]               = useState(false)
  const [error, setError]                 = useState('')

  const l = Number(litros.replace(',', '.'))
  const v = Number(valorUnitario.replace(',', '.'))
  const total = Number.isFinite(l) && Number.isFinite(v) && l > 0 && v > 0 ? l * v : 0

  const registrar = async () => {
    if (!l || l <= 0) { setError('Informe os litros abastecidos.'); return }
    if (!v || v <= 0) { setError('Informe o valor por litro.'); return }
    if (item.exigirHodometro && !hodometro) { setError('Hodômetro é obrigatório para este veículo.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/frentista/requisicao/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reqId: item.id,
          litros: l,
          valorUnitario: v,
          hodometro: hodometro ? Number(hodometro.replace(',', '.')) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao registrar.')
      onConcluido(item.id, item.codigo)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao registrar.')
      setSaving(false)
    }
  }

  const rows = [
    { icon: Car,       label: 'Veículo',     value: item.veiculo },
    { icon: User,      label: 'Motorista',   value: item.motorista ?? '—' },
    { icon: Building2, label: 'Empresa',     value: item.empresa ?? '—' },
    { icon: Fuel,      label: 'Combustível', value: item.combustivel },
    { icon: Gauge,     label: 'Limite',      value: item.limite },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Cabeçalho do ticket */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Hash size={14} className="text-gray-400" />
          <span className="font-mono font-bold text-sm text-gray-800">{item.codigo}</span>
        </div>
        {item.validade && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <Calendar size={12} /> Válida até {new Date(item.validade).toLocaleDateString('pt-BR')}
          </span>
        )}
      </div>

      {/* Dados */}
      <div className="px-5 py-3 grid grid-cols-2 gap-x-6 gap-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2 min-w-0">
            <r.icon size={14} className="text-gray-400 shrink-0" />
            <span className="text-xs text-gray-400">{r.label}</span>
            <span className="text-sm font-medium text-gray-900 truncate ml-auto text-right">{r.value}</span>
          </div>
        ))}
      </div>

      {/* Formulário de registro */}
      <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Litros" icon={Droplets}>
            <input
              inputMode="decimal"
              className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              placeholder="0,00"
              value={litros}
              onChange={(e) => { setLitros(e.target.value); setError('') }}
            />
          </Field>
          <Field label="Valor por litro" icon={DollarSign}>
            <input
              inputMode="decimal"
              className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
              placeholder="0,00"
              value={valorUnitario}
              onChange={(e) => { setValorUnitario(e.target.value); setError('') }}
            />
          </Field>
        </div>

        <Field label={`Hodômetro${item.exigirHodometro ? '' : ' (opcional)'}`} icon={Gauge}>
          <input
            inputMode="numeric"
            className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
            placeholder="km"
            value={hodometro}
            onChange={(e) => { setHodometro(e.target.value); setError('') }}
          />
        </Field>

        {total > 0 && (
          <div className="flex items-center justify-between text-sm px-1">
            <span className="text-gray-400">Valor total</span>
            <span className="font-bold text-gray-900">{formatBRL(total)}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        <Button className="w-full" onClick={registrar} disabled={saving}>
          {saving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
          {saving ? 'Registrando…' : 'Registrar e concluir'}
        </Button>
      </div>
    </div>
  )
}

function Field({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="relative">
        <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        {children}
      </div>
    </div>
  )
}
