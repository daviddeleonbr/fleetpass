'use client'

import { useState } from 'react'
import {
  User, Store, CreditCard, Bell, Shield, ChevronRight,
  Check, AlertCircle, Mail, Phone,
  Pencil, CheckCircle2, Zap, Crown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// ─── Planos ───────────────────────────────────────────────────────────────────

const PLANOS = [
  {
    id: 'starter',
    nome: 'Starter',
    preco: 149,
    descricao: 'Para postos com até 3 empresas parceiras.',
    recursos: ['Até 3 empresas parceiras', 'Até 2 frentistas', 'Relatórios básicos', 'Suporte por e-mail'],
    destaque: false,
  },
  {
    id: 'pro',
    nome: 'Pro',
    preco: 349,
    descricao: 'Para postos em crescimento com múltiplas parcerias.',
    recursos: ['Parceiros ilimitados', 'Frentistas ilimitados', 'Relatórios completos + exportação', 'Linha do tempo de clientes', 'Suporte prioritário via WhatsApp', 'Notificações de crédito'],
    destaque: true,
  },
  {
    id: 'enterprise',
    nome: 'Enterprise',
    preco: 749,
    descricao: 'Para redes com múltiplos postos.',
    recursos: ['Tudo do Pro', 'Múltiplos postos sob uma conta', 'Painel consolidado por rede', 'Integração com ERP (API)', 'Gerente de conta dedicado', 'SLA de suporte 4h'],
    destaque: false,
  },
]

const PLANO_ATUAL = 'pro'

// ─── Mock dados da conta ──────────────────────────────────────────────────────

const CONTA = {
  nome: 'Maria Andrade',
  email: 'maria@shellcentro.com.br',
  telefone: '(11) 99876-5432',
  cargo: 'Administradora',
  postos: ['Shell — Centro', 'Shell — Norte'],
}

const FATURA_MOCK = [
  { ref: 'Fevereiro/2025', vencimento: '10/03/2025', valor: 349, status: 'pago'     as const },
  { ref: 'Janeiro/2025',   vencimento: '10/02/2025', valor: 349, status: 'pago'     as const },
  { ref: 'Dezembro/2024',  vencimento: '10/01/2025', valor: 299, status: 'pago'     as const },
]

const PROXIMA_COBRANCA = { data: '10/04/2025', valor: 349, plano: 'Pro' }

// ─── Seções ───────────────────────────────────────────────────────────────────

type Secao = 'conta' | 'plano' | 'notificacoes' | 'seguranca'

const MENU: { id: Secao; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'conta',         label: 'Minha conta',        icon: User,       desc: 'Dados pessoais e acesso' },
  { id: 'plano',         label: 'Plano e cobrança',    icon: CreditCard, desc: 'Assinatura, faturas e upgrade' },
  { id: 'notificacoes',  label: 'Notificações',         icon: Bell,       desc: 'E-mail, WhatsApp e alertas' },
  { id: 'seguranca',     label: 'Segurança',            icon: Shield,     desc: 'Senha e autenticação' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Campo({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
      </div>
      {onEdit && (
        <button onClick={onEdit} className="text-gray-300 hover:text-gray-600 transition-colors p-1">
          <Pencil size={13} />
        </button>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const [secao, setSecao] = useState<Secao>('conta')
  const [notif, setNotif] = useState({
    emailBloqueio: true,
    emailFatura: true,
    emailCredito: true,
    whatsappBloqueio: false,
    whatsappFatura: true,
    whatsappCredito: false,
  })
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)

  const salvar = async () => {
    setSalvando(true)
    await new Promise(r => setTimeout(r, 800))
    setSalvando(false)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2500)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie sua conta, plano e preferências.</p>
      </div>

      <div className="flex gap-6 items-start">
        {/* Menu lateral */}
        <div className="w-56 shrink-0 bg-white border border-gray-100 rounded-2xl overflow-hidden">
          {MENU.map((m) => {
            const Icon = m.icon
            const ativo = secao === m.id
            return (
              <button
                key={m.id}
                onClick={() => setSecao(m.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-50 last:border-0 ${
                  ativo ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'
                }`}
              >
                <Icon size={15} className={ativo ? 'text-blue-600' : 'text-gray-400'} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${ativo ? 'text-blue-700' : 'text-gray-700'}`}>{m.label}</p>
                  <p className="text-[11px] text-gray-400 truncate">{m.desc}</p>
                </div>
                <ChevronRight size={13} className={ativo ? 'text-blue-400' : 'text-gray-200'} />
              </button>
            )
          })}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 bg-white border border-gray-100 rounded-2xl p-6 space-y-6">

          {/* ── Minha Conta ── */}
          {secao === 'conta' && (
            <>
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-4">Minha conta</h2>
                <div className="flex items-center gap-4 mb-6 pb-5 border-b border-gray-50">
                  <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-white">MA</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{CONTA.nome}</p>
                    <p className="text-sm text-gray-400">{CONTA.cargo} · {CONTA.postos.length} postos</p>
                  </div>
                  <Button variant="secondary" size="sm" className="ml-auto"><Pencil size={13} /> Editar foto</Button>
                </div>
                <Campo label="Nome completo"   value={CONTA.nome}     onEdit={() => {}} />
                <Campo label="E-mail"          value={CONTA.email}    onEdit={() => {}} />
                <Campo label="Telefone"        value={CONTA.telefone} onEdit={() => {}} />
                <Campo label="Cargo"           value={CONTA.cargo}    onEdit={() => {}} />
                <div className="pt-3">
                  <p className="text-xs text-gray-400 mb-2">Postos vinculados</p>
                  <div className="flex gap-2 flex-wrap">
                    {CONTA.postos.map(p => (
                      <span key={p} className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full">
                        <Store size={10} /> {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Plano e Cobrança ── */}
          {secao === 'plano' && (
            <>
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">Plano e cobrança</h2>
                <p className="text-sm text-gray-400 mb-5">Gerencie sua assinatura e visualize o histórico de faturas.</p>

                {/* Próxima cobrança */}
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5">
                  <CreditCard size={16} className="text-blue-500 shrink-0" />
                  <p className="text-sm text-blue-700">
                    Próxima cobrança: <strong>R$ {PROXIMA_COBRANCA.valor},00</strong> em <strong>{PROXIMA_COBRANCA.data}</strong> — Plano {PROXIMA_COBRANCA.plano}
                  </p>
                </div>

                {/* Planos */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {PLANOS.map(p => {
                    const atual = p.id === PLANO_ATUAL
                    return (
                      <div key={p.id} className={`relative border rounded-xl p-4 ${atual ? 'border-blue-400 bg-blue-50' : p.destaque ? 'border-blue-200 bg-white' : 'border-gray-100 bg-white'}`}>
                        {atual && (
                          <span className="absolute -top-2.5 left-4 text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">PLANO ATUAL</span>
                        )}
                        {p.destaque && !atual && (
                          <span className="absolute -top-2.5 left-4 text-[10px] font-bold bg-amber-400 text-white px-2 py-0.5 rounded-full flex items-center gap-1"><Crown size={8} /> RECOMENDADO</span>
                        )}
                        <p className="text-sm font-bold text-gray-900 mt-1">{p.nome}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">R$ {p.preco}<span className="text-xs font-normal text-gray-400">/mês</span></p>
                        <p className="text-xs text-gray-400 mt-1 mb-3">{p.descricao}</p>
                        <ul className="space-y-1.5 mb-4">
                          {p.recursos.map(r => (
                            <li key={r} className="flex items-start gap-1.5 text-xs text-gray-600">
                              <Check size={11} className="text-emerald-500 shrink-0 mt-0.5" /> {r}
                            </li>
                          ))}
                        </ul>
                        {!atual && (
                          <Button variant={p.destaque ? 'primary' : 'secondary'} size="sm" className="w-full">
                            {p.id === 'starter' ? 'Fazer downgrade' : <><Zap size={12} /> Fazer upgrade</>}
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Histórico de faturas */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">Histórico de faturas</p>
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50">
                          <th className="px-4 py-2.5 text-left">Referência</th>
                          <th className="px-4 py-2.5 text-left">Vencimento</th>
                          <th className="px-4 py-2.5 text-right">Valor</th>
                          <th className="px-4 py-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {FATURA_MOCK.map(f => (
                          <tr key={f.ref} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3 text-sm text-gray-700">{f.ref}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">{f.vencimento}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">R$ {f.valor},00</td>
                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                                <CheckCircle2 size={10} /> Pago
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-50">
                  <p className="text-xs text-gray-400">
                    Para cancelar a assinatura ou solicitar nota fiscal, entre em contato com{' '}
                    <a href="mailto:financeiro@fuellink.com.br" className="text-blue-500 hover:underline">financeiro@fuellink.com.br</a>.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ── Notificações ── */}
          {secao === 'notificacoes' && (
            <>
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">Notificações</h2>
                <p className="text-sm text-gray-400 mb-5">Escolha como deseja ser notificado sobre eventos importantes.</p>

                {([
                  { key: 'Bloqueio', label: 'Bloqueio de parceiro', desc: 'Quando um parceiro for bloqueado automaticamente por limite de crédito.', emailKey: 'emailBloqueio' as const, waKey: 'whatsappBloqueio' as const },
                  { key: 'Fatura',   label: 'Fatura fechada',        desc: 'Quando uma fatura for gerada e enviada a um cliente.',                   emailKey: 'emailFatura'   as const, waKey: 'whatsappFatura'   as const },
                  { key: 'Credito',  label: 'Alerta de crédito',     desc: `Quando um parceiro estiver com menos de R$ 2.000 de crédito restante.`, emailKey: 'emailCredito'  as const, waKey: 'whatsappCredito'  as const },
                ] as const).map(n => (
                  <div key={n.key} className="flex items-start justify-between gap-6 py-4 border-b border-gray-50 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{n.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.desc}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" checked={notif[n.emailKey]} onChange={e => setNotif(v => ({ ...v, [n.emailKey]: e.target.checked }))} className="accent-blue-600 w-3.5 h-3.5" />
                        <Mail size={12} /> E-mail
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" checked={notif[n.waKey]} onChange={e => setNotif(v => ({ ...v, [n.waKey]: e.target.checked }))} className="accent-green-600 w-3.5 h-3.5" />
                        <Phone size={12} /> WhatsApp
                      </label>
                    </div>
                  </div>
                ))}

                <div className="pt-4">
                  <Button onClick={salvar} isLoading={salvando} size="sm">
                    {salvo ? <><CheckCircle2 size={13} /> Salvo!</> : 'Salvar preferências'}
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* ── Segurança ── */}
          {secao === 'seguranca' && (
            <>
              <div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">Segurança</h2>
                <p className="text-sm text-gray-400 mb-5">Gerencie sua senha e autenticação de dois fatores.</p>

                <div className="space-y-4">
                  <div className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">Senha</p>
                        <p className="text-xs text-gray-400 mt-0.5">Última alteração há 45 dias.</p>
                      </div>
                      <Button variant="secondary" size="sm">Alterar senha</Button>
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">Autenticação de dois fatores (2FA)</p>
                        <p className="text-xs text-gray-400 mt-0.5">Proteja sua conta com um código adicional no login.</p>
                      </div>
                      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full font-medium">Não ativado</span>
                    </div>
                    <div className="mt-3">
                      <Button size="sm"><Shield size={13} /> Ativar 2FA</Button>
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-xl p-4">
                    <p className="text-sm font-medium text-gray-800 mb-2">Sessões ativas</p>
                    {[
                      { dispositivo: 'Chrome · Windows 11', local: 'São Paulo, SP', atual: true,  quando: 'Agora' },
                      { dispositivo: 'Safari · iPhone 14',   local: 'São Paulo, SP', atual: false, quando: '2h atrás' },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-xs font-medium text-gray-700">{s.dispositivo}</p>
                          <p className="text-[11px] text-gray-400">{s.local} · {s.quando}</p>
                        </div>
                        {s.atual
                          ? <span className="text-[11px] text-emerald-600 font-medium">Sessão atual</span>
                          : <button className="text-xs text-red-400 hover:text-red-600 transition-colors">Encerrar</button>
                        }
                      </div>
                    ))}
                  </div>

                  <div className="border border-red-100 bg-red-50 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-700">Zona de risco</p>
                        <p className="text-xs text-red-400 mt-0.5 mb-3">Estas ações são irreversíveis. Proceda com cuidado.</p>
                        <Button variant="secondary" size="sm" className="border-red-200 text-red-600 hover:border-red-300 bg-white">
                          Excluir minha conta
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
