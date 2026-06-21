'use client'

import { useState } from 'react'
import {
  User, Mail, Phone, MapPin, Shield, Store, Pencil, Check,
  X, Camera, Clock, FileText, Handshake, Receipt, Star,
  LogOut, AlertCircle, ChevronRight, Building2, Calendar,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// ─── Mock ──────────────────────────────────────────────────────────────────────

const PERFIL = {
  nome: 'Maria Andrade',
  email: 'maria@shellcentro.com.br',
  telefone: '(11) 99876-5432',
  cpf: '•••.456.789-••',
  cargo: 'Administradora',
  departamento: 'Operações',
  cidade: 'São Paulo, SP',
  membroDesde: 'Janeiro de 2025',
  ultimoAcesso: 'Hoje às 09:14',
  plano: 'Pro',
}

const POSTOS = [
  { nome: 'Shell — Centro', cnpj: '11.222.333/0001-44', role: 'Administradora', parceiros: 3, status: 'ativo'   as const },
  { nome: 'Shell — Norte',  cnpj: '55.666.777/0001-88', role: 'Administradora', parceiros: 2, status: 'ativo'   as const },
]

const STATS = [
  { label: 'Postos gerenciados',    value: '2',          icon: Store,       color: 'text-blue-600',   bg: 'bg-blue-50'   },
  { label: 'Parceiros ativos',      value: '5',          icon: Handshake,   color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { label: 'Requisições este mês',  value: '47',         icon: FileText,    color: 'text-violet-600', bg: 'bg-violet-50' },
  { label: 'Faturas emitidas',      value: '12',         icon: Receipt,     color: 'text-emerald-600',bg: 'bg-emerald-50'},
]

const ATIVIDADE = [
  { acao: 'Fatura de Fevereiro/2025 fechada',              detalhe: 'TransLog Transportes · R$ 14.800,00',  quando: 'Hoje, 08:52',       icon: Receipt,   cor: 'text-gray-500'    },
  { acao: 'Parceiro desbloqueado com crédito adicional',   detalhe: 'TransLog Transportes · +R$ 2.000,00',  quando: 'Ontem, 14:30',      icon: Handshake, cor: 'text-indigo-500'  },
  { acao: 'Frentista inativado',                           detalhe: 'José Almeida · Shell — Centro',        quando: 'Ontem, 11:05',      icon: User,      cor: 'text-orange-400'  },
  { acao: 'Novo parceiro aprovado',                        detalhe: 'LogBR Express',                        quando: '01/03/2025, 10:18', icon: Handshake, cor: 'text-emerald-500' },
  { acao: 'Veículo DEF-5678 bloqueado',                    detalhe: 'TransLog Transportes',                 quando: '12/03/2025, 11:20', icon: AlertCircle,cor: 'text-red-400'    },
  { acao: 'Configurações de notificação atualizadas',      detalhe: 'E-mail e WhatsApp',                    quando: '08/03/2025, 09:00', icon: Shield,    cor: 'text-blue-400'    },
]

// ─── Campos editáveis ─────────────────────────────────────────────────────────

interface CampoEditavelProps {
  label: string
  value: string
  editavel?: boolean
  icon?: React.ElementType
  tipo?: string
}

function CampoEditavel({ label, value, editavel = true, icon: Icon, tipo = 'text' }: CampoEditavelProps) {
  const [editando, setEditando] = useState(false)
  const [val, setVal] = useState(value)
  const [tmp, setTmp] = useState(value)

  const salvar = () => { setVal(tmp); setEditando(false) }
  const cancelar = () => { setTmp(val); setEditando(false) }

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {Icon && <Icon size={14} className="text-gray-300 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
          {editando ? (
            <input
              autoFocus
              type={tipo}
              value={tmp}
              onChange={e => setTmp(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') cancelar() }}
              className="w-full text-sm border border-blue-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          ) : (
            <p className="text-sm font-medium text-gray-800 truncate">{val}</p>
          )}
        </div>
      </div>
      {editavel && (
        <div className="shrink-0 flex items-center gap-1">
          {editando ? (
            <>
              <button onClick={salvar}   className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"><Check size={12} /></button>
              <button onClick={cancelar} className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100 transition-colors"><X size={12} /></button>
            </>
          ) : (
            <button onClick={() => setEditando(true)} className="p-1.5 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-50 transition-colors"><Pencil size={12} /></button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PerfilPage() {
  const [fotoHover, setFotoHover] = useState(false)

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header card */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {/* Banner */}
        <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600" />

        <div className="px-6 pb-5">
          {/* Avatar + ações */}
          <div className="flex items-end justify-between -mt-10 mb-4">
            <div
              className="relative w-20 h-20 rounded-2xl border-4 border-white shadow-md cursor-pointer"
              onMouseEnter={() => setFotoHover(true)}
              onMouseLeave={() => setFotoHover(false)}
            >
              <div className="w-full h-full bg-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-white">MA</span>
              </div>
              {fotoHover && (
                <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                  <Camera size={18} className="text-white" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/posto/configuracoes">
                <Button variant="secondary" size="sm"><Shield size={13} /> Configurações</Button>
              </Link>
              <Button variant="secondary" size="sm" className="text-red-500 border-red-100 hover:border-red-200 bg-red-50">
                <LogOut size={13} /> Sair
              </Button>
            </div>
          </div>

          {/* Identidade */}
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-xl font-bold text-gray-900">{PERFIL.nome}</h1>
              <span className="text-[11px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{PERFIL.plano}</span>
            </div>
            <p className="text-sm text-gray-500">{PERFIL.cargo} · {PERFIL.departamento}</p>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <MapPin size={11} /> {PERFIL.cidade}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <Calendar size={11} /> Membro desde {PERFIL.membroDesde}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Último acesso: {PERFIL.ultimoAcesso}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {STATS.map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon size={15} className={s.color} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">{s.label}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Informações pessoais */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Informações pessoais</h2>
          <p className="text-xs text-gray-400 mb-4">Clique no lápis para editar um campo.</p>
          <CampoEditavel label="Nome completo"  value={PERFIL.nome}        icon={User}     />
          <CampoEditavel label="E-mail"          value={PERFIL.email}       icon={Mail}     tipo="email" />
          <CampoEditavel label="Telefone"        value={PERFIL.telefone}    icon={Phone}    />
          <CampoEditavel label="CPF"             value={PERFIL.cpf}         icon={Shield}   editavel={false} />
          <CampoEditavel label="Cargo"           value={PERFIL.cargo}       icon={Star}     />
          <CampoEditavel label="Departamento"    value={PERFIL.departamento}icon={Building2}/>
          <CampoEditavel label="Cidade"          value={PERFIL.cidade}      icon={MapPin}   />
        </div>

        {/* Postos + atividade recente */}
        <div className="space-y-6">
          {/* Postos vinculados */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Postos vinculados</h2>
              <Link href="/posto/meus-postos" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                Gerenciar <ChevronRight size={11} />
              </Link>
            </div>
            <div className="space-y-2">
              {POSTOS.map(p => (
                <div key={p.nome} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                    <Store size={14} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{p.nome}</p>
                    <p className="text-[11px] text-gray-400">{p.cnpj} · {p.parceiros} parceiros</p>
                  </div>
                  <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                    {p.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Atividade recente */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Atividade recente</h2>
              <span className="text-[11px] text-gray-400 flex items-center gap-1"><Clock size={11} /> Últimas ações</span>
            </div>
            <div className="space-y-0">
              {ATIVIDADE.map((a, i) => {
                const Icon = a.icon
                return (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className={`mt-0.5 shrink-0 ${a.cor}`}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 leading-tight">{a.acao}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{a.detalhe}</p>
                    </div>
                    <p className="text-[11px] text-gray-300 shrink-0 whitespace-nowrap">{a.quando}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
