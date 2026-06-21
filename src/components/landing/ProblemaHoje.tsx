'use client'

import { Fuel, FileX2, Ban, TrendingDown, ArrowRight } from 'lucide-react'
import { Reveal } from './Reveal'

const ETAPAS = [
  {
    icon: Fuel,
    title: 'O posto abastece de boa-fé',
    desc: 'Caminhão chega, frentista enche o tanque, motorista assina. Tudo na confiança, como sempre foi.',
  },
  {
    icon: FileX2,
    title: 'A transportadora nega',
    desc: '“Essa assinatura não é nossa.” “Esse veículo não estava liberado.” A cobrança vira uma disputa.',
  },
  {
    icon: Ban,
    title: 'O posto come o prejuízo',
    desc: 'Sem prova de autorização, o posto fica sem o dinheiro do combustível que já saiu da bomba.',
  },
]

export function ProblemaHoje() {
  return (
    <section className="py-20 sm:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold text-fuel-600 uppercase tracking-wider">A dor de hoje</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-petrol-950">
            O combustível sai da bomba. O dinheiro nem sempre volta.
          </h2>
          <p className="mt-4 text-lg text-petrol-800/70 leading-relaxed">
            Hoje, abastecer frota é na confiança — e quando a transportadora não reconhece a assinatura
            ou alega que o veículo não estava liberado, é o posto que fica no prejuízo.
          </p>
        </Reveal>

        {/* Fluxo da perda */}
        <div className="mt-12 grid md:grid-cols-3 gap-4 md:gap-0 md:items-stretch">
          {ETAPAS.map((e, i) => (
            <Reveal key={e.title} delay={i * 0.1} className="md:flex md:items-center">
              <div className="h-full flex-1 rounded-xl2 border border-petrol-100 bg-sand p-6">
                <div className="flex items-center gap-3">
                  <span className="inline-flex w-11 h-11 rounded-xl bg-white border border-petrol-100 items-center justify-center shrink-0">
                    <e.icon size={20} className="text-fuel-600" />
                  </span>
                  <span className="text-xs font-bold tracking-widest text-petrol-300">0{i + 1}</span>
                </div>
                <h3 className="mt-4 font-semibold text-petrol-950">{e.title}</h3>
                <p className="mt-1.5 text-sm text-petrol-800/70 leading-relaxed">{e.desc}</p>
              </div>
              {i < ETAPAS.length - 1 && (
                <ArrowRight size={22} className="hidden md:block text-petrol-300 mx-2 shrink-0" aria-hidden />
              )}
            </Reveal>
          ))}
        </div>

        {/* Faixa de prejuízo ilustrativo */}
        <Reveal delay={0.1}>
          <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl2 bg-fuel-50 border border-fuel-100 p-6">
            <span className="inline-flex w-12 h-12 rounded-xl bg-fuel-500 items-center justify-center shrink-0">
              <TrendingDown size={22} className="text-white" />
            </span>
            <p className="text-[15px] text-petrol-900 leading-relaxed">
              Um único posto pode acumular <strong className="font-bold text-fuel-700">R$ 8.400 por mês</strong>{' '}
              em abastecimentos contestados ou não reconhecidos. É margem inteira indo embora —
              por falta de uma prova de que aquele abastecimento foi autorizado.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
