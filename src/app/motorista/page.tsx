'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, Lock, Car, AlertCircle, LogOut,
  Search, ChevronRight, CheckCircle2, Clock, AlertTriangle, QrCode,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ABASTECIMENTOS, formatBRL, parseDataBR } from '@/lib/relatorios-data'

interface MotoristaUser {
  nome: string
  empresa: string
  placas: string[]
}

const USUARIOS: Record<string, { senha: string } & MotoristaUser> = {
  carlos:  { senha: '1234', nome: 'Carlos Santos',   empresa: 'TransLog Transportes', placas: ['ABC-1234', 'GHI-9012', 'DEF-5678'] },
  rafael:  { senha: '1234', nome: 'Rafael Melo',     empresa: 'TransLog Transportes', placas: ['JKL-3456'] },
  ana:     { senha: '1234', nome: 'Ana Fernandes',   empresa: 'LogBR Express',         placas: ['LBR-7777', 'LBR-1234'] },
  pedro:   { senha: '1234', nome: 'Pedro Gomes',     empresa: 'Construtora Alpha',     placas: ['CAL-5678'] },
  sandro:  { senha: '1234', nome: 'Sandro Mota',     empresa: 'LogBR Express',         placas: ['LBR-9999'] },
}

const STATUS_CONFIG = {
  pendente:   { icon: Clock,          color: 'text-amber-500',  bg: 'bg-amber-50',  border: 'border-amber-100', label: 'Pendente' },
  faturado:   { icon: CheckCircle2,   color: 'text-emerald-500',bg: 'bg-emerald-50',border: 'border-emerald-100',label: 'Validada' },
  contestado: { icon: AlertTriangle,  color: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-100',   label: 'Contestada' },
}

export default function MotoristaHomePage() {
  const router = useRouter()

  const [loginUser, setLoginUser]   = useState('')
  const [loginSenha, setLoginSenha] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggedIn, setLoggedIn]     = useState<MotoristaUser | null>(null)

  const [placa, setPlaca]           = useState('')
  const [placaError, setPlacaError] = useState('')
  const [resultados, setResultados] = useState<typeof ABASTECIMENTOS | null>(null)

  // Restore session on mount (so "Voltar" from detail page works)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('motorista_session')
      if (saved) {
        const { user, placaSalva } = JSON.parse(saved) as { user: MotoristaUser; placaSalva: string }
        setLoggedIn(user)
        if (placaSalva) {
          setPlaca(placaSalva)
          const reqs = ABASTECIMENTOS.filter(
            (a) => a.veiculo.replace('-', '').toUpperCase() === placaSalva.replace('-', '')
          )
          if (reqs.length > 0) setResultados(reqs)
        }
      }
    } catch { /* ignore */ }
  }, [])

  const handleLogin = () => {
    const u = loginUser.trim().toLowerCase()
    const entry = USUARIOS[u]
    if (!entry || entry.senha !== loginSenha.trim()) {
      setLoginError('Usuário ou senha incorretos.')
      return
    }
    setLoginError('')
    const user = { nome: entry.nome, empresa: entry.empresa, placas: entry.placas }
    setLoggedIn(user)
    sessionStorage.setItem('motorista_session', JSON.stringify({ user, placaSalva: '' }))
  }

  const handleBuscar = () => {
    if (!loggedIn) return
    const p = placa.trim().toUpperCase()
    if (!p) { setPlacaError('Digite a placa do veículo.'); return }

    const pertence = loggedIn.placas.some(
      (pl) => pl.replace('-', '') === p.replace('-', '')
    )
    if (!pertence) {
      setPlacaError('Esta placa não está cadastrada na sua conta.')
      return
    }

    const reqs = ABASTECIMENTOS.filter(
      (a) => a.veiculo.replace('-', '').toUpperCase() === p.replace('-', '')
    )
    if (reqs.length === 0) {
      setPlacaError('Nenhuma requisição encontrada para esta placa.')
      return
    }

    setPlacaError('')
    setResultados(reqs)
    sessionStorage.setItem('motorista_session', JSON.stringify({ user: loggedIn, placaSalva: p }))
  }

  // ── Login screen ─────────────────────────────────────────────────
  if (!loggedIn) {
    return (
      <div className="space-y-6">
        <div className="text-center pt-2">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
            <Car size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Entrar</h1>
          <p className="text-sm text-gray-500 mt-1">Acesse o app FuelLink para motoristas.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Usuário</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-3 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                placeholder="carlos"
                value={loginUser}
                onChange={(e) => { setLoginUser(e.target.value); setLoginError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Senha</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-3 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50"
                placeholder="••••"
                value={loginSenha}
                onChange={(e) => { setLoginSenha(e.target.value); setLoginError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
          </div>

          {loginError && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="shrink-0" /> {loginError}
            </div>
          )}

          <Button className="w-full" size="lg" onClick={handleLogin}>Entrar</Button>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 space-y-1.5">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Usuários de teste (senha: 1234)</p>
          {Object.entries(USUARIOS).map(([u, d]) => (
            <div key={u} className="flex items-center justify-between text-xs">
              <span className="font-mono text-blue-600 font-medium">{u}</span>
              <span className="text-gray-500">{d.nome} · {d.placas.join(', ')}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Home screen ──────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Greeting */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Olá, {loggedIn.nome.split(' ')[0]}!</p>
          <p className="text-xs text-gray-400">{loggedIn.empresa}</p>
        </div>
        <button
          onClick={() => { setLoggedIn(null); setLoginUser(''); setLoginSenha(''); setResultados(null); setPlaca(''); sessionStorage.removeItem('motorista_session') }}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={13} /> Sair
        </button>
      </div>

      {/* Plate search */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-700">Placa do veículo</p>
        <p className="text-xs text-gray-400 -mt-1">
          Digite a placa do veículo que está sob seu poder agora.
        </p>

        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base font-mono font-bold text-gray-900 text-center focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 uppercase tracking-widest"
            placeholder="ABC-1234"
            maxLength={8}
            value={placa}
            onChange={(e) => {
              setPlaca(e.target.value.toUpperCase())
              setPlacaError('')
              setResultados(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
          />
          <Button onClick={handleBuscar}>
            <Search size={15} /> Buscar
          </Button>
        </div>

        {placaError && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            <AlertCircle size={14} className="shrink-0" /> {placaError}
          </div>
        )}
      </div>

      {/* Results */}
      {resultados && (() => {
        const sorted = [...resultados].sort(
          (a, b) => parseDataBR(b.data).getTime() - parseDataBR(a.data).getTime()
        )
        const pendentes  = sorted.filter(a => a.status === 'pendente')
        const validadas  = sorted.filter(a => a.status !== 'pendente')

        const renderCard = (a: typeof resultados[0]) => {
          const cfg  = STATUS_CONFIG[a.status]
          const Icon = cfg.icon
          const isPendente = a.status === 'pendente'
          return (
            <button
              key={a.codigo}
              onClick={() => router.push(`/motorista/requisicao/${a.codigo}`)}
              className={`w-full flex items-center gap-3 ${cfg.bg} border ${cfg.border} rounded-xl px-4 py-3 hover:opacity-80 transition-opacity text-left`}
            >
              <Icon size={18} className={`${cfg.color} shrink-0`} />
              <div className="flex-1 min-w-0">
                {isPendente ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold ${cfg.color} uppercase tracking-wide`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{a.combustivel} · {a.litros} L · {formatBRL(a.valor)}</p>
                    <p className="text-[11px] text-gray-400">{a.data}</p>
                    <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                      <QrCode size={10} className="shrink-0" />
                      Escaneie o QR code para ver o código
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono font-bold text-gray-800">{a.codigo}</p>
                      <span className={`text-[10px] font-semibold ${cfg.color} uppercase tracking-wide`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{a.combustivel} · {a.litros} L · {formatBRL(a.valor)}</p>
                    <p className="text-[11px] text-gray-400">{a.data}</p>
                  </>
                )}
              </div>
              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </button>
          )
        }

        return (
          <div className="space-y-4">
            {pendentes.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <p className="text-sm font-semibold text-gray-700">
                  Pendentes — <span className="font-mono text-blue-600">{placa}</span>
                  <span className="ml-2 text-[11px] font-normal text-gray-400">({pendentes.length})</span>
                </p>
                {pendentes.map(renderCard)}
              </div>
            )}
            {validadas.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <p className="text-sm font-semibold text-gray-700">
                  Validadas — <span className="font-mono text-blue-600">{placa}</span>
                  <span className="ml-2 text-[11px] font-normal text-gray-400">({validadas.length})</span>
                </p>
                {validadas.map(renderCard)}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
