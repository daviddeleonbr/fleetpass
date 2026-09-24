import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/api-auth'
import { maskCpfCnpj } from '@/lib/documento'
import { buscarNotas, buscarMinhasAvaliacoes } from '@/lib/avaliacoes'

/**
 * GET /api/empresa/vitrine — postos parceiros da empresa autenticada.
 *
 * Leitura only. Parte SEMPRE de `parcerias` (nunca de `postos`): a vitrine mostra
 * a rede já conquistada pelo relacionamento posto → solicitação → proposta →
 * aceite. Listar `postos` direto reintroduziria o marketplace removido no pivô.
 *
 * Checklist de segurança (CLAUDE.md §Cibersegurança):
 *  1. Autenticação  — getAuthUser() (cookie web OU Bearer mobile) → 401.
 *  2. Autorização   — exige perfis.role = 'empresa' → 403.
 *  3. Anti-IDOR     — nenhum id vem do cliente; o vínculo é derivado do usuário.
 *  4. Tenant        — .eq('empresa_id', empresa.id) dentro da query.
 *  5. Service client— createServiceClient() só depois de 1–3.
 *  6. Erros         — mensagem genérica ao cliente, detalhe no log do servidor.
 *  7. Mass-assign   — GET sem body; nada é escrito.
 */

/** Estados de parceria que a vitrine exibe. `encerrada` fica no histórico. */
const STATUS_VISIVEIS = ['ativa', 'suspensa', 'pendente_assinatura'] as const

type Disponibilidade = 'disponivel' | 'atencao' | 'indisponivel'

const CICLO_LABEL: Record<string, string> = {
  diario:    'Diário',
  semanal:   'Semanal',
  quinzenal: 'Quinzenal',
  mensal:    'Mensal',
}

interface PostoJoin {
  id: string
  nome: string
  cnpj: string
  bandeira: string
  endereco: string
  numero: string
  complemento: string | null
  bairro: string
  cidade: string
  estado: string
  cep: string
  telefone: string | null
  combustiveis: string[] | null
  capacidade: string | null
  status: string
}

/** Monta "Rua X, 123 — Sala 2 · Bairro" a partir das partes preenchidas. */
function montarEndereco(p: PostoJoin): string {
  const linha = [p.endereco, p.numero].filter(Boolean).join(', ')
  const partes = [linha, p.complemento, p.bairro].filter((v) => v && String(v).trim())
  return partes.join(' · ')
}

export async function GET(req: NextRequest) {
  try {
    // 1. Autenticação
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    // 5. Service client só a partir daqui
    const svc = createServiceClient()

    // 2. Autorização por role — não confiar no layout client-side
    const { data: perfil } = await svc.from('perfis').select('role').eq('id', user.id).single()
    if ((perfil?.role as string) !== 'empresa') {
      return NextResponse.json({ error: 'Acesso restrito a empresas.' }, { status: 403 })
    }

    // 4. Tenant da empresa autenticada
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    const { data, error } = await svc
      .from('parcerias')
      .select(`
        id, status, combustiveis, ciclo_tipo, ciclo_intervalo_dias, ciclo_prazo_recebimento,
        limite_credito, volume_minimo, iniciada_em,
        postos(id, nome, cnpj, bandeira, endereco, numero, complemento, bairro,
               cidade, estado, cep, telefone, combustiveis, capacidade, status)
      `)
      .eq('empresa_id', empresa.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .in('status', STATUS_VISIVEIS as unknown as any[])
      .order('iniciada_em', { ascending: false })

    if (error) throw error

    const postos = (data ?? []).flatMap((p) => {
      const posto = p.postos as unknown as PostoJoin | null
      if (!posto) return []

      const parceriaAtiva = p.status === 'ativa'
      const postoAtivo    = posto.status === 'ativo'

      // Disponibilidade real, derivada só de estados que existem no banco:
      //  • disponivel   → parceria ativa E posto ativo
      //  • atencao      → parceria suspensa (bloqueio manual do posto) ou posto inativo
      //  • indisponivel → pendente_assinatura (contrato ainda não assinado)
      let disponibilidade: Disponibilidade
      if (parceriaAtiva && postoAtivo)      disponibilidade = 'disponivel'
      else if (p.status === 'suspensa' || (parceriaAtiva && !postoAtivo)) disponibilidade = 'atencao'
      else                                  disponibilidade = 'indisponivel'

      // Espelha exatamente o que POST /api/empresa/requisicoes aceita.
      const podeEmitirRequisicao = parceriaAtiva && postoAtivo

      // Combustíveis ACORDADOS na parceria (JSONB), não o catálogo do posto.
      const acordados = ((p.combustiveis as unknown as { tipo?: string; ativo?: boolean }[] | null) ?? [])
        .filter((c) => c.ativo !== false)
        .map((c) => c.tipo ?? '')
        .filter(Boolean)

      const cicloBase = CICLO_LABEL[p.ciclo_tipo as string] ?? String(p.ciclo_tipo)

      return [{
        parceriaId:     p.id,
        parceriaStatus: p.status as string,
        postoId:        posto.id,

        nome:      posto.nome,
        bandeira:  posto.bandeira,
        cnpj:      maskCpfCnpj(posto.cnpj),
        endereco:  montarEndereco(posto),
        cidade:    posto.cidade,
        estado:    posto.estado,
        cep:       posto.cep || null,
        telefone:  posto.telefone || null,
        capacidade: posto.capacidade || null,
        postoStatus: posto.status,

        disponibilidade,
        podeEmitirRequisicao,

        combustiveis:       acordados,
        combustiveisPosto:  posto.combustiveis ?? [],

        ciclo:             p.ciclo_intervalo_dias ? `${cicloBase} · ${p.ciclo_intervalo_dias} dias` : cicloBase,
        prazoRecebimento:  p.ciclo_prazo_recebimento,
        limiteCredito:     p.limite_credito != null ? Number(p.limite_credito) : null,
        volumeMinimo:      p.volume_minimo   != null ? Number(p.volume_minimo)  : null,

        desde: new Date(p.iniciada_em).toLocaleDateString('pt-BR'),
      }]
    })

    // Notas do posto + a avaliação que esta empresa já deixou (se houver).
    const ids = postos.map((p) => p.postoId)
    const [notas, minhas] = await Promise.all([
      buscarNotas(svc, ids),
      buscarMinhasAvaliacoes(svc, empresa.id, ids),
    ])

    const comNotas = postos.map((p) => ({
      ...p,
      nota:             notas.get(p.postoId)?.media ?? null,
      totalAvaliacoes:  notas.get(p.postoId)?.total ?? 0,
      minhaAvaliacao:   minhas.get(p.postoId) ?? null,
      // A empresa só avalia posto com quem a parceria já saiu do papel.
      podeAvaliar:      p.parceriaStatus !== 'pendente_assinatura',
    }))

    return NextResponse.json({ postos: comNotas })
  } catch (err) {
    // 6. Detalhe fica no servidor; cliente recebe mensagem genérica.
    console.error('[vitrine GET]', err)
    return NextResponse.json({ error: 'Não foi possível carregar a vitrine.' }, { status: 500 })
  }
}
