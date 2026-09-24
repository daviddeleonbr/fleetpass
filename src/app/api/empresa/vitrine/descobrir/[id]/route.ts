import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getAuthUser } from '@/lib/api-auth'
import { buscarNotas, buscarComentarios } from '@/lib/avaliacoes'

/**
 * GET /api/empresa/vitrine/descobrir/[id] — detalhe público de um posto ativo.
 *
 * READ-ONLY. Mesma disciplina da listagem: sem CNPJ, sem telefone e sem
 * qualquer condição comercial — esses dados só existem dentro de uma parceria.
 * Nenhuma ação de parceria nasce daqui; quem convida é o posto.
 *
 * Checklist de segurança (CLAUDE.md §Cibersegurança):
 *  1. Autenticação  — getAuthUser() → 401.
 *  2. Autorização   — exige perfis.role = 'empresa' → 403.
 *  3. Anti-IDOR     — o id só resolve para posto com status 'ativo'; qualquer
 *                     outro devolve 404, sem revelar existência.
 *  4. Tenant        — não há dado por tenant nesta resposta (projeção pública).
 *  5. Service client— createServiceClient() só depois de 1–3.
 *  6. Erros         — mensagem genérica ao cliente, detalhe no log do servidor.
 *  7. Mass-assign   — GET sem body; nada é escrito.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(req)
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

    const svc = createServiceClient()

    const { data: perfil } = await svc.from('perfis').select('role').eq('id', user.id).single()
    if ((perfil?.role as string) !== 'empresa') {
      return NextResponse.json({ error: 'Acesso restrito a empresas.' }, { status: 403 })
    }

    const { id } = await ctx.params

    const { data: posto } = await svc
      .from('postos')
      .select('id, nome, bandeira, endereco, numero, complemento, bairro, cidade, estado, cep, lat, lng, combustiveis, capacidade')
      .eq('id', id)
      .eq('status', 'ativo')
      .maybeSingle()

    if (!posto) return NextResponse.json({ error: 'Posto não encontrado.' }, { status: 404 })

    const [notas, comentarios] = await Promise.all([
      buscarNotas(svc, [posto.id]),
      buscarComentarios(svc, posto.id),
    ])

    const linha  = [posto.endereco, posto.numero].filter(Boolean).join(', ')
    const partes = [linha, posto.complemento, posto.bairro].filter((v) => v && String(v).trim())

    return NextResponse.json({
      posto: {
        postoId:         posto.id,
        nome:            posto.nome,
        bandeira:        posto.bandeira,
        endereco:        partes.join(' · '),
        cidade:          posto.cidade,
        estado:          posto.estado,
        cep:             posto.cep || null,
        lat:             posto.lat != null ? Number(posto.lat) : null,
        lng:             posto.lng != null ? Number(posto.lng) : null,
        capacidade:      posto.capacidade || null,
        combustiveis:    posto.combustiveis ?? [],
        nota:            notas.get(posto.id)?.media ?? null,
        totalAvaliacoes: notas.get(posto.id)?.total ?? 0,
        comentarios,
      },
    })
  } catch (err) {
    console.error('[vitrine descobrir detalhe GET]', err)
    return NextResponse.json({ error: 'Não foi possível carregar o posto.' }, { status: 500 })
  }
}
