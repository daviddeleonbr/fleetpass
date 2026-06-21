'use client'

import { useState, useMemo } from 'react'
import { Download, Store, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const POSTOS       = ['Shell — Centro', 'Shell — Norte']
const EMPRESAS     = ['TransLog Transportes', 'LogBR Express', 'Construtora Alpha', 'Turbo Fretes', 'TransRota Logística']
const COMBUSTIVEIS = ['Diesel S-10', 'Gasolina Comum', 'Etanol', 'Diesel Comum']
const POR_PAGINA   = 5

const historico = [
  { posto: 'Shell — Centro', data: '10/03/2025', empresa: 'TransLog Transportes', veiculo: 'ABC-1234', motorista: 'Roberto Lima',   combustivel: 'Diesel S-10',    litros: '45 L',  valor: 'R$ 287,50' },
  { posto: 'Shell — Norte',  data: '10/03/2025', empresa: 'LogBR Express',        veiculo: 'LBR-9999', motorista: 'Sandro Mota',     combustivel: 'Diesel S-10',    litros: '60 L',  valor: 'R$ 384,00' },
  { posto: 'Shell — Centro', data: '09/03/2025', empresa: 'Construtora Alpha',    veiculo: 'CAL-5678', motorista: 'Pedro Gomes',     combustivel: 'Gasolina Comum', litros: '35 L',  valor: 'R$ 195,00' },
  { posto: 'Shell — Centro', data: '09/03/2025', empresa: 'TransLog Transportes', veiculo: 'GHI-9012', motorista: 'Carlos Santos',   combustivel: 'Gasolina Comum', litros: '30 L',  valor: 'R$ 167,40' },
  { posto: 'Shell — Norte',  data: '08/03/2025', empresa: 'Turbo Fretes',         veiculo: 'TFR-3456', motorista: 'Raimundo Neto',   combustivel: 'Etanol',         litros: '40 L',  valor: 'R$ 140,00' },
  { posto: 'Shell — Norte',  data: '08/03/2025', empresa: 'LogBR Express',        veiculo: 'LBR-7777', motorista: 'Ana Fernandes',   combustivel: 'Diesel S-10',    litros: '80 L',  valor: 'R$ 512,00' },
  { posto: 'Shell — Centro', data: '07/03/2025', empresa: 'TransRota Logística',  veiculo: 'TRL-2345', motorista: 'João Batista',    combustivel: 'Diesel S-10',    litros: '55 L',  valor: 'R$ 352,00' },
  { posto: 'Shell — Norte',  data: '07/03/2025', empresa: 'Construtora Alpha',    veiculo: 'CAL-6789', motorista: 'Marcos Lima',     combustivel: 'Diesel Comum',   litros: '50 L',  valor: 'R$ 290,00' },
  { posto: 'Shell — Centro', data: '06/03/2025', empresa: 'TransLog Transportes', veiculo: 'DEF-5678', motorista: 'Ana Costa',       combustivel: 'Diesel S-10',    litros: '65 L',  valor: 'R$ 416,00' },
  { posto: 'Shell — Norte',  data: '06/03/2025', empresa: 'Turbo Fretes',         veiculo: 'TFR-8901', motorista: 'Claudia Sousa',   combustivel: 'Gasolina Comum', litros: '25 L',  valor: 'R$ 139,25' },
]

function parseBRL(v: string) {
  return parseFloat(v.replace('R$ ', '').replace('.', '').replace(',', '.')) || 0
}

function exportarCSV(dados: typeof historico) {
  const cabecalho = ['Data', 'Posto', 'Empresa', 'Veículo', 'Motorista', 'Combustível', 'Litros', 'Valor']
  const linhas = dados.map((h) => [h.data, h.posto, h.empresa, h.veiculo, h.motorista, h.combustivel, h.litros, h.valor])
  const csv = [cabecalho, ...linhas].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'historico-abastecimentos.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export default function HistoricoPostoPage() {
  const [mes, setMes]                         = useState('Março 2025')
  const [filtroPosto, setFiltroPosto]         = useState('')
  const [filtroEmpresa, setFiltroEmpresa]     = useState('')
  const [filtroComb, setFiltroComb]           = useState('')
  const [pagina, setPagina]                   = useState(1)

  const filtrados = useMemo(() => {
    setPagina(1)
    return historico.filter((h) => {
      const matchPosto   = !filtroPosto   || h.posto       === filtroPosto
      const matchEmpresa = !filtroEmpresa || h.empresa     === filtroEmpresa
      const matchComb    = !filtroComb    || h.combustivel === filtroComb
      return matchPosto && matchEmpresa && matchComb
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroPosto, filtroEmpresa, filtroComb])

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA))
  const paginaAtual  = Math.min(pagina, totalPaginas)
  const paginados    = filtrados.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA)

  const temFiltroSecundario = filtroPosto !== '' || filtroEmpresa !== '' || filtroComb !== ''

  const receitaTotal = filtrados.reduce((s, h) => s + parseBRL(h.valor), 0)
  const litrosTotal  = filtrados.reduce((s, h) => s + parseInt(h.litros), 0)
  const empresasSet  = new Set(filtrados.map((h) => h.empresa))

  const formatBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histórico</h1>
          <p className="text-gray-500 text-sm">Todos os abastecimentos B2B realizados nos postos.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => exportarCSV(filtrados)}>
          <Download size={14} /> Exportar CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card padding="md">
          <p className="text-sm text-gray-500">Receita B2B</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatBRL(receitaTotal)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{mes}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-gray-500">Abastecimentos</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{filtrados.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">{mes}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-gray-500">Empresas atendidas</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{empresasSet.size}</p>
          <p className="text-xs text-gray-400 mt-0.5">{mes}</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-gray-500">Volume total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{litrosTotal} L</p>
          <p className="text-xs text-gray-400 mt-0.5">{mes}</p>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
        >
          <option>Março 2025</option>
          <option>Fevereiro 2025</option>
          <option>Janeiro 2025</option>
        </select>

        <div className="relative">
          <Store size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            value={filtroPosto}
            onChange={(e) => setFiltroPosto(e.target.value)}
            className="pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
          >
            <option value="">Todos os postos</option>
            {POSTOS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <select
          value={filtroEmpresa}
          onChange={(e) => setFiltroEmpresa(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
        >
          <option value="">Todas empresas</option>
          {EMPRESAS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>

        <select
          value={filtroComb}
          onChange={(e) => setFiltroComb(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
        >
          <option value="">Todos combustíveis</option>
          {COMBUSTIVEIS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {temFiltroSecundario && (
          <button
            onClick={() => { setFiltroPosto(''); setFiltroEmpresa(''); setFiltroComb('') }}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            <X size={12} /> Limpar filtros
          </button>
        )}

        <p className="text-xs text-gray-400 ml-auto">
          {filtrados.length} de {historico.length} registros
        </p>
      </div>

      {/* Tabela */}
      <Card padding="none">
        {filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2">
            <Store size={24} className="text-gray-200" />
            <p className="text-sm font-medium text-gray-400">Nenhum registro encontrado</p>
            <button
              onClick={() => { setFiltroPosto(''); setFiltroEmpresa(''); setFiltroComb('') }}
              className="text-xs text-blue-500 hover:underline mt-1"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                  <th className="px-6 py-3 text-left">Data</th>
                  <th className="px-6 py-3 text-left">Posto</th>
                  <th className="px-6 py-3 text-left">Empresa</th>
                  <th className="px-6 py-3 text-left">Veículo</th>
                  <th className="px-6 py-3 text-left">Motorista</th>
                  <th className="px-6 py-3 text-left">Combustível</th>
                  <th className="px-6 py-3 text-left">Litros</th>
                  <th className="px-6 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginados.map((h, i) => (
                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm text-gray-500">{h.data}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                        <Store size={10} /> {h.posto}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-700">{h.empresa}</td>
                    <td className="px-6 py-3 text-sm font-mono text-gray-600">{h.veiculo}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{h.motorista}</td>
                    <td className="px-6 py-3">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{h.combustivel}</span>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{h.litros}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">{h.valor}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paginação */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Exibindo {(paginaAtual - 1) * POR_PAGINA + 1}–{Math.min(paginaAtual * POR_PAGINA, filtrados.length)} de {filtrados.length} registros
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaAtual === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={15} className="text-gray-600" />
                </button>

                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPagina(n)}
                    className={`min-w-[28px] h-7 text-xs rounded-lg transition-colors ${
                      n === paginaAtual
                        ? 'bg-blue-600 text-white font-medium'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {n}
                  </button>
                ))}

                <button
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaAtual === totalPaginas}
                  className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={15} className="text-gray-600" />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
