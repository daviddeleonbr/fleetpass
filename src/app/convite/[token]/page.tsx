'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { Fuel, Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'

interface ConviteInfo {
  valido: boolean
  status: string
  posto: string
  cidade: string
  combustiveis: string[]
  mensagem: string | null
  jaCadastrada: boolean
}

export default function ConvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [info, setInfo] = useState<ConviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    fetch(`/api/convites/${token}`)
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.error); return d })
      .then((d) => setInfo(d))
      .catch((e) => setErro(e instanceof Error ? e.message : 'Erro ao carregar convite.'))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-petrol-950 p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-petrol-900 via-petrol-950 to-[#03161a]" />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <span className="w-10 h-10 bg-petrol-600 rounded-xl flex items-center justify-center">
            <Fuel size={20} className="text-white" />
          </span>
          <span className="text-xl font-bold text-gray-900">FleetPass</span>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 py-10 justify-center">
            <Loader2 size={20} className="animate-spin" /> <span className="text-sm">Carregando convite…</span>
          </div>
        ) : erro || !info ? (
          <div className="flex items-start gap-2 text-sm text-red-600 py-6">
            <AlertCircle size={16} className="shrink-0 mt-0.5" /> {erro || 'Convite não encontrado.'}
          </div>
        ) : !info.valido ? (
          <div className="py-4">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <AlertCircle size={18} /> <span className="font-semibold">Convite indisponível</span>
            </div>
            <p className="text-sm text-gray-500">
              Este convite está <strong>{info.status}</strong> e não pode mais ser usado.
              Peça ao posto para enviar um novo convite.
            </p>
            <Link href="/login" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-petrol-700 hover:underline">
              Ir para o login <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-petrol-50 border border-petrol-100 px-2.5 py-1 text-xs font-semibold text-petrol-700 mb-3">
              <CheckCircle size={12} /> Você foi convidado
            </span>
            <h1 className="text-xl font-bold text-gray-900">
              {info.posto} convidou sua transportadora
            </h1>
            <p className="text-sm text-gray-500 mt-1">{info.cidade}</p>

            {info.mensagem && (
              <blockquote className="mt-4 border-l-3 border-petrol-300 bg-petrol-50 text-petrol-800 text-sm px-3.5 py-2 rounded">
                {info.mensagem}
              </blockquote>
            )}

            {info.combustiveis?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-gray-400 mb-1.5">Combustíveis</p>
                <div className="flex flex-wrap gap-1.5">
                  {info.combustiveis.map((c) => (
                    <span key={c} className="text-xs bg-gray-50 border border-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 space-y-2.5">
              {info.jaCadastrada ? (
                <>
                  <p className="text-sm text-gray-500">
                    Sua empresa já tem conta no FleetPass. Faça login para aceitar o convite.
                  </p>
                  <Link
                    href="/login"
                    className="w-full inline-flex items-center justify-center gap-2 bg-petrol-600 hover:bg-petrol-700 text-white font-semibold text-sm rounded-xl px-4 py-3 transition-colors"
                  >
                    Fazer login e aceitar <ArrowRight size={15} />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={`/cadastro/empresa?convite=${token}`}
                    className="w-full inline-flex items-center justify-center gap-2 bg-petrol-600 hover:bg-petrol-700 text-white font-semibold text-sm rounded-xl px-4 py-3 transition-colors"
                  >
                    Criar conta da transportadora <ArrowRight size={15} />
                  </Link>
                  <Link
                    href="/login"
                    className="w-full inline-flex items-center justify-center text-sm font-medium text-gray-500 hover:text-gray-900 rounded-xl px-4 py-2.5 transition-colors"
                  >
                    Já tenho conta
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
