'use client'

import Link from 'next/link'
import { Sparkles, Users, Share2, TrendingUp, Truck, Fuel, ArrowRight } from 'lucide-react'
import { Reveal } from './Reveal'
import { LINKS } from './links'

const PONTOS = [
  {
    icon: Sparkles,
    title: 'Seja um dos primeiros',
    desc: 'A rede está sendo formada agora. Quem entra cedo garante presença e as melhores parcerias da sua região.',
  },
  {
    icon: Share2,
    title: 'Traga quem você já atende',
    desc: 'Convide os postos e transportadoras com quem você já trabalha. Em minutos, a relação de hoje vira digital.',
  },
  {
    icon: TrendingUp,
    title: 'Todo mundo ganha junto',
    desc: 'Cada novo parceiro aumenta as opções para todos: mais postos para as frotas, mais frotas para os postos.',
  },
]

export function EfeitoRede() {
  return (
    <section className="relative overflow-hidden bg-petrol-950 py-20 sm:py-24">
      <div aria-hidden className="absolute inset-0 bg-grid opacity-60" />
      <div aria-hidden className="absolute -top-24 left-1/3 w-96 h-96 rounded-full bg-fuel-500/15 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-fuel-200">
            <Users size={14} /> Estamos começando — e isso é uma vantagem
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Uma rede que cresce mais forte a cada parceiro
          </h2>
          <p className="mt-4 text-lg text-petrol-100/80 leading-relaxed">
            O FleetPass vale mais quanto mais gente participa. Entrando agora, você ajuda a construir
            o ecossistema — e colhe os benefícios de estar entre os primeiros.
          </p>
        </Reveal>

        <div className="mt-12 grid sm:grid-cols-3 gap-4">
          {PONTOS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.1}>
              <div className="h-full rounded-xl2 bg-white/5 border border-white/10 p-6 hover:bg-white/[0.08] transition-colors">
                <span className="inline-flex w-11 h-11 rounded-xl bg-fuel-500/15 items-center justify-center">
                  <p.icon size={20} className="text-fuel-300" />
                </span>
                <h3 className="mt-4 font-semibold text-white">{p.title}</h3>
                <p className="mt-1.5 text-sm text-petrol-100/70 leading-relaxed">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.15} className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link
            href={LINKS.transportadora}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-petrol-950 hover:bg-petrol-50 transition-all hover:-translate-y-0.5"
          >
            <Truck size={18} /> Entrar como Transportadora <ArrowRight size={17} />
          </Link>
          <Link
            href={LINKS.posto}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-fuel-500 px-6 py-3.5 text-base font-semibold text-white hover:bg-fuel-600 transition-all hover:-translate-y-0.5"
          >
            <Fuel size={18} /> Entrar como Posto <ArrowRight size={17} />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
