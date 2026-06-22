'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Search, Clock, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Cliente {
  id: string
  empresa: string
  cnpj: string
  cidade: string
  desde: string
  status: 'ativo' | 'bloqueado'
  totalAbast: number
  totalValor: number
  totalEventos: number
  bloqueios: number
  ultimoEvento: string
  ultimaData: string
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function RelatorioClienteListPage() {
  const [busca, setBusca] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/posto/relatorios/cliente')
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
      .then((d) => setClientes(d.clientes ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [])

  const filtrados = clientes.filter(c =>
    c.empresa.toLowerCase().includes(busca.toLowerCase()) ||
    c.cnpj.includes(busca)
  )

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Clock size={15} className="text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Linha do Tempo do Cliente</h1>
        </div>
        <p className="text-gray-500 text-sm">
          Histórico completo da parceria: abastecimentos, bloqueios, faturamentos e alterações contratuais.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar empresa..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
        />
      </div>

      {error ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-red-500">
          <AlertCircle size={16} /> {error}
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
          <Loader2 size={20} className="animate-spin" /> <span className="text-sm">Carregando clientes…</span>
        </div>
      ) : clientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
          <Clock size={28} className="opacity-30" />
          <p className="text-sm font-medium">Nenhuma empresa parceira ainda.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtrados.map(c => (
          <Link key={c.id} href={`/posto/relatorios/cliente/${c.id}`}>
            <div className="group bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 cursor-pointer">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.status === 'bloqueado' ? 'bg-red-100' : 'bg-indigo-50'}`}>
                    <span className={`text-sm font-bold ${c.status === 'bloqueado' ? 'text-red-600' : 'text-indigo-600'}`}>
                      {c.empresa.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-gray-900 truncate">{c.empresa}</h3>
                      <Badge variant={c.status === 'bloqueado' ? 'expirado' : 'ativo'} />
                    </div>
                    <p className="text-xs text-gray-400">{c.cnpj} · {c.cidade}</p>
                  </div>
                </div>
                <ArrowRight size={16} className="text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0 mt-1" />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 pt-3 border-t border-gray-50">
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Parceiro desde</p>
                  <p className="text-xs font-medium text-gray-700">{c.desde}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Abastecimentos</p>
                  <p className="text-xs font-medium text-gray-700">{c.totalAbast}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">Total movimentado</p>
                  <p className="text-xs font-medium text-gray-700">{formatBRL(c.totalValor)}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${c.bloqueios > 0 ? 'bg-red-400' : 'bg-emerald-400'}`} />
                <p className="text-[11px] text-gray-400">
                  Último evento: <span className="text-gray-600">{c.ultimoEvento}</span> · {c.ultimaData}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      )}
    </div>
  )
}
