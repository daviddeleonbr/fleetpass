'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Zap, Store, Settings2, AlertCircle, ChevronDown, ChevronUp,
  Check, Users, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Modal } from '@/components/ui/modal'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FrotaItem { id: string; placa: string; modelo: string; combustivel: string }

interface LiberacaoData {
  id: string
  ativa: boolean
  veiculosConfig: 'todos' | 'selecionados'
  veiculosIds: string[]
  usarLimitePorAbast: boolean
  limiteTipo: 'valor' | 'volume' | null
  limitePorAbast: number | null
  usarLimiteMensal: boolean
  limiteMensal: number | null
}

interface ParceriaItem {
  parceriaId: string
  posto: string
  postoId: string
  cidade: string
  combustiveis: string[]
  liberacao: LiberacaoData | null
}

interface HistoricoItem {
  id: string; codigo: string; data: string; combustivel: string
  litros: number; valor: number; placa: string; modelo: string
  motorista: string; posto: string
}

type LimiteTipo = 'valor' | 'volume'

interface ConfigForm {
  veiculosConfig: 'todos' | 'selecionados'
  veiculosIds: string[]
  usarLimitePorAbast: boolean
  limiteTipo: LimiteTipo
  limitePorAbast: string
  usarLimiteMensal: boolean
  limiteMensal: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function formatData(iso: string) {
  const d = new Date(iso)
  return {
    data: d.toLocaleDateString('pt-BR'),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }
}

function resumoLib(lib: LiberacaoData, frota: FrotaItem[]) {
  const partes: string[] = []
  if (lib.veiculosConfig === 'todos') {
    partes.push(`Toda a frota (${frota.length})`)
  } else {
    const n = lib.veiculosIds.length
    partes.push(`${n} veículo${n !== 1 ? 's' : ''}`)
  }
  if (lib.usarLimitePorAbast && lib.limitePorAbast) {
    partes.push(lib.limiteTipo === 'valor' ? `R$ ${lib.limitePorAbast}/abast.` : `${lib.limitePorAbast} L/abast.`)
  }
  if (lib.usarLimiteMensal && lib.limiteMensal) {
    partes.push(`R$ ${lib.limiteMensal}/mês por veículo`)
  }
  return partes.join(' · ')
}

function libToForm(lib: LiberacaoData | null): ConfigForm {
  return {
    veiculosConfig:     lib?.veiculosConfig     ?? 'todos',
    veiculosIds:        lib?.veiculosIds        ?? [],
    usarLimitePorAbast: lib?.usarLimitePorAbast ?? false,
    limiteTipo:         (lib?.limiteTipo as LimiteTipo) ?? 'valor',
    limitePorAbast:     lib?.limitePorAbast != null ? String(lib.limitePorAbast) : '',
    usarLimiteMensal:   lib?.usarLimiteMensal   ?? false,
    limiteMensal:       lib?.limiteMensal  != null ? String(lib.limiteMensal)  : '',
  }
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!on)} disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${on ? 'bg-blue-600' : 'bg-gray-200'}`}>
      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${on ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  )
}

// ─── ConfigModal ──────────────────────────────────────────────────────────────

function ConfigModal({ parceria, frota, onSalvar, onClose, saving }: {
  parceria: ParceriaItem
  frota: FrotaItem[]
  onSalvar: (cfg: ConfigForm) => void
  onClose: () => void
  saving: boolean
}) {
  const [cfg, setCfg] = useState<ConfigForm>(() => libToForm(parceria.liberacao))

  function toggleVeiculo(id: string) {
    if (cfg.veiculosConfig === 'todos') {
      setCfg(c => ({ ...c, veiculosConfig: 'selecionados', veiculosIds: frota.map(v => v.id).filter(i => i !== id) }))
      return
    }
    const nova = cfg.veiculosIds.includes(id)
      ? cfg.veiculosIds.filter(i => i !== id)
      : [...cfg.veiculosIds, id]
    setCfg(c => ({
      ...c,
      veiculosConfig: nova.length === frota.length ? 'todos' : 'selecionados',
      veiculosIds:    nova.length === frota.length ? [] : nova,
    }))
  }

  const isAtivo = (id: string) => cfg.veiculosConfig === 'todos' || cfg.veiculosIds.includes(id)
  const semVeiculos = cfg.veiculosConfig === 'selecionados' && cfg.veiculosIds.length === 0

  return (
    <div className="flex flex-col gap-4">
      {/* Posto */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
        <div className="w-7 h-7 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-center shrink-0">
          <Store size={13} className="text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">{parceria.posto}</p>
          <p className="text-xs text-gray-400">{parceria.cidade}</p>
        </div>
      </div>

      {/* Veículos */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Veículos habilitados</p>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          <label className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
            <input type="checkbox" className="w-4 h-4 rounded accent-blue-600"
              checked={cfg.veiculosConfig === 'todos'}
              onChange={() => setCfg(c => ({
                ...c,
                veiculosConfig: c.veiculosConfig === 'todos' ? 'selecionados' : 'todos',
                veiculosIds: [],
              }))} />
            <div className="flex items-center gap-2">
              <Users size={13} className="text-blue-500 shrink-0" />
              <span className="text-sm font-medium text-gray-800">Toda a frota</span>
              <span className="text-xs text-gray-400">({frota.length} veículos)</span>
            </div>
          </label>
          {frota.map(v => (
            <label key={v.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors">
              <input type="checkbox" className="w-4 h-4 rounded accent-blue-600"
                checked={isAtivo(v.id)} onChange={() => toggleVeiculo(v.id)} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-800">{v.placa}</span>
                <span className="text-xs text-gray-400 ml-2">{v.modelo}</span>
              </div>
              <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full shrink-0">{v.combustivel}</span>
            </label>
          ))}
        </div>
        {semVeiculos && (
          <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
            <AlertCircle size={11} /> Selecione pelo menos um veículo.
          </p>
        )}
      </div>

      {/* Limite por abastecimento */}
      <div className="border border-gray-100 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Limite por abastecimento</p>
            <p className="text-xs text-gray-400">Máximo por vez</p>
          </div>
          <Toggle on={cfg.usarLimitePorAbast}
            onChange={v => setCfg(c => ({ ...c, usarLimitePorAbast: v, limitePorAbast: '' }))} />
        </div>
        {cfg.usarLimitePorAbast && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
              {(['valor', 'volume'] as LimiteTipo[]).map(t => (
                <button key={t} type="button"
                  onClick={() => setCfg(c => ({ ...c, limiteTipo: t, limitePorAbast: '' }))}
                  className={`px-3 py-1 text-xs rounded-md transition-colors font-medium ${cfg.limiteTipo === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                  {t === 'valor' ? 'R$' : 'Litros'}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                {cfg.limiteTipo === 'valor' ? 'R$' : 'L'}
              </span>
              <input type="number" min="1"
                placeholder={cfg.limiteTipo === 'valor' ? 'Ex: 500' : 'Ex: 80'}
                value={cfg.limitePorAbast}
                onChange={e => setCfg(c => ({ ...c, limitePorAbast: e.target.value }))}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
            </div>
          </div>
        )}
      </div>

      {/* Limite mensal */}
      <div className="border border-gray-100 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Limite mensal por veículo</p>
            <p className="text-xs text-gray-400">Teto de gasto em R$ no mês</p>
          </div>
          <Toggle on={cfg.usarLimiteMensal}
            onChange={v => setCfg(c => ({ ...c, usarLimiteMensal: v, limiteMensal: '' }))} />
        </div>
        {cfg.usarLimiteMensal && (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">R$</span>
            <input type="number" min="1" placeholder="Ex: 3000"
              value={cfg.limiteMensal}
              onChange={e => setCfg(c => ({ ...c, limiteMensal: e.target.value }))}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500" />
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg">
        <AlertCircle size={13} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          O frentista validará a placa do veículo no momento do abastecimento.
          Veículos não habilitados serão bloqueados automaticamente.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button className="flex-1" disabled={semVeiculos || saving} onClick={() => onSalvar(cfg)}>
          {saving ? <><Loader2 size={13} className="animate-spin" /> Salvando...</> : <><Check size={13} /> Salvar configuração</>}
        </Button>
      </div>
    </div>
  )
}

