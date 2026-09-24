'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import {
  Search, Loader2, AlertCircle, SearchX, Compass, SlidersHorizontal, List, Map as MapIcon,
  ArrowUpDown, ShieldCheck, MessageCircle, Check, X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LINKS } from '@/components/landing/links'
import { PostoDescobertoCard } from '@/components/vitrine/posto-descoberto-card'
import { PostoDescobertoModal } from '@/components/vitrine/posto-descoberto-modal'
import type { PostoDescoberto } from '@/components/vitrine/types'

// Leaflet precisa de window — nunca renderiza no servidor.
const MapaPostos = dynamic(() => import('@/components/vitrine/mapa-postos'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-50 text-gray-300">
      <Loader2 size={18} className="animate-spin" />
    </div>
  ),
})

type Vista      = 'lista' | 'mapa'
type Ordenacao  = 'avaliacao' | 'nome' | 'cidade'

const ORDENACOES: { id: Ordenacao; label: string }[] = [
  { id: 'avaliacao', label: 'Melhor avaliados' },
  { id: 'nome',      label: 'Nome (A–Z)' },
  { id: 'cidade',    label: 'Cidade' },
]

function normalizar(v: string): string {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function VitrinePage() {
  const [postos, setPostos]   = useState<PostoDescoberto[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro]       = useState<string | null>(null)

  const [busca, setBusca]           = useState('')
  const [vista, setVista]           = useState<Vista>('lista')
  const [ordenacao, setOrdenacao]   = useState<Ordenacao>('avaliacao')
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [bandeiras, setBandeiras]   = useState<string[]>([])
  const [combustiveis, setCombustiveis] = useState<string[]>([])
  const [selecionado, setSelecionado]   = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      setErro(null)
      const res = await fetch('/api/empresa/vitrine/descobrir')
      const d   = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Erro ao carregar os postos.')
      setPostos(d.postos ?? [])
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar os postos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // Opções de filtro saem dos dados reais, não de lista fixa.
  const bandeirasDisponiveis = useMemo(
    () => [...new Set(postos.map((p) => p.bandeira))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [postos],
  )
  const combustiveisDisponiveis = useMemo(
    () => [...new Set(postos.flatMap((p) => p.combustiveis))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [postos],
  )

  const filtrados = useMemo(() => {
    const termo = normalizar(busca.trim())
    return postos
      .filter((p) => {
        if (bandeiras.length && !bandeiras.includes(p.bandeira)) return false
        if (combustiveis.length && !combustiveis.some((c) => p.combustiveis.includes(c))) return false
        if (!termo) return true
        return normalizar(`${p.nome} ${p.cidade} ${p.estado}`).includes(termo)
      })
      .sort((a, b) => {
        if (ordenacao === 'nome')   return a.nome.localeCompare(b.nome, 'pt-BR')
        if (ordenacao === 'cidade') return a.cidade.localeCompare(b.cidade, 'pt-BR') || a.nome.localeCompare(b.nome, 'pt-BR')
        return (b.nota ?? -1) - (a.nota ?? -1) || a.nome.localeCompare(b.nome, 'pt-BR')
      })
  }, [postos, busca, bandeiras, combustiveis, ordenacao])

  const filtrosAtivos = bandeiras.length + combustiveis.length
  const comCoordenada = filtrados.filter((p) => p.lat != null && p.lng != null).length

  const alternar = (lista: string[], set: (v: string[]) => void, valor: string) =>
    set(lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor])

  return (
    <div className="space-y-6">
      {/* ── Banner ─────────────────────────────────────────────────────────
          A arte é usada inteira, sem recorte e sem overlay: largura total e
          altura automática pela proporção nativa (2108x372 — o arquivo original
          vinha com 352px de margem branca, removida no recorte). Os textos e o
          card fazem parte da própria imagem, por isso NÃO são repetidos em HTML;
          o alt abaixo é o que leitores de tela anunciam. */}
      {/* -mt-6 cancela o padding superior do <main> do layout, encostando o
          banner no topo da área de conteúdo. O nome do arquivo é versionado
          porque o otimizador do Next e o navegador cacheiam pela URL: trocar a
          arte mantendo o mesmo nome continua servindo a versão antiga. */}
      <section className="-mt-6 rounded-2xl overflow-hidden">
        <Image
          src="/vitrine/banner-v2.jpg"
          alt="Vitrine — Descubra novos postos. Conheça os postos ativos na plataforma com quem sua empresa ainda não tem parceria; o convite para uma nova parceria parte sempre do posto. Postos verificados, com cadastro validado. Combustíveis conforme cada posto. Cobertura em todo o seu trajeto. Avaliações reais de outras transportadoras. Parcerias que movem o seu negócio: qualidade, segurança e condições definidas em contrato para a sua frota."
          width={2108}
          height={372}
          priority
          sizes="100vw"
          className="w-full h-auto"
        />
      </section>

      {loading && (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 size={22} className="animate-spin" />
        </div>
      )}

      {!loading && erro && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{erro}</p>
        </div>
      )}

      {!loading && !erro && (
        <>
          {/* ── Barra de ferramentas ─────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                <Input
                  type="search"
                  placeholder="Buscar posto, cidade ou estado..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9"
                  aria-label="Buscar posto por nome, cidade ou estado"
                />
              </div>

              <Button
                variant="secondary"
                size="md"
                onClick={() => setFiltrosAbertos((v) => !v)}
                aria-expanded={filtrosAbertos}
              >
                <SlidersHorizontal size={15} />
                Filtros
                {filtrosAtivos > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-petrol-100 text-petrol-700 text-[11px] font-semibold">
                    {filtrosAtivos}
                  </span>
                )}
              </Button>

              <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5 ml-auto">
                {([['lista', List, 'Lista'], ['mapa', MapIcon, 'Mapa']] as const).map(([id, Icon, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setVista(id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      vista === id ? 'bg-petrol-50 text-petrol-700' : 'text-gray-500 hover:text-gray-700',
                    )}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>

              <label className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                <ArrowUpDown size={14} className="text-gray-400" />
                <select
                  value={ordenacao}
                  onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
                  className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-petrol-500"
                  aria-label="Ordenar postos"
                >
                  {ORDENACOES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </label>
            </div>

            {filtrosAbertos && (
              <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
                <Grupo
                  titulo="Bandeira"
                  opcoes={bandeirasDisponiveis}
                  selecionadas={bandeiras}
                  onToggle={(v) => alternar(bandeiras, setBandeiras, v)}
                />
                <Grupo
                  titulo="Combustível"
                  opcoes={combustiveisDisponiveis}
                  selecionadas={combustiveis}
                  onToggle={(v) => alternar(combustiveis, setCombustiveis, v)}
                />
                {filtrosAtivos > 0 && (
                  <button
                    type="button"
                    onClick={() => { setBandeiras([]); setCombustiveis([]) }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800"
                  >
                    <X size={13} /> Limpar filtros
                  </button>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500">
              {filtrados.length} {filtrados.length === 1 ? 'posto encontrado' : 'postos encontrados'}
            </p>
          </div>

          {/* ── Conteúdo ─────────────────────────────────────────────── */}
          {postos.length === 0 ? (
            <Vazio
              titulo="Nenhum posto novo por aqui."
              texto="Você já tem parceria com todos os postos ativos da plataforma."
            />
          ) : filtrados.length === 0 ? (
            <Vazio
              icone={SearchX}
              titulo="Nenhum posto encontrado."
              texto="Ajuste a busca ou os filtros selecionados."
            />
          ) : vista === 'mapa' ? (
            <div className="h-[32rem] rounded-xl overflow-hidden border border-gray-100 shadow-sm">
              <MapaPostos postos={filtrados} onSelecionar={setSelecionado} />
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_20rem] gap-5 items-start">
              <div className="grid gap-5 sm:grid-cols-2">
                {filtrados.map((p) => (
                  <PostoDescobertoCard key={p.postoId} posto={p} onAbrir={setSelecionado} />
                ))}
              </div>

              <aside className="space-y-5">
                {/* Arte institucional. Como o banner, é usada inteira: os textos
                    fazem parte do arquivo, então vão no alt e não em HTML. */}
                <Image
                  src="/vitrine/parcerias.jpg"
                  alt="Parcerias que levam sua frota mais longe: condições exclusivas, abastecimento sem burocracia e rede confiável de parceiros."
                  width={1643}
                  height={815}
                  sizes="(max-width: 1024px) 100vw, 20rem"
                  className="w-full h-auto rounded-xl shadow-sm"
                />

                <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-900">Postos no mapa</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {comCoordenada > 0
                      ? 'Veja onde ficam os postos desta busca.'
                      : 'Os postos desta busca ainda não têm localização cadastrada.'}
                  </p>
                  {comCoordenada > 0 && (
                    <>
                      <div className="h-44 rounded-lg overflow-hidden mt-3 border border-gray-100">
                        <MapaPostos postos={filtrados} onSelecionar={setSelecionado} />
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => setVista('mapa')}
                      >
                        Ver mapa completo
                      </Button>
                    </>
                  )}
                </div>

                <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-900">Precisa de ajuda?</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Fale com o time do FleetPass sobre novas parcerias.
                  </p>

                  <a
                    href={`${LINKS.whatsapp}?text=${encodeURIComponent('Olá! Gostaria de saber mais sobre novas parcerias no FleetPass.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-3"
                  >
                    <Button size="sm" className="w-full">
                      <MessageCircle size={14} /> Falar no WhatsApp
                    </Button>
                  </a>
                </div>

                <div className="bg-petrol-50 border border-petrol-100 rounded-xl p-5">
                  <span className="w-9 h-9 rounded-lg bg-white flex items-center justify-center mb-3">
                    <ShieldCheck size={17} className="text-petrol-600" />
                  </span>
                  <h3 className="text-sm font-semibold text-petrol-950">Abasteça com segurança</h3>
                  <p className="text-xs text-petrol-900/70 mt-1 leading-relaxed">
                    Toda parceria nasce de um convite do posto, com condições comerciais
                    definidas antes do primeiro abastecimento.
                  </p>
                </div>
              </aside>
            </div>
          )}
        </>
      )}

      {/* key força instância nova por posto — sem estado residual do anterior. */}
      {selecionado && (
        <PostoDescobertoModal
          key={selecionado}
          postoId={selecionado}
          onClose={() => setSelecionado(null)}
        />
      )}
    </div>
  )
}

function Grupo({
  titulo, opcoes, selecionadas, onToggle,
}: {
  titulo: string; opcoes: string[]; selecionadas: string[]; onToggle: (v: string) => void
}) {
  if (opcoes.length === 0) return null
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{titulo}</p>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => {
          const ativo = selecionadas.includes(o)
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              aria-pressed={ativo}
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                ativo
                  ? 'bg-petrol-50 border-petrol-200 text-petrol-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              {ativo && <Check size={12} />}
              {o}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Vazio({
  icone: Icone = Compass, titulo, texto,
}: {
  icone?: React.ElementType; titulo: string; texto: string
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 bg-white border border-gray-100 rounded-xl">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
        <Icone size={24} className="text-gray-300" />
      </div>
      <h2 className="text-base font-semibold text-gray-900">{titulo}</h2>
      <p className="text-sm text-gray-500 mt-1.5 max-w-sm">{texto}</p>
    </div>
  )
}
