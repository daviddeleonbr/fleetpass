'use client'

import {
  BadgeCheck, FileSignature, History, ScanLine, Ban, HandCoins,
} from 'lucide-react'
import { Reveal } from './Reveal'

const BENEFICIOS = [
  {
    icon: BadgeCheck,
    title: 'Prova de cada liberação',
    desc: 'Toda autorização fica registrada antes do abastecimento. Existe evidência de que a frota aprovou — fim da contestação.',
  },
  {
    icon: FileSignature,
    title: 'Contrato digital',
    desc: 'Condições, preços e prazos assinados digitalmente. Nada combinado “de boca”, nada que dê para negar depois.',
  },
  {
    icon: History,
    title: 'Histórico auditável',
    desc: 'Cada abastecimento rastreável do pedido à conclusão: quem liberou, qual veículo, qual motorista e quando.',
  },
  {
    icon: HandCoins,
    title: 'Recebimento garantido',
    desc: 'O que saiu da bomba foi pré-aprovado — o posto recebe sem disputa e sem inadimplência surpresa no fim do mês.',
  },
  {
    icon: Ban,
    title: 'Zero abastecimento fantasma',
    desc: 'Sem requisição liberada, ninguém abastece. Motorista a mais, desvio ou veículo de terceiro não entram na conta da frota.',
  },
  {
    icon: ScanLine,
    title: 'Validação no balcão',
    desc: 'Frentista confere a requisição por código e QR: o litro certo vai para o veículo certo, com autorização ativa.',
  },
]

export function Beneficios() {
  return (
    <section id="beneficios" className="py-20 sm:py-24 bg-white scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-semibold text-fuel-600 uppercase tracking-wider">Prova e segurança</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-petrol-950">
            A prova que faltava para ninguém sair no prejuízo
          </h2>
          <p className="mt-4 text-lg text-petrol-800/70 leading-relaxed">
            Cada liberação registrada é a evidência que protege o posto do calote e a frota do
            abastecimento que ela não autorizou.
          </p>
        </Reveal>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BENEFICIOS.map((b, i) => (
            <Reveal key={b.title} delay={(i % 3) * 0.08}>
              <div className="group h-full rounded-xl2 border border-petrol-100 bg-sand p-6 hover:bg-white hover:shadow-soft hover:border-petrol-200 transition-all duration-300">
                <span className="inline-flex w-12 h-12 rounded-xl bg-petrol-600/10 items-center justify-center group-hover:bg-petrol-600 transition-colors">
                  <b.icon size={22} className="text-petrol-700 group-hover:text-white transition-colors" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-petrol-950">{b.title}</h3>
                <p className="mt-2 text-sm text-petrol-800/70 leading-relaxed">{b.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
