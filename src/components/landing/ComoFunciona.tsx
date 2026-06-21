'use client'

import { ShieldCheck, ClipboardCheck, Fuel, BadgeCheck } from 'lucide-react'
import { Reveal } from './Reveal'

const PASSOS = [
  {
    n: '01',
    icon: ShieldCheck,
    title: 'A frota libera antes',
    desc: 'A transportadora autoriza o veículo e o motorista e define o limite — só o que ela aprovou pode abastecer.',
  },
  {
    n: '02',
    icon: ClipboardCheck,
    title: 'Requisição registrada',
    desc: 'A autorização vira uma requisição com código único, gravada na plataforma. Existe prova desde antes do abastecimento.',
  },
  {
    n: '03',
    icon: Fuel,
    title: 'Posto abastece com segurança',
    desc: 'No balcão, o frentista valida a requisição por código e QR. Abastece sabendo que aquele litro já está reconhecido.',
  },
  {
    n: '04',
    icon: BadgeCheck,
    title: 'Reconhecido automaticamente',
    desc: 'Como a liberação partiu da própria frota, não há “depois eu contesto”. O posto recebe; a frota paga só o que autorizou.',
  },
]

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="py-20 sm:py-24 bg-white scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-semibold text-petrol-600 uppercase tracking-wider">O mecanismo</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-petrol-950">
            Como a pré-aprovação elimina a perda
          </h2>
          <p className="mt-4 text-lg text-petrol-800/70 leading-relaxed">
            A ordem se inverte: a autorização vem antes do abastecimento. Assim, o abastecimento
            já nasce reconhecido — e o prejuízo simplesmente não acontece.
          </p>
        </Reveal>

        <ol className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 relative">
          {/* linha conectora (desktop) */}
          <div aria-hidden className="hidden lg:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-petrol-100 via-petrol-200 to-fuel-200" />
          {PASSOS.map((p, i) => (
            <Reveal as="li" key={p.n} delay={i * 0.1} className="relative">
              <div className="flex flex-col items-start">
                <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-petrol-100 shadow-soft">
                  <p.icon size={24} className={i === PASSOS.length - 1 ? 'text-fuel-600' : 'text-petrol-600'} />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-petrol-950 text-white text-[11px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <span className="mt-4 text-xs font-bold tracking-widest text-petrol-300">{p.n}</span>
                <h3 className="mt-1 text-lg font-bold text-petrol-950">{p.title}</h3>
                <p className="mt-2 text-sm text-petrol-800/70 leading-relaxed">{p.desc}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
