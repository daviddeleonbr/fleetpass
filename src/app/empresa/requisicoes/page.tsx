'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, ChevronDown, ChevronRight, Fuel, Car, User, MapPin, Calendar, Clock, Gauge, CheckCircle2, AlertCircle, Lock, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs } from '@/components/ui/tabs'
import Link from 'next/link'

type Status = 'pendente' | 'ativo' | 'concluido' | 'expirado' | 'cancelado'

type Requisicao = {
  id: string
  codigo: string
  criadaEm: string
  veiculo: string
  motorista: string
  posto: string
  limite: string
  combustivel: string
  validade: string
  status: Status
  validacao?: {
    dataHora: string
    frentista: string
    litros: string
    valorCobrado: string
    hodometro: string
    observacao?: string
  }
}

export default function RequisioesPage() {
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([])
  const [loading, setLoading]         = useState(true)
  const [tab, setTab]                 = useState('abertas')
  const [search, setSearch]           = useState('')
  const [expanded, setExpanded]       = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/empresa/requisicoes')
      .then(r => r.json())
      .then(d => setRequisicoes(d.requisicoes ?? []))
      .finally(() => setLoading(false))
  }, [])

  const abertas   = requisicoes.filter(r => r.status === 'pendente' || r.status === 'ativo')
  const usadas    = requisicoes.filter(r => r.status === 'concluido')
  const expiradas = requisicoes.filter(r => r.status === 'expirado' || r.status === 'cancelado')

  const tabData = { abertas, usadas, expiradas, todas: requisicoes }

  const tabs = [
    { id: 'abertas',   label: 'Abertas',   count: abertas.length },
    { id: 'usadas',    label: 'Usadas',    count: usadas.length },
    { id: 'expiradas', label: 'Expiradas', count: expiradas.length },
    { id: 'todas',     label: 'Todas',     count: requisicoes.length },
  ]

  const currentList = (tabData[tab as keyof typeof tabData] ?? requisicoes).filter(r =>
    r.veiculo.toLowerCase().includes(search.toLowerCase()) ||
    r.motorista.toLowerCase().includes(search.toLowerCase()) ||
    r.codigo.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Requisições</h1>
          <p className="text-gray-500 text-sm">Gerencie todas as requisições de abastecimento.</p>
        </div>
        <Link href="/empresa/requisicoes/nova">
          <Button size="sm"><Plus size={14} /> Nova requisição</Button>
        </Link>
      </div>

      <Tabs tabs={tabs} activeTab={tab} onChange={setTab} />

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
          placeholder="Buscar por veículo, motorista ou código..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Carregando requisições...</span>
          </div>
        ) : currentList.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            {requisicoes.length === 0
              ? 'Nenhuma requisição criada ainda.'
              : 'Nenhuma requisição encontrada para esse filtro.'}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                <th className="px-4 py-3 w-4" />
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Criada em</th>
                <th className="px-4 py-3 text-left">Veículo</th>
                <th className="px-4 py-3 text-left">Motorista</th>
                <th className="px-4 py-3 text-left">Posto</th>
                <th className="px-4 py-3 text-left">Limite</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentList.map(r => (
                <>
                  <tr
                    key={r.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  >
                    <td className="px-4 py-3 text-gray-300">
                      {expanded === r.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{r.codigo}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{r.criadaEm}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.veiculo}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.motorista}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.posto}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700">{r.limite}</td>
                    <td className="px-4 py-3"><Badge variant={r.status as any} /></td>
                  </tr>
                  {expanded === r.id && (
                    <tr key={`${r.id}-detail`}>
                      <td colSpan={8} className="px-8 py-4 bg-gray-50/70 border-b border-gray-100">
                        {r.status === 'concluido' && r.validacao ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-1">
                              <CheckCircle2 size={14} className="text-emerald-500" />
                              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Abastecimento validado</span>
                            </div>
                            <div className="grid grid-cols-3 gap-x-8 gap-y-2">
                              <div className="flex items-center gap-2">
                                <Clock size={12} className="text-gray-300 shrink-0" />
                                <div>
                                  <p className="text-[10px] text-gray-400">Data e hora</p>
                                  <p className="text-sm font-medium text-gray-800">{r.validacao.dataHora}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <User size={12} className="text-gray-300 shrink-0" />
                                <div>
                                  <p className="text-[10px] text-gray-400">Frentista</p>
                                  <p className="text-sm font-medium text-gray-800">{r.validacao.frentista}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin size={12} className="text-gray-300 shrink-0" />
                                <div>
                                  <p className="text-[10px] text-gray-400">Posto</p>
                                  <p className="text-sm font-medium text-gray-800">{r.posto}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Fuel size={12} className="text-gray-300 shrink-0" />
                                <div>
                                  <p className="text-[10px] text-gray-400">Combustível</p>
                                  <p className="text-sm font-medium text-gray-800">{r.combustivel}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Gauge size={12} className="text-gray-300 shrink-0" />
                                <div>
                                  <p className="text-[10px] text-gray-400">Volume abastecido</p>
                                  <p className="text-sm font-medium text-gray-800">{r.validacao.litros}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Car size={12} className="text-gray-300 shrink-0" />
                                <div>
                                  <p className="text-[10px] text-gray-400">Hodômetro</p>
                                  <p className="text-sm font-medium text-gray-800">{r.validacao.hodometro}</p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-gray-100 mt-1">
                              <div>
                                {r.validacao.observacao && (
                                  <p className="text-xs text-gray-400 italic">{r.validacao.observacao}</p>
                                )}
                              </div>
                              <p className="text-base font-bold text-gray-900">{r.validacao.valorCobrado}</p>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {(r.status === 'pendente' || r.status === 'ativo') && (
                              <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
                                <Lock size={12} className="shrink-0" />
                                Código e QR code disponíveis apenas após o frentista confirmar o abastecimento.
                              </div>
                            )}
                            <div className="grid grid-cols-4 gap-x-8 gap-y-2">
                              <div className="flex items-center gap-2">
                                <Fuel size={12} className="text-gray-300 shrink-0" />
                                <div>
                                  <p className="text-[10px] text-gray-400">Combustível</p>
                                  <p className="text-sm font-medium text-gray-700">{r.combustivel}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar size={12} className="text-gray-300 shrink-0" />
                                <div>
                                  <p className="text-[10px] text-gray-400">Validade</p>
                                  <p className="text-sm font-medium text-gray-700">{r.validade}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin size={12} className="text-gray-300 shrink-0" />
                                <div>
                                  <p className="text-[10px] text-gray-400">Posto autorizado</p>
                                  <p className="text-sm font-medium text-gray-700">{r.posto}</p>
                                </div>
                              </div>
                              {(r.status === 'expirado' || r.status === 'cancelado') && (
                                <div className="flex items-center gap-2">
                                  <AlertCircle size={12} className="text-red-300 shrink-0" />
                                  <div>
                                    <p className="text-[10px] text-gray-400">Motivo</p>
                                    <p className="text-sm font-medium text-red-500">
                                      {r.status === 'cancelado' ? 'Cancelada' : 'Prazo expirado sem uso'}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
