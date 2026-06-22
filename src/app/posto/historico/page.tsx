'use client'

import { useState, useMemo, useEffect } from 'react'
import { Download, Store, X, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const POR_PAGINA = 5

type Abastecimento = {
  posto: string; data: string; empresa: string; veiculo: string
  motorista: string; combustivel: string; litros: string; valor: string
}

function parseBRL(v: string) {
  return parseFloat(v.replace('R$ ', '').replace('.', '').replace(',', '.')) || 0
}

function exportarCSV(dados: Abastecimento[]) {
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
  const [filtroPosto, setFiltroPosto]         = useState('')
  const [filtroEmpresa, setFiltroEmpresa]     = useState('')
  const [filtroComb, setFiltroComb]           = useState('')
  const [pagina, setPagina]                   = useState(1)

  const [historico, setHistorico]   = useState<Abastecimento[]>([])
  const [postosOpt, setPostosOpt]   = useState<string[]>([])
  const [empresasOpt, setEmpresasOpt] = useState<string[]>([])
  const [combOpt, setCombOpt]       = useState<string[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  useEffect(() => {
    fetch('/api/posto/historico')
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
      .then((d) => {
        setHistorico(d.historico ?? [])
        setPostosOpt(d.postos ?? [])
        setEmpresasOpt(d.empresas ?? [])
        setCombOpt(d.combustiveis ?? [])
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro ao carregar.'))
      .finally(() => setLoading(false))
  }, [])

  const filtrados = useMemo(() => {
    return historico.filter((h) => {
      const matchPosto   = !filtroPosto   || h.posto       === filtroPosto
      const matchEmpresa = !filtroEmpresa || h.empresa     === filtroEmpresa
      const matchComb    = !filtroComb    || h.combustivel === filtroComb
      return matchPosto && matchEmpresa && matchComb
    })
  }, [filtroPosto, filtroEmpresa, filtroComb, historico])

  useEffect(() => { setPagina(1) }, [filtroPosto, filtroEmpresa, filtroComb])

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
          <p className="text-xs text-gray-400 mt-0.5">Total</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-gray-500">Abastecimentos</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{filtrados.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">Total</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-gray-500">Empresas atendidas</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{empresasSet.size}</p>
          <p className="text-xs text-gray-400 mt-0.5">Total</p>
        </Card>
        <Card padding="md">
          <p className="text-sm text-gray-500">Volume total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{litrosTotal} L</p>
          <p className="text-xs text-gray-400 mt-0.5">Total</p>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative">
          <Store size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            value={filtroPosto}
            onChange={(e) => setFiltroPosto(e.target.value)}
            className="pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
          >
            <option value="">Todos os postos</option>
            {postosOpt.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <select
          value={filtroEmpresa}
          onChange={(e) => setFiltroEmpresa(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
        >
          <option value="">Todas empresas</option>
          {empresasOpt.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>

        <select
          value={filtroComb}
          onChange={(e) => setFiltroComb(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-500"
        >
          <option value="">Todos combustíveis</option>
          {combOpt.map((c) => <option key={c} value={c}>{c}</option>)}
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
        {error ? (
          <div className="flex items-center justify-center gap-2 py-14 text-sm text-red-500">
            <AlertCircle size={16} /> {error}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-gray-400">
            <Loader2 size={20} className="animate-spin" /> <span className="text-sm">Carregando histórico…</span>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2">
            <Store size={24} className="text-gray-200" />
            <p className="text-sm font-medium text-gray-400">
              {historico.length === 0 ? 'Nenhum abastecimento registrado ainda.' : 'Nenhum registro encontrado'}
            </p>
            {historico.length > 0 && (
              <button
                onClick={() => { setFiltroPosto(''); setFiltroEmpresa(''); setFiltroComb('') }}
                className="text-xs text-blue-500 hover:underline mt-1"
              >
                Limpar filtros
              </button>
            )}
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
