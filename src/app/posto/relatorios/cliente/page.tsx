'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Search, Clock, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const CLIENTES = [
  { id: 1, empresa: 'TransLog Transportes',  cnpj: '12.345.678/0001-99', cidade: 'São Paulo, SP',  desde: '15/01/2025', status: 'ativo'     as const, totalAbast: 62, totalValor: 78240,  totalEventos: 16, bloqueios: 1, ultimoEvento: 'Veículo DEF-5678 bloqueado',            ultimaData: '12/03/2025' },
  { id: 2, empresa: 'LogBR Express',          cnpj: '22.333.444/0001-55', cidade: 'São Paulo, SP',  desde: '01/03/2025', status: 'ativo'     as const, totalAbast: 18, totalValor: 24100,  totalEventos:  7, bloqueios: 0, ultimoEvento: 'Novo motorista cadastrado',              ultimaData: '12/03/2025' },
  { id: 3, empresa: 'Construtora Alpha',      cnpj: '98.765.432/0001-00', cidade: 'São Paulo, SP',  desde: '20/02/2025', status: 'bloqueado' as const, totalAbast: 34, totalValor: 42680,  totalEventos: 10, bloqueios: 2, ultimoEvento: 'Bloqueio automático por limite atingido', ultimaData: '14/03/2025' },
  { id: 4, empresa: 'Turbo Fretes',           cnpj: '33.444.555/0001-66', cidade: 'Guarulhos, SP', desde: '20/02/2025', status: 'ativo'     as const, totalAbast: 28, totalValor: 31500,  totalEventos:  8, bloqueios: 0, ultimoEvento: '3º abastecimento do ciclo',              ultimaData: '13/03/2025' },
  { id: 5, empresa: 'TransRota Logística',    cnpj: '66.777.888/0001-99', cidade: 'São Paulo, SP',  desde: '10/01/2025', status: 'ativo'     as const, totalAbast: 41, totalValor: 52300,  totalEventos: 11, bloqueios: 1, ultimoEvento: 'Motorista reativado',                   ultimaData: '08/03/2025' },
]

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function RelatorioClienteListPage() {
  const [busca, setBusca] = useState('')

  const filtrados = CLIENTES.filter(c =>
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
    </div>
  )
}
