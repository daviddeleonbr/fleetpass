'use client'

import { useState, useEffect } from 'react'
import { Check, ArrowLeft, ClipboardCheck, Fuel, Car, User, MapPin, Gauge, Calendar, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

type Veiculo = {
  id: string
  placa: string
  modelo: string
  combustivel: string
  exigirQuilometragem: boolean
}

type Motorista = {
  id: string
  nome: string
}

type Parceria = {
  id: string
  postoId: string
  postoNome: string
  cidade: string
  combustiveis: string[]
}

export default function NovaRequisicaoPage() {
  const [veiculos, setVeiculos]     = useState<Veiculo[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [parcerias, setParcerias]   = useState<Parceria[]>([])
  const [loading, setLoading]       = useState(true)

  const [form, setForm] = useState({
    veiculoId:    '',
    motoristaId:  '',
    parceriaId:   '',
    combustivel:  '',
    tipo:         'valor' as 'valor' | 'volume' | 'tanque',
    limite:       '',
    validade:     '',
    observacao:   '',
    quilometragem: '',
  })

  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [created, setCreated] = useState<{ codigo: string } | null>(null)

  useEffect(() => {
    fetch('/api/empresa/requisicoes/form-data')
      .then(r => r.json())
      .then(d => {
        setVeiculos(d.veiculos ?? [])
        setMotoristas(d.motoristas ?? [])
        setParcerias(d.parcerias ?? [])
      })
      .finally(() => setLoading(false))
  }, [])

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const selectedVeiculo  = veiculos.find(v => v.id === form.veiculoId)
  const selectedParceria = parcerias.find(p => p.id === form.parceriaId)

  // Combustíveis disponíveis = intersecção entre o do veículo e os da parceria selecionada
  const combustiveisDisponiveis: string[] = selectedVeiculo && selectedParceria
    ? selectedParceria.combustiveis.filter(c =>
        c.toLowerCase().includes(selectedVeiculo.combustivel.toLowerCase()) ||
        selectedVeiculo.combustivel.toLowerCase().includes(c.toLowerCase())
      ).length > 0
      ? selectedParceria.combustiveis.filter(c =>
          c.toLowerCase().includes(selectedVeiculo.combustivel.toLowerCase()) ||
          selectedVeiculo.combustivel.toLowerCase().includes(c.toLowerCase())
        )
      : [selectedVeiculo.combustivel]
    : selectedParceria
      ? selectedParceria.combustiveis
      : selectedVeiculo
        ? [selectedVeiculo.combustivel]
        : []

  const handleVeiculoChange = (id: string) => {
    const v = veiculos.find(x => x.id === id)
    setForm(f => ({
      ...f,
      veiculoId:    id,
      combustivel:  v?.combustivel ?? '',
      quilometragem: '',
    }))
  }

  const handleParceriaChange = (id: string) => {
    setForm(f => ({ ...f, parceriaId: id, combustivel: selectedVeiculo?.combustivel ?? '' }))
  }

  const canSubmit = !!(
    form.veiculoId &&
    form.parceriaId &&
    form.combustivel &&
    form.validade &&
    (form.tipo === 'tanque' || form.limite) &&
    (!selectedVeiculo?.exigirQuilometragem || form.quilometragem)
  )

  const handleCreate = async () => {
    if (!canSubmit) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/empresa/requisicoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          veiculoId:    form.veiculoId,
          motoristaId:  form.motoristaId || null,
          parceriaId:   form.parceriaId,
          combustivel:  form.combustivel,
          tipoLimite:   form.tipo,
          limiteValor:  form.tipo === 'valor'  ? Number(form.limite)  : null,
          limiteVolume: form.tipo === 'volume' ? Number(form.limite)  : null,
          validade:     form.validade,
          quilometragem: form.quilometragem ? Number(form.quilometragem) : null,
          observacao:   form.observacao || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao criar requisição.')
      setCreated({ codigo: data.codigo })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (created) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6">
        <Card padding="md">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
              <Check size={26} className="text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Requisição criada!</h1>
              <p className="text-gray-500 text-sm mt-1">
                A requisição foi registrada e está aguardando o abastecimento.
              </p>
            </div>
            <div className="w-full bg-blue-50 border border-blue-100 rounded-xl p-4 text-left">
              <div className="flex items-start gap-3">
                <ClipboardCheck size={16} className="text-blue-600 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-700 leading-relaxed">
                  O motorista receberá o código de autorização <strong>somente após escanear o QR code do frentista</strong> no posto. O código não é exibido aqui por segurança.
                </p>
              </div>
            </div>
          </div>
        </Card>
        <Link href="/empresa/requisicoes">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={14} /> Ver todas requisições
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nova Requisição</h1>
        <p className="text-gray-500 text-sm">Crie uma requisição de abastecimento para um veículo.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Carregando dados...</span>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {/* Form */}
          <div className="col-span-2 space-y-4">
            <Card padding="md">
              <h2 className="font-semibold text-gray-900 mb-4">Dados da requisição</h2>
              <div className="space-y-4">

                {/* Veículo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Veículo</label>
                  <select
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                    value={form.veiculoId}
                    onChange={e => handleVeiculoChange(e.target.value)}
                  >
                    <option value="">Selecione o veículo</option>
                    {veiculos.map(v => (
                      <option key={v.id} value={v.id}>{v.placa} — {v.modelo}</option>
                    ))}
                  </select>
                  {veiculos.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">Nenhum veículo ativo disponível.</p>
                  )}
                </div>

                {/* Motorista */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Motorista <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <select
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                    value={form.motoristaId}
                    onChange={e => update('motoristaId', e.target.value)}
                  >
                    <option value="">Sem motorista específico</option>
                    {motoristas.map(m => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Posto / Parceria */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Posto parceiro</label>
                  <select
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                    value={form.parceriaId}
                    onChange={e => handleParceriaChange(e.target.value)}
                  >
                    <option value="">Selecione o posto</option>
                    {parcerias.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.postoNome} — {p.cidade}
                      </option>
                    ))}
                  </select>
                  {parcerias.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">Nenhuma parceria ativa. Solicite uma parceria primeiro.</p>
                  )}
                </div>

                {/* Combustível */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Combustível</label>
                  {combustiveisDisponiveis.length > 1 ? (
                    <select
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                      value={form.combustivel}
                      onChange={e => update('combustivel', e.target.value)}
                    >
                      <option value="">Selecione o combustível</option>
                      {combustiveisDisponiveis.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      readOnly
                      className="w-full px-3 py-2.5 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-500"
                      value={form.combustivel || 'Preenchido automaticamente pelo veículo e posto'}
                    />
                  )}
                </div>

                {/* Quilometragem (condicional) */}
                {selectedVeiculo?.exigirQuilometragem && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                      <Gauge size={14} className="text-blue-500" /> Última quilometragem (km)
                    </label>
                    <input
                      type="number"
                      className="w-full px-3 py-2.5 text-sm border border-blue-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 bg-blue-50/30"
                      placeholder="Ex: 45200"
                      value={form.quilometragem}
                      onChange={e => update('quilometragem', e.target.value)}
                    />
                    <p className="text-xs text-gray-400 mt-1">Obrigatório para este veículo</p>
                  </div>
                )}

                {/* Tipo de limite */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de limite</label>
                    <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                      {(['valor', 'volume', 'tanque'] as const).map((t, i) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => { update('tipo', t); if (t === 'tanque') update('limite', '') }}
                          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${i > 0 ? 'border-l border-gray-200' : ''} ${form.tipo === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                          {t === 'valor' ? 'R$ Valor' : t === 'volume' ? 'Litros' : 'Tanque cheio'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {form.tipo !== 'tanque' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        {form.tipo === 'valor' ? 'Limite (R$)' : 'Limite (L)'}
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                        placeholder={form.tipo === 'valor' ? '300' : '50'}
                        value={form.limite}
                        onChange={e => update('limite', e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                      <Fuel size={13} className="shrink-0 text-blue-500" />
                      O frentista deverá completar o tanque do veículo. Nenhum limite de valor ou volume será aplicado.
                    </div>
                  )}
                </div>

                {/* Validade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Validade</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                    min={new Date().toISOString().slice(0, 10)}
                    value={form.validade}
                    onChange={e => update('validade', e.target.value)}
                  />
                </div>

                {/* Observação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Observação (opcional)</label>
                  <textarea
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 resize-none"
                    rows={3}
                    placeholder="Instrução para o frentista ou motorista..."
                    value={form.observacao}
                    onChange={e => update('observacao', e.target.value)}
                  />
                </div>
              </div>
            </Card>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">{error}</p>
            )}

            <Button
              className="w-full"
              size="lg"
              onClick={handleCreate}
              disabled={!canSubmit || saving}
            >
              {saving ? <><Loader2 size={14} className="animate-spin" /> Criando...</> : 'Criar requisição'}
            </Button>
          </div>

          {/* Ticket preview */}
          <div className="sticky top-0 self-start">
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
              {/* Header strip */}
              <div className="bg-blue-600 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fuel size={15} className="text-blue-200" />
                  <span className="text-xs font-semibold text-blue-100 uppercase tracking-wider">FleetPass</span>
                </div>
                <span className="text-xs text-blue-200 font-medium">Requisição de abastecimento</span>
              </div>

              {/* Placa destaque */}
              <div className="px-5 pt-5 pb-4 border-b border-dashed border-gray-200">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Veículo</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <Car size={16} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 font-mono text-lg leading-tight">
                      {selectedVeiculo?.placa || '—'}
                    </p>
                    {selectedVeiculo && (
                      <p className="text-xs text-gray-400">{selectedVeiculo.modelo}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Campos */}
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-3">
                  <User size={13} className="text-gray-300 shrink-0" />
                  <div className="flex-1 flex justify-between">
                    <span className="text-xs text-gray-400">Motorista</span>
                    <span className="text-xs font-medium text-gray-700">
                      {motoristas.find(m => m.id === form.motoristaId)?.nome || '—'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={13} className="text-gray-300 shrink-0" />
                  <div className="flex-1 flex justify-between">
                    <span className="text-xs text-gray-400">Posto</span>
                    <span className="text-xs font-medium text-gray-700 text-right max-w-32 truncate">
                      {selectedParceria?.postoNome || '—'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Fuel size={13} className="text-gray-300 shrink-0" />
                  <div className="flex-1 flex justify-between">
                    <span className="text-xs text-gray-400">Combustível</span>
                    <span className="text-xs font-medium text-gray-700">{form.combustivel || '—'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Gauge size={13} className="text-gray-300 shrink-0" />
                  <div className="flex-1 flex justify-between">
                    <span className="text-xs text-gray-400">Limite</span>
                    <span className="text-xs font-semibold text-gray-900">
                      {form.tipo === 'tanque'
                        ? <span className="text-blue-600">Tanque cheio</span>
                        : form.limite
                          ? `${form.tipo === 'valor' ? 'R$ ' : ''}${form.limite}${form.tipo === 'volume' ? ' L' : ''}`
                          : '—'}
                    </span>
                  </div>
                </div>
                {selectedVeiculo?.exigirQuilometragem && (
                  <div className="flex items-center gap-3">
                    <Gauge size={13} className="text-blue-400 shrink-0" />
                    <div className="flex-1 flex justify-between">
                      <span className="text-xs text-gray-400">Odômetro</span>
                      <span className="text-xs font-medium text-gray-700">
                        {form.quilometragem ? `${Number(form.quilometragem).toLocaleString('pt-BR')} km` : '—'}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar size={13} className="text-gray-300 shrink-0" />
                  <div className="flex-1 flex justify-between">
                    <span className="text-xs text-gray-400">Válida até</span>
                    <span className="text-xs font-medium text-gray-700">
                      {form.validade
                        ? new Date(form.validade + 'T12:00:00').toLocaleDateString('pt-BR')
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Separador recortado */}
              <div className="relative flex items-center px-0 py-0">
                <div className="w-4 h-4 bg-gray-50 rounded-full -ml-2 border border-gray-100 shrink-0" />
                <div className="flex-1 border-t border-dashed border-gray-200 mx-1" />
                <div className="w-4 h-4 bg-gray-50 rounded-full -mr-2 border border-gray-100 shrink-0" />
              </div>

              {/* Rodapé */}
              <div className="px-5 py-4 bg-gray-50 flex items-center justify-center gap-2">
                <div className="w-5 h-5 bg-gray-200 rounded flex items-center justify-center">
                  <Fuel size={10} className="text-gray-400" />
                </div>
                <p className="text-xs text-gray-400 italic">
                  Código visível apenas para o motorista
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
