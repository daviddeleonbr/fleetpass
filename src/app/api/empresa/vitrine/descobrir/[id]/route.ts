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

    const { data: posto, error: errPosto } = await svc
      .from('postos')
      .select('id, nome, bandeira, endereco, numero, complemento, bairro, cidade, estado, cep, lat, lng, combustiveis, capacidade, whatsapp')
      .eq('id', id)
      .eq('status', 'ativo')
      .maybeSingle()

    // Separar falha de query de "não existe" importa: sem isso, um erro de
    // schema (coluna faltando, por exemplo) chegava ao usuário como um 404
    // "Posto não encontrado", escondendo a causa real.
    if (errPosto) throw errPosto
    if (!posto) return NextResponse.json({ error: 'Posto não encontrado.' }, { status: 404 })

    // Empresa do usuário: para saber se já existe negociação aberta com este
    // posto e, assim, não oferecer "Solicitar parceria" duas vezes.
    const { data: empresa } = await svc.from('empresas').select('id').eq('perfil_id', user.id).single()

    const [notas, comentarios, solAberta] = await Promise.all([
      buscarNotas(svc, [posto.id]),
      buscarComentarios(svc, posto.id),
      empresa
        ? svc.from('solicitacoes').select('id').eq('empresa_id', empresa.id).eq('posto_id', posto.id)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .in('status', ['aguardando', 'proposta_recebida', 'em_negociacao'] as any[]).maybeSingle()
        : Promise.resolve({ data: null }),
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
        // Contato direto: só existe para posto cadastrado com WhatsApp.
        whatsapp:        posto.whatsapp || null,
        solicitacaoAberta: !!solAberta?.data,
      },
    })
  } catch (err) {
    console.error('[vitrine descobrir detalhe GET]', err)
    return NextResponse.json({ error: 'Não foi possível carregar o posto.' }, { status: 500 })
  }
}
