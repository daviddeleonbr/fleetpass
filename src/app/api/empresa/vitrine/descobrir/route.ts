import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/api-auth'
import { buscarNotas } from '@/lib/avaliacoes'

/**
 * GET /api/empresa/vitrine/descobrir — postos ATIVOS com quem a empresa ainda
 * não tem vínculo vigente.
 *
 * READ-ONLY e deliberadamente pobre: esta rota NÃO é um marketplace. Ela não
 * expõe CNPJ, telefone, endereço completo nem condição comercial, e não existe
 * nenhuma ação de parceria a partir dela. Quem inicia o relacionamento continua
 * sendo o posto (posto → solicitação → proposta → aceite → parceria).
 *
 * Checklist de segurança (CLAUDE.md §Cibersegurança):
 *  1. Autenticação  — getAuthUser() → 401.
 *  2. Autorização   — exige perfis.role = 'empresa' → 403.
 *  3. Anti-IDOR     — nenhum id vem do cliente; o recorte deriva do usuário.
 *  4. Tenant        — a lista de exclusão sai de parcerias filtradas por empresa_id.
 *  5. Service client— createServiceClient() só depois de 1–3.
 *  6. Erros         — mensagem genérica ao cliente, detalhe no log do servidor.
 *  7. Mass-assign   — GET sem body; nada é escrito.
 *
 * Nota sobre exposição: a policy RLS "postos: authenticated read active" já
 * permite que qualquer autenticado leia postos ativos. A projeção abaixo é mais
 * restrita que isso de propósito — só o necessário para reconhecer o posto.
 */

/** Vínculos que tiram o posto da descoberta (já aparecem na aba de parceiros). */
const VINCULO_VIGENTE = ['ativa', 'suspensa', 'pendente_assinatura'] as const

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()

    const { data: perfil } = await svc.from('perfis').select('role').eq('id', user.id).single()
    if ((perfil?.role as string) !== 'empresa') {
      return NextResponse.json({ error: 'Acesso restrito a empresas.' }, { status: 403 })
    }

    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()
    if (!empresa) return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })

    // Todas as parcerias da empresa: as vigentes saem da lista; as encerradas
    // continuam aparecendo, mas marcadas — é honesto sinalizar que já houve relação.
    const { data: vinculos } = await svc
      .from('parcerias')
      .select('posto_id, status')
      .eq('empresa_id', empresa.id)

    const vigentes    = new Set<string>()
    const jaParceiros = new Set<string>()
    for (const v of (vinculos ?? []) as Array<{ posto_id: string; status: string }>) {
      jaParceiros.add(v.posto_id)
      if ((VINCULO_VIGENTE as readonly string[]).includes(v.status)) vigentes.add(v.posto_id)
    }

    const { data: ativos, error } = await svc
      .from('postos')
      .select('id, nome, bandeira, endereco, numero, complemento, bairro, cidade, estado, lat, lng, combustiveis, capacidade')
      .eq('status', 'ativo')
      .order('nome')

    if (error) throw error

    const candidatos = (ativos ?? []).filter((p) => !vigentes.has(p.id))
    const notas = await buscarNotas(svc, candidatos.map((p) => p.id))

    const postos = candidatos
      .map((p) => {
        const linha  = [p.endereco, p.numero].filter(Boolean).join(', ')
        const partes = [linha, p.complemento, p.bairro].filter((v) => v && String(v).trim())
        return {
          postoId:         p.id,
          nome:            p.nome,
          bandeira:        p.bandeira,
          endereco:        partes.join(' · '),
          cidade:          p.cidade,
          estado:          p.estado,
          // Coordenadas de estabelecimento comercial ativo — alimentam o mapa.
          lat:             p.lat != null ? Number(p.lat) : null,
          lng:             p.lng != null ? Number(p.lng) : null,
          capacidade:      p.capacidade || null,
          combustiveis:    p.combustiveis ?? [],
          nota:            notas.get(p.id)?.media ?? null,
          totalAvaliacoes: notas.get(p.id)?.total ?? 0,
          jaFoiParceiro:   jaParceiros.has(p.id),
        }
      })
      // "Bem avaliados" primeiro; sem nota vai para o fim, desempate por nome.
      .sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1) || a.nome.localeCompare(b.nome, 'pt-BR'))

    return NextResponse.json({ postos })
  } catch (err) {
    console.error('[vitrine descobrir GET]', err)
    return NextResponse.json({ error: 'Não foi possível carregar os postos.' }, { status: 500 })
  }
}