// ─── ParceriaCard ─────────────────────────────────────────────────────────────

function ParceriaCard({ item, frota, onToggle, onConfigurar, toggling }: {
  item: ParceriaItem
  frota: FrotaItem[]
  onToggle: (id: string, on: boolean) => void
  onConfigurar: (id: string) => void
  toggling: boolean
}) {
  const [expandida, setExpandida] = useState(false)
  const lib = item.liberacao
  const on  = lib?.ativa ?? false

  return (
    <Card padding="md">
      <div className="flex items-start gap-4">
        <div className="w-9 h-9 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
          <Store size={16} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold text-gray-900">{item.posto}</p>
            {on && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                <Zap size={9} /> Ativo
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-2">{item.cidade}</p>
          <div className="flex flex-wrap gap-1">
            {item.combustiveis.map(c => (
              <span key={c} className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{c}</span>
            ))}
          </div>
          {on && lib && (
            <p className="text-xs text-gray-500 mt-2">{resumoLib(lib, frota)}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {on && (
            <>
              <button onClick={() => setExpandida(v => !v)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors">
                {expandida ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                Detalhes
              </button>
              <button onClick={() => onConfigurar(item.parceriaId)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Configurar">
                <Settings2 size={15} />
              </button>
            </>
          )}
          <Toggle on={on} onChange={v => onToggle(item.parceriaId, v)} disabled={toggling} />
        </div>
      </div>

      {on && lib && expandida && (
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-lg px-3 py-2.5">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Veículos</p>
            <p className="text-sm font-semibold text-gray-800">
              {lib.veiculosConfig === 'todos' ? `Todos (${frota.length})` : `${lib.veiculosIds.length} selecionado${lib.veiculosIds.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2.5">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Limite/abast.</p>
            <p className="text-sm font-semibold text-gray-800">
              {lib.usarLimitePorAbast && lib.limitePorAbast
                ? lib.limiteTipo === 'valor' ? formatBRL(lib.limitePorAbast) : `${lib.limitePorAbast} L`
                : 'Sem limite'}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2.5">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Limite mensal</p>
            <p className="text-sm font-semibold text-gray-800">
              {lib.usarLimiteMensal && lib.limiteMensal ? `${formatBRL(lib.limiteMensal)}/veículo` : 'Sem limite'}
            </p>
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LiberacoesPage() {
  const [parcerias,    setParcerias]    = useState<ParceriaItem[]>([])
  const [frota,        setFrota]        = useState<FrotaItem[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [toggling,     setToggling]     = useState<Record<string, boolean>>({})
  const [configModal,  setConfigModal]  = useState<string | null>(null)
  const [savingConfig, setSavingConfig] = useState(false)

  const [historico,         setHistorico]         = useState<HistoricoItem[]>([])
  const [totais,            setTotais]            = useState({ registros: 0, litros: 0, valor: 0 })
  const [historicoExp,      setHistoricoExp]      = useState(false)
  const [loadingHistorico,  setLoadingHistorico]  = useState(false)
  const [historicoCarregado, setHistoricoCarregado] = useState(false)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true); setError(null)
      const res = await fetch('/api/empresa/liberacoes')
      if (!res.ok) throw new Error('Erro ao carregar liberações.')
      const data = await res.json()
      setParcerias(data.parcerias ?? [])
      setFrota(data.frota ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function fetchHistorico() {
    setLoadingHistorico(true)
    try {
      const res  = await fetch('/api/empresa/liberacoes/historico')
      const data = await res.json()
      setHistorico(data.historico ?? [])
      setTotais(data.totais ?? { registros: 0, litros: 0, valor: 0 })
      setHistoricoCarregado(true)
    } catch { /* silencioso */ } finally { setLoadingHistorico(false) }
  }

  function handleToggleHistorico() {
    const novoEstado = !historicoExp
    setHistoricoExp(novoEstado)
    if (novoEstado && !historicoCarregado) fetchHistorico()
  }

  // ── Toggle liberação ───────────────────────────────────────────────────────

  async function handleToggle(parceriaId: string, on: boolean) {
    const item = parcerias.find(p => p.parceriaId === parceriaId)
    if (!item) return

    // Otimista
    setParcerias(prev => prev.map(p => p.parceriaId === parceriaId
      ? { ...p, liberacao: { ...(p.liberacao ?? { id: '', veiculosConfig: 'todos', veiculosIds: [], usarLimitePorAbast: false, limiteTipo: null, limitePorAbast: null, usarLimiteMensal: false, limiteMensal: null }), ativa: on } }
      : p))

    setToggling(t => ({ ...t, [parceriaId]: true }))
    try {
      const lib = item.liberacao
      const res = await fetch(`/api/empresa/liberacoes/${parceriaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ativa:              on,
          veiculosConfig:     lib?.veiculosConfig  ?? 'todos',
          veiculosIds:        lib?.veiculosIds     ?? [],
          usarLimitePorAbast: lib?.usarLimitePorAbast ?? false,
          limiteTipo:         lib?.limiteTipo      ?? null,
          limitePorAbast:     lib?.limitePorAbast  ?? null,
          usarLimiteMensal:   lib?.usarLimiteMensal ?? false,
          limiteMensal:       lib?.limiteMensal    ?? null,
        }),
      })
      if (!res.ok) throw new Error()
      // Recarrega para pegar o ID gerado se era novo
      await fetchData()
    } catch {
      // Reverte
      setParcerias(prev => prev.map(p => p.parceriaId === parceriaId ? item : p))
    } finally {
      setToggling(t => ({ ...t, [parceriaId]: false }))
    }
  }

  // ── Salvar configuração ────────────────────────────────────────────────────

  async function handleSalvar(cfg: ConfigForm) {
    if (!configModal) return
    setSavingConfig(true)
    try {
      const res = await fetch(`/api/empresa/liberacoes/${configModal}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ativa:              true,
          veiculosConfig:     cfg.veiculosConfig,
          veiculosIds:        cfg.veiculosIds,
          usarLimitePorAbast: cfg.usarLimitePorAbast,
          limiteTipo:         cfg.usarLimitePorAbast ? cfg.limiteTipo : null,
          limitePorAbast:     cfg.usarLimitePorAbast && cfg.limitePorAbast ? parseFloat(cfg.limitePorAbast) : null,
          usarLimiteMensal:   cfg.usarLimiteMensal,
          limiteMensal:       cfg.usarLimiteMensal && cfg.limiteMensal ? parseFloat(cfg.limiteMensal) : null,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setConfigModal(null)
      await fetchData()
    } catch (err) {
      console.error(err)
    } finally { setSavingConfig(false) }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const parceriaSelecionada = parcerias.find(p => p.parceriaId === configModal)
  const ativasCount = parcerias.filter(p => p.liberacao?.ativa).length

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <Zap size={15} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Abastecimento Livre</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Permita que veículos da frota abasteçam em postos parceiros sem criar uma requisição prévia.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3.5 space-y-1">
        <p className="text-sm font-semibold text-blue-800">Como funciona</p>
        <p className="text-xs text-blue-700 leading-relaxed">
          Quando habilitado para uma parceria, o frentista valida a placa do veículo no momento do abastecimento.
          Se a placa estiver cadastrada e habilitada, o abastecimento é autorizado automaticamente — sem código de requisição.
          Os limites configurados aqui são aplicados por veículo.
        </p>
      </div>

      {/* Parcerias */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            Parcerias ativas
            {ativasCount > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                {ativasCount} com abastecimento livre habilitado
              </span>
            )}
          </h2>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle size={16} className="shrink-0" />{error}
            <button onClick={fetchData} className="ml-auto underline text-xs">Tentar novamente</button>
          </div>
        )}

        {!loading && !error && parcerias.length === 0 && (
          <Card padding="md">
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
              <Store size={24} className="text-gray-200" />
              <p className="text-sm">Nenhuma parceria ativa. Feche um acordo com um posto primeiro.</p>
            </div>
          </Card>
        )}

        {!loading && parcerias.map(item => (
          <ParceriaCard
            key={item.parceriaId}
            item={item}
            frota={frota}
            onToggle={handleToggle}
            onConfigurar={id => setConfigModal(id)}
            toggling={!!toggling[item.parceriaId]}
          />
        ))}
      </div>

      {/* Histórico */}
      <Card padding="none">
        <button className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/60 transition-colors"
          onClick={handleToggleHistorico}>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-700">Histórico de abastecimentos livres</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {historicoCarregado
                ? `${totais.registros} registros · ${totais.litros.toFixed(0)} L · ${formatBRL(totais.valor)}`
                : 'Clique para carregar'}
            </p>
          </div>
          {historicoExp ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {historicoExp && (
          <div className="border-t border-gray-100">
            {loadingHistorico && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-gray-300" />
              </div>
            )}

            {!loadingHistorico && historico.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-1">
                <Zap size={20} className="text-gray-200" />
                <p className="text-sm">Nenhum abastecimento livre registrado ainda.</p>
              </div>
            )}

            {!loadingHistorico && historico.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                      <th className="px-5 py-3 text-left">Código</th>
                      <th className="px-5 py-3 text-left">Data / Hora</th>
                      <th className="px-5 py-3 text-left">Veículo</th>
                      <th className="px-5 py-3 text-left">Motorista</th>
                      <th className="px-5 py-3 text-left">Posto</th>
                      <th className="px-5 py-3 text-left">Combustível</th>
                      <th className="px-5 py-3 text-right">Volume</th>
                      <th className="px-5 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {historico.map(h => {
                      const { data, hora } = formatData(h.data)
                      return (
                        <tr key={h.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-5 py-3 font-mono text-xs text-gray-500">{h.codigo}</td>
                          <td className="px-5 py-3 text-xs text-gray-600">
                            <span className="font-medium">{data}</span>
                            <span className="text-gray-400 ml-1">{hora}</span>
                          </td>
                          <td className="px-5 py-3">
                            <p className="text-xs font-semibold text-gray-800">{h.placa}</p>
                            <p className="text-[11px] text-gray-400">{h.modelo}</p>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-600">{h.motorista}</td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                              <Store size={9} /> {h.posto}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-600">{h.combustivel}</td>
                          <td className="px-5 py-3 text-xs text-gray-600 text-right">{h.litros.toFixed(0)} L</td>
                          <td className="px-5 py-3 text-sm font-bold text-gray-900 text-right">{formatBRL(h.valor)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200 text-xs font-bold text-gray-700">
                      <td colSpan={6} className="px-5 py-3 text-right">Total</td>
                      <td className="px-5 py-3 text-right">{totais.litros.toFixed(0)} L</td>
                      <td className="px-5 py-3 text-right text-emerald-700">{formatBRL(totais.valor)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Modal de configuração */}
      <Modal isOpen={configModal !== null} onClose={() => setConfigModal(null)}
        title={`Configurar — ${parceriaSelecionada?.posto ?? ''}`} size="md">
        {parceriaSelecionada && (
          <ConfigModal
            parceria={parceriaSelecionada}
            frota={frota}
            onSalvar={handleSalvar}
            onClose={() => setConfigModal(null)}
            saving={savingConfig}
          />
        )}
      </Modal>
    </div>
  )
}
