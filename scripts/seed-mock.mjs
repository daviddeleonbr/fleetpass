// Popula o banco com dados MOCK para visualizar o contexto geral das operações
// do FuelLink (posto → transportadora → parceria → requisição → abastecimento →
// faturamento). Usa a service role (bypassa RLS) e cria usuários reais no Auth.
//
// Uso:
//   node scripts/seed-mock.mjs            # limpa dados mock anteriores e popula
//   node scripts/seed-mock.mjs --limpar   # só remove os dados mock
//
// Todos os usuários mock usam o domínio @fuellink-mock.com.br e a senha Mock@1234.
// A limpeza identifica os registros por esse domínio — dados reais não são tocados.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { createHash, randomUUID } from 'crypto'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const DOMINIO = '@fuellink-mock.com.br'
const SENHA   = 'Mock@1234'
const SO_LIMPAR = process.argv.includes('--limpar')

// ── Utilitários ───────────────────────────────────────────────────────────────
// PRNG determinístico (mulberry32) para o seed ser reproduzível entre execuções
let semente = 20260921
function rnd() {
  semente |= 0; semente = (semente + 0x6D2B79F5) | 0
  let t = Math.imul(semente ^ (semente >>> 15), 1 | semente)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const entre  = (a, b) => a + rnd() * (b - a)
const inteiro = (a, b) => Math.floor(entre(a, b + 1))
const escolha = (arr) => arr[Math.floor(rnd() * arr.length)]
const r2 = (n) => Math.round(n * 100) / 100
const r3 = (n) => Math.round(n * 1000) / 1000

const DIA = 86_400_000
const agora = new Date()
const diasAtras = (d, hora = inteiro(6, 20), min = inteiro(0, 59)) => {
  const x = new Date(agora.getTime() - d * DIA)
  x.setHours(hora, min, inteiro(0, 59), 0)
  return x
}
const iso = (d) => d.toISOString()
const ymd = (d) => d.toISOString().slice(0, 10)
const fimDoDia = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 0); return x }
const sha256 = (s) => createHash('sha256').update(s).digest('hex')

function falhou(etapa, error) {
  if (!error) return
  console.error(`\n❌ Erro em "${etapa}":`, error.message ?? error)
  process.exit(1)
}

async function inserir(tabela, linhas) {
  if (!linhas.length) return
  // Lotes de 200 para não estourar o payload do PostgREST
  for (let i = 0; i < linhas.length; i += 200) {
    const { error } = await svc.from(tabela).insert(linhas.slice(i, i + 200))
    falhou(`insert ${tabela}`, error)
  }
}

async function apagarPor(tabela, coluna, ids) {
  if (!ids.length) return
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await svc.from(tabela).delete().in(coluna, ids.slice(i, i + 200))
    falhou(`delete ${tabela}`, error)
  }
}

async function idsDe(tabela, coluna, ids, sel = 'id') {
  if (!ids.length) return []
  const { data, error } = await svc.from(tabela).select(sel).in(coluna, ids)
  falhou(`select ${tabela}`, error)
  return (data ?? []).map((r) => r.id)
}

// ── Preços de referência por combustível (R$/L) ───────────────────────────────
const PRECO = {
  'Diesel S-10':        6.19,
  'Diesel Comum':       5.99,
  'Gasolina Comum':     6.29,
  'Gasolina Aditivada': 6.49,
  'Etanol':             4.19,
}
const TODOS_COMB = Object.keys(PRECO)

// Condições comerciais no formato usado por propostas/parcerias.combustiveis (JSONB)
function condicoes(tipos, modo = 'desconto') {
  return tipos.map((tipo) => {
    const modal = modo === 'bomba' ? 'bomba' : (tipo.startsWith('Diesel') ? modo : 'bomba')
    return {
      tipo, ativo: true, modal_preco: modal,
      valor: modal === 'bomba' ? null : r2(entre(0.05, 0.25)),
      unidade: 'R$',
    }
  })
}
function precoNegociado(parceria, comb) {
  const c = (parceria.combustiveis ?? []).find((x) => x.tipo === comb)
  const base = PRECO[comb] ?? 6
  if (!c || c.modal_preco === 'bomba') return base
  return r2(c.modal_preco === 'desconto' ? base - c.valor : base + c.valor)
}

// ══════════════════════════════════════════════════════════════════════════════
// LIMPEZA — remove tudo que pertence aos usuários @fuellink-mock.com.br
// ══════════════════════════════════════════════════════════════════════════════
async function limpar() {
  console.log('🧹 Removendo dados mock anteriores…')
  const { data: lista, error } = await svc.auth.admin.listUsers({ perPage: 1000 })
  falhou('listUsers', error)
  const usuarios = lista.users.filter((u) => u.email?.toLowerCase().endsWith(DOMINIO))
  if (!usuarios.length) { console.log('   (nada a remover)'); return }
  const perfilIds = usuarios.map((u) => u.id)

  const empresaIds = await idsDe('empresas',     'perfil_id',      perfilIds)
  const contaIds   = await idsDe('contas_posto', 'perfil_id',      perfilIds)
  const postoIds   = await idsDe('postos',       'conta_posto_id', contaIds)

  // Ordem respeita os ON DELETE RESTRICT (validacoes→requisicoes, faturamentos→postos…)
  const fatIds = [...await idsDe('faturamentos', 'posto_id', postoIds), ...await idsDe('faturamentos', 'empresa_id', empresaIds)]
  await apagarPor('faturamento_abastecimentos', 'faturamento_id', fatIds)
  await apagarPor('boletos',                    'faturamento_id', fatIds)
  await apagarPor('faturamentos',               'id',             fatIds)

  await apagarPor('abastecimentos', 'posto_id',   postoIds)
  await apagarPor('abastecimentos', 'empresa_id', empresaIds)
  const reqIds = [...await idsDe('requisicoes', 'posto_id', postoIds), ...await idsDe('requisicoes', 'empresa_id', empresaIds)]
  await apagarPor('validacoes',  'requisicao_id', reqIds)
  await apagarPor('requisicoes', 'id',            reqIds)

  const parcIds = [...await idsDe('parcerias', 'posto_id', postoIds), ...await idsDe('parcerias', 'empresa_id', empresaIds)]
  const libIds  = await idsDe('liberacoes', 'parceria_id', parcIds)
  await apagarPor('liberacao_veiculos', 'liberacao_id', libIds)
  await apagarPor('liberacoes',         'id',           libIds)
  await apagarPor('contratos',          'parceria_id',  parcIds)
  await apagarPor('assinatura_tokens',  'parceria_id',  parcIds)
  await apagarPor('parcerias',          'id',           parcIds)

  const solIds = [...await idsDe('solicitacoes', 'posto_id', postoIds), ...await idsDe('solicitacoes', 'empresa_id', empresaIds)]
  await apagarPor('parceria_mensagens', 'solicitacao_id', solIds)
  await apagarPor('propostas',          'solicitacao_id', solIds)
  await apagarPor('solicitacoes',       'id',             solIds)

  await apagarPor('avaliacoes',   'posto_id',   postoIds)
  await apagarPor('avaliacoes',   'empresa_id', empresaIds)
  await apagarPor('notificacoes', 'perfil_id',  perfilIds)

  const veicIds = await idsDe('veiculos',   'empresa_id', empresaIds)
  const motIds  = await idsDe('motoristas', 'empresa_id', empresaIds)
  await apagarPor('veiculo_bloqueios', 'veiculo_id',   veicIds)
  await apagarPor('motorista_logs',    'motorista_id', motIds)
  await apagarPor('veiculos',          'id',           veicIds)
  await apagarPor('motoristas',        'id',           motIds)
  await apagarPor('frentistas',        'posto_id',     postoIds)
  await apagarPor('postos',            'id',           postoIds)
  await apagarPor('contas_posto',      'id',           contaIds)
  await apagarPor('empresas',          'id',           empresaIds)

  for (const u of usuarios) {
    const { error: e } = await svc.auth.admin.deleteUser(u.id)
    falhou(`deleteUser ${u.email}`, e)
  }
  console.log(`   ${usuarios.length} usuários e seus dados removidos.`)
}

// ══════════════════════════════════════════════════════════════════════════════
// SEED
// ══════════════════════════════════════════════════════════════════════════════
async function criarUsuario(email, role, nome, extras = {}) {
  const { data, error } = await svc.auth.admin.createUser({
    email, password: SENHA, email_confirm: true,
    user_metadata: { role, nome, ...extras },
  })
  falhou(`createUser ${email}`, error)
  return data.user.id
}

async function seed() {
  console.log('\n🌱 Populando dados mock…')

  // ── 1. Usuários (Auth → trigger handle_new_user cria `perfis`) ──────────────
  const perfil = {}
  perfil.admin       = await criarUsuario(`admin${DOMINIO}`,              'admin',   'Admin FuelLink')
  perfil.rotaSul     = await criarUsuario(`posto.rotasul${DOMINIO}`,      'posto',   'Ricardo Menezes', { telefone: '(51) 99811-2200', cargo: 'Diretor' })
  perfil.central     = await criarUsuario(`posto.central${DOMINIO}`,      'posto',   'Cláudia Ferraz',  { telefone: '(41) 99702-3311', cargo: 'Gerente' })
  perfil.translog    = await criarUsuario(`empresa.translog${DOMINIO}`,   'empresa', 'Marcos Andrade',  { telefone: '(51) 98120-4400', cargo: 'Gestor de frota' })
  perfil.agro        = await criarUsuario(`empresa.agrovale${DOMINIO}`,   'empresa', 'Paula Siqueira',  { telefone: '(54) 99933-1200', cargo: 'Coordenadora logística' })
  perfil.construtora = await criarUsuario(`empresa.construtora${DOMINIO}`,'empresa', 'Jorge Tavares',   { telefone: '(41) 98877-6655', cargo: 'Supervisor de obras' })
  console.log('   ✓ usuários (admin, 2 postos, 3 transportadoras)')

  // ── 2. Contas de posto (assinatura Stripe ativa) + postos ───────────────────
  const conta = { rotaSul: randomUUID(), central: randomUUID() }
  await inserir('contas_posto', [
    { id: conta.rotaSul, perfil_id: perfil.rotaSul, plano_id: 'padrao', stripe_customer_id: 'cus_mock_rotasul', stripe_subscription_id: 'sub_mock_rotasul', stripe_subscription_status: 'active', assinatura_inicio: iso(diasAtras(180)), assinatura_fim: iso(new Date(agora.getTime() + 20 * DIA)), created_at: iso(diasAtras(180)) },
    { id: conta.central, perfil_id: perfil.central, plano_id: 'padrao', stripe_customer_id: 'cus_mock_central', stripe_subscription_id: 'sub_mock_central', stripe_subscription_status: 'trialing', assinatura_inicio: iso(diasAtras(10)), assinatura_fim: iso(new Date(agora.getTime() + 20 * DIA)), created_at: iso(diasAtras(10)) },
  ])

  const posto = { poa: randomUUID(), canoas: randomUUID(), curitiba: randomUUID() }
  await inserir('postos', [
    { id: posto.poa, conta_posto_id: conta.rotaSul, nome: 'Posto Rota Sul – Porto Alegre', cnpj: '12.345.678/0001-90', bandeira: 'Ipiranga', endereco: 'Av. Assis Brasil', numero: '4520', bairro: 'Sarandi', cidade: 'Porto Alegre', estado: 'RS', cep: '91110-000', lat: -29.9950, lng: -51.1470, telefone: '(51) 3344-5500', combustiveis: TODOS_COMB, capacidade: '90.000 L', status: 'ativo', created_at: iso(diasAtras(180)) },
    { id: posto.canoas, conta_posto_id: conta.rotaSul, nome: 'Posto Rota Sul – Canoas', cnpj: '12.345.678/0002-71', bandeira: 'Ipiranga', endereco: 'BR-116', numero: 'km 254', bairro: 'Mathias Velho', cidade: 'Canoas', estado: 'RS', cep: '92330-000', lat: -29.9110, lng: -51.1830, telefone: '(51) 3466-8800', combustiveis: ['Diesel S-10', 'Diesel Comum', 'Gasolina Comum', 'Etanol'], capacidade: '60.000 L', status: 'ativo', created_at: iso(diasAtras(150)) },
    { id: posto.curitiba, conta_posto_id: conta.central, nome: 'Auto Posto Central', cnpj: '98.765.432/0001-10', bandeira: 'Shell', endereco: 'Rod. do Café', numero: 'km 12', bairro: 'CIC', cidade: 'Curitiba', estado: 'PR', cep: '81460-000', lat: -25.4980, lng: -49.3400, telefone: '(41) 3222-1010', combustiveis: ['Diesel S-10', 'Gasolina Comum', 'Gasolina Aditivada', 'Etanol'], capacidade: '45.000 L', status: 'ativo', created_at: iso(diasAtras(10)) },
  ])
  console.log('   ✓ 2 contas de posto, 3 postos')

  // ── 3. Frentistas (usuário próprio + registro em `frentistas`) ──────────────
  const frentistasDef = [
    { chave: 'f1', posto: posto.poa,      nome: 'Anderson Lima',   cpf: '111.222.333-44', turno: 'Manhã', tel: '(51) 99111-0001' },
    { chave: 'f2', posto: posto.poa,      nome: 'Bruna Carvalho',  cpf: '222.333.444-55', turno: 'Noite', tel: '(51) 99111-0002' },
    { chave: 'f3', posto: posto.canoas,   nome: 'Carlos Eduardo',  cpf: '333.444.555-66', turno: 'Tarde', tel: '(51) 99111-0003' },
    { chave: 'f4', posto: posto.canoas,   nome: 'Daniela Souza',   cpf: '444.555.666-77', turno: 'Manhã', tel: '(51) 99111-0004' },
    { chave: 'f5', posto: posto.curitiba, nome: 'Eduardo Pires',   cpf: '555.666.777-88', turno: 'Tarde', tel: '(41) 99111-0005' },
  ]
  const frentista = {}
  const frentistasLinhas = []
  for (const f of frentistasDef) {
    const email = `frentista.${f.chave}${DOMINIO}`
    const pid = await criarUsuario(email, 'frentista', f.nome, { telefone: f.tel })
    frentista[f.chave] = randomUUID()
    frentistasLinhas.push({ id: frentista[f.chave], perfil_id: pid, posto_id: f.posto, nome: f.nome, email, telefone: f.tel, cpf: f.cpf, turno: f.turno, status: 'ativo', created_at: iso(diasAtras(120)) })
  }
  frentistasLinhas[3].status = 'inativo' // Daniela saiu
  await inserir('frentistas', frentistasLinhas)
  const frentistasDoPosto = (pid) => frentistasLinhas.filter((l) => l.posto_id === pid && l.status === 'ativo').map((l) => l.id)
  console.log('   ✓ 5 frentistas')

  // ── 4. Transportadoras + frota ──────────────────────────────────────────────
  const empresa = { translog: randomUUID(), agro: randomUUID(), construtora: randomUUID() }
  await inserir('empresas', [
    { id: empresa.translog,    perfil_id: perfil.translog,    nome_empresa: 'TransLog Sul Transportes Ltda', cnpj: '45.678.901/0001-23', segmento: 'Transportadora',   cidade: 'Porto Alegre', estado: 'RS', created_at: iso(diasAtras(170)) },
    { id: empresa.agro,        perfil_id: perfil.agro,        nome_empresa: 'AgroVale Logística',            cnpj: '56.789.012/0001-34', segmento: 'Agronegócio',      cidade: 'Caxias do Sul', estado: 'RS', created_at: iso(diasAtras(120)) },
    { id: empresa.construtora, perfil_id: perfil.construtora, nome_empresa: 'Construtora Horizonte',         cnpj: '67.890.123/0001-45', segmento: 'Construção Civil', cidade: 'Curitiba', estado: 'PR', created_at: iso(diasAtras(30)) },
  ])

  const motoristasDef = {
    translog: [
      { nome: 'João Batista',    cpf: '101.202.303-04', cnh: 'E', vinculo: 'CLT' },
      { nome: 'Sérgio Ramos',    cpf: '202.303.404-05', cnh: 'E', vinculo: 'CLT' },
      { nome: 'Luciana Prado',   cpf: '303.404.505-06', cnh: 'D', vinculo: 'PJ' },
      { nome: 'Rafael Nunes',    cpf: '404.505.606-07', cnh: 'E', vinculo: 'Autônomo' },
      { nome: 'Tiago Moreira',   cpf: '505.606.707-08', cnh: 'C', vinculo: 'Temporário', status: 'pendente' },
    ],
    agro: [
      { nome: 'Antônio Vargas',  cpf: '606.707.808-09', cnh: 'E', vinculo: 'Cooperado' },
      { nome: 'Cristiano Melo',  cpf: '707.808.909-10', cnh: 'E', vinculo: 'CLT' },
      { nome: 'Fernanda Rocha',  cpf: '808.909.010-11', cnh: 'D', vinculo: 'CLT', bloqueado: true },
    ],
    construtora: [
      { nome: 'Pedro Henrique',  cpf: '909.010.111-12', cnh: 'D', vinculo: 'CLT' },
      { nome: 'Marcelo Dias',    cpf: '010.111.212-13', cnh: 'C', vinculo: 'CLT' },
    ],
  }
  const veiculosDef = {
    translog: [
      { placa: 'IVX2A31', modelo: 'Volvo FH 540 6x4',       comb: 'Diesel S-10', limite: 18000 },
      { placa: 'IXR7C22', modelo: 'Scania R 450',           comb: 'Diesel S-10', limite: 18000 },
      { placa: 'IUP3E45', modelo: 'Mercedes-Benz Actros',   comb: 'Diesel S-10', limite: 15000 },
      { placa: 'ABC-1234', modelo: 'VW Constellation 24.280',comb: 'Diesel Comum', limite: 12000 },
      { placa: 'IZK9F10', modelo: 'Iveco Daily 35S14',      comb: 'Diesel S-10', limite: 4000 },
      { placa: 'IQW-5566', modelo: 'Fiat Strada (apoio)',    comb: 'Gasolina Comum', limite: 1500 },
      { placa: 'IRT1B87', modelo: 'DAF XF 480',             comb: 'Diesel S-10', limite: 18000, bloqueado: 'manutencao' },
    ],
    agro: [
      { placa: 'IAG4D12', modelo: 'Scania G 420 Bitrem',    comb: 'Diesel S-10', limite: 22000 },
      { placa: 'IAH8G33', modelo: 'Volvo FMX 500',          comb: 'Diesel S-10', limite: 22000 },
      { placa: 'IBC-2211', modelo: 'MB Atego 2426',          comb: 'Diesel Comum', limite: 9000 },
      { placa: 'IBD6H90', modelo: 'Toyota Hilux',           comb: 'Diesel S-10', limite: 2500 },
    ],
    construtora: [
      { placa: 'BCH3J21', modelo: 'MB Atego 3030 Betoneira',comb: 'Diesel S-10', limite: 8000 },
      { placa: 'BCK-7788', modelo: 'Ford Cargo 2429 Caçamba',comb: 'Diesel Comum', limite: 8000 },
      { placa: 'BDL1K05', modelo: 'Fiat Toro',              comb: 'Gasolina Comum', limite: 1200 },
    ],
  }

  // nome do perfil que fez a ação (desnormalizado nos logs)
  const nomePerfil = { translog: 'Marcos Andrade', agro: 'Paula Siqueira', construtora: 'Jorge Tavares' }
  const semAcento = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const motoristas = {}, veiculos = {}
  const motLinhas = [], veicLinhas = [], motLogs = [], veicBloq = []
  for (const [emp, lista] of Object.entries(motoristasDef)) {
    motoristas[emp] = []
    lista.forEach((m, i) => {
      const id = randomUUID()
      const criadoEm = iso(diasAtras(inteiro(20, 100)))
      motoristas[emp].push({ id, ...m })
      motLinhas.push({
        id, empresa_id: empresa[emp], nome: m.nome, cpf: m.cpf, telefone: `(5${i}) 9${inteiro(1000, 9999)}-${inteiro(1000, 9999)}`,
        email: `${semAcento(m.nome.split(' ')[0])}.${emp}${DOMINIO}`, cnh_numero: String(inteiro(10_000_000_000, 99_999_999_999)),
        cnh_categoria: m.cnh, cnh_validade: ymd(new Date(agora.getTime() + inteiro(60, 1500) * DIA)), vinculo: m.vinculo,
        matricula: `${emp.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`, status: m.status ?? 'ativo',
        bloqueado: !!m.bloqueado, data_nascimento: ymd(new Date(1970 + inteiro(5, 30), inteiro(0, 11), inteiro(1, 28))),
        created_at: criadoEm,
      })
      motLogs.push({ motorista_id: id, acao: 'cadastro', perfil_id: perfil[emp], perfil_nome: nomePerfil[emp], created_at: criadoEm })
      if (m.bloqueado) motLogs.push({ motorista_id: id, acao: 'bloqueio', motivo: 'CNH suspensa — aguardando regularização', perfil_id: perfil[emp], perfil_nome: nomePerfil[emp], created_at: iso(diasAtras(4)) })
    })
  }

  for (const [emp, lista] of Object.entries(veiculosDef)) {
    veiculos[emp] = []
    lista.forEach((v, i) => {
      const id = randomUUID()
      const motPadrao = motoristas[emp][i % motoristas[emp].length]
      veiculos[emp].push({ id, ...v, motoristaId: motPadrao.id })
      veicLinhas.push({
        id, empresa_id: empresa[emp], placa: v.placa, modelo: v.modelo, combustivel: v.comb, limite_mensal: v.limite,
        motorista_padrao_id: motPadrao.id, exigir_quilometragem: i % 2 === 0, status: 'ativo',
        bloqueado: !!v.bloqueado, bloqueio_tipo: v.bloqueado ?? null, created_at: iso(diasAtras(inteiro(20, 100))),
      })
      if (v.bloqueado) veicBloq.push({ veiculo_id: id, acao: 'bloqueio', tipo: v.bloqueado, motivo: 'Revisão de 100.000 km — retorna em 5 dias', perfil_id: perfil[emp], perfil_nome: nomePerfil[emp], created_at: iso(diasAtras(2)) })
    })
  }
  await inserir('motoristas', motLinhas)
  await inserir('veiculos', veicLinhas)
  await inserir('motorista_logs', motLogs)
  await inserir('veiculo_bloqueios', veicBloq)
  const veiculosAtivos = (emp) => veiculos[emp].filter((v) => !v.bloqueado)
  console.log(`   ✓ 3 transportadoras, ${motLinhas.length} motoristas, ${veicLinhas.length} veículos`)

  // ── 5. Solicitações → propostas → parcerias (todos os estágios do funil) ────
  const sols = [], props = [], parcs = [], contratos = [], msgs = []
  const parceria = {}

  /** Cria o encadeamento solicitação→proposta(s)→parceria conforme o cenário. */
  function cenario({ chave, emp, pst, origem, dias, ciclo, limite, propostaModo, exigeContrato, exigeCertificado, resultado }) {
    const solId = randomUUID()
    const criadoEm = diasAtras(dias)
    const comb = TODOS_COMB.filter(() => rnd() > 0.3)
    if (!comb.includes('Diesel S-10')) comb.unshift('Diesel S-10')
    const solStatus = {
      ativa: 'aceita', ativa_contrato: 'aceita', pendente_assinatura: 'aceita', encerrada: 'aceita',
      negociacao: 'em_negociacao', proposta_recebida: 'proposta_recebida', aguardando: 'aguardando', rejeitada: 'rejeitada',
    }[resultado]
    sols.push({
      id: solId, empresa_id: empresa[emp], posto_id: posto[pst], combustiveis: comb,
      volume_estimado: origem === 'empresa' ? `${inteiro(8, 40)}.000 L/mês` : null,
      valor_estimado: origem === 'empresa' ? inteiro(40, 200) * 1000 : null,
      mensagem: origem === 'empresa' ? 'Buscamos parceiro para abastecimento da frota pesada com faturamento quinzenal.' : 'Convite: gostaríamos de atender sua frota com condições especiais para diesel.',
      status: solStatus, origem, created_at: iso(criadoEm), updated_at: iso(criadoEm),
    })
    if (resultado === 'aguardando') return

    // v1 da proposta
    const propV1 = randomUUID()
    const enviadaEm = new Date(criadoEm.getTime() + inteiro(1, 3) * DIA)
    const base = {
      solicitacao_id: solId, posto_id: posto[pst], empresa_id: empresa[emp],
      ciclo_tipo: ciclo, ciclo_intervalo_dias: null, ciclo_prazo_recebimento: ciclo === 'mensal' ? 10 : 5,
      limite_credito: limite, volume_minimo: null, validade_dias: 15, validade_ate: iso(new Date(enviadaEm.getTime() + 15 * DIA)),
      exige_certificado: !!exigeCertificado, exige_contrato: exigeContrato !== false,
    }
    let propStatus = 'pendente'
    if (['ativa', 'ativa_contrato', 'pendente_assinatura', 'encerrada'].includes(resultado)) propStatus = 'aceita'
    if (resultado === 'rejeitada') propStatus = 'rejeitada'
    if (resultado === 'negociacao') propStatus = 'substituida'
    props.push({ ...base, id: propV1, combustiveis: condicoes(comb, propostaModo), versao: 1, status: propStatus,
      observacoes: 'Pagamento via boleto. Preços de diesel com desconto fixo sobre a bomba.', created_at: iso(enviadaEm), updated_at: iso(enviadaEm) })
    msgs.push({ solicitacao_id: solId, autor_tipo: 'posto', autor_id: posto[pst], tipo: 'proposta_enviada', proposta_id: propV1, conteudo: 'Segue nossa proposta comercial. Ficamos à disposição.', created_at: iso(enviadaEm), lida_em: iso(new Date(enviadaEm.getTime() + 3_600_000)) })

    let propAceita = propV1
    if (resultado === 'negociacao') {
      const t1 = new Date(enviadaEm.getTime() + 1 * DIA)
      msgs.push({ solicitacao_id: solId, autor_tipo: 'empresa', autor_id: empresa[emp], tipo: 'proposta_recusada', proposta_id: propV1, conteudo: 'O desconto no S-10 ficou abaixo do que praticamos hoje. Conseguem melhorar para R$ 0,20?', created_at: iso(t1), lida_em: iso(new Date(t1.getTime() + 7_200_000)) })
      const t2 = new Date(t1.getTime() + 0.5 * DIA)
      msgs.push({ solicitacao_id: solId, autor_tipo: 'posto', autor_id: posto[pst], tipo: 'mensagem', conteudo: 'Vamos revisar. Com volume mínimo de 15 mil litros/mês conseguimos chegar lá.', created_at: iso(t2), lida_em: iso(new Date(t2.getTime() + 3_600_000)) })
      const propV2 = randomUUID()
      const t3 = new Date(t2.getTime() + 1 * DIA)
      props.push({ ...base, id: propV2, combustiveis: condicoes(comb, 'desconto').map((c) => c.tipo === 'Diesel S-10' ? { ...c, valor: 0.2 } : c), versao: 2, status: 'pendente', volume_minimo: 15000,
        validade_ate: iso(new Date(t3.getTime() + 15 * DIA)), observacoes: 'Revisão: desconto de R$ 0,20 no S-10 mediante volume mínimo mensal.', created_at: iso(t3), updated_at: iso(t3) })
      msgs.push({ solicitacao_id: solId, autor_tipo: 'posto', autor_id: posto[pst], tipo: 'proposta_revisada', proposta_id: propV2, conteudo: 'Proposta revisada conforme conversamos.', created_at: iso(t3), lida_em: null })
      return
    }
    if (resultado === 'proposta_recebida') return
    if (resultado === 'rejeitada') {
      msgs.push({ solicitacao_id: solId, autor_tipo: 'empresa', autor_id: empresa[emp], tipo: 'proposta_recusada', proposta_id: propV1, conteudo: 'Optamos por outro fornecedor nesta região. Obrigado.', created_at: iso(new Date(enviadaEm.getTime() + 2 * DIA)), lida_em: iso(new Date(enviadaEm.getTime() + 2.2 * DIA)) })
      return
    }

    // Aceite → parceria
    const aceiteEm = new Date(enviadaEm.getTime() + inteiro(1, 4) * DIA)
    msgs.push({ solicitacao_id: solId, autor_tipo: 'empresa', autor_id: empresa[emp], tipo: 'proposta_aceita', proposta_id: propAceita, conteudo: 'Proposta aceita. Vamos em frente!', created_at: iso(aceiteEm), lida_em: iso(new Date(aceiteEm.getTime() + 3_600_000)) })
    const parcId = randomUUID()
    const prop = props.find((p) => p.id === propAceita)
    const parcStatus = { ativa: 'ativa', ativa_contrato: 'ativa', pendente_assinatura: 'pendente_assinatura', encerrada: 'encerrada' }[resultado]
    const encerradaEm = resultado === 'encerrada' ? diasAtras(35) : null
    parcs.push({
      id: parcId, empresa_id: empresa[emp], posto_id: posto[pst], proposta_id: propAceita, combustiveis: prop.combustiveis,
      ciclo_tipo: ciclo, ciclo_intervalo_dias: null, ciclo_prazo_recebimento: prop.ciclo_prazo_recebimento, limite_credito: limite, volume_minimo: prop.volume_minimo,
      status: parcStatus, iniciada_em: iso(aceiteEm), encerrada_em: encerradaEm ? iso(encerradaEm) : null, created_at: iso(aceiteEm), updated_at: iso(encerradaEm ?? aceiteEm),
    })
    parceria[chave] = parcs.at(-1)
    if (exigeContrato !== false) {
      const assinouEmp = resultado !== 'pendente_assinatura'
      contratos.push({
        parceria_id: parcId, empresa_id: empresa[emp], posto_id: posto[pst], vigencia_inicio: ymd(aceiteEm), vigencia_fim: ymd(new Date(aceiteEm.getTime() + 365 * DIA)),
        exige_certificado: !!exigeCertificado, auth_method: exigeCertificado ? 'certificado_a1' : 'sistema',
        assinado_posto_em: iso(new Date(aceiteEm.getTime() + 0.2 * DIA)), auth_ip_posto: '177.45.12.90', auth_navegador_posto: 'Chrome 129 / Windows', auth_dispositivo_posto: 'Desktop', auth_data_posto: iso(new Date(aceiteEm.getTime() + 0.2 * DIA)), auth_hash_posto: sha256(parcId + 'posto'),
        ...(assinouEmp ? {
          assinado_empresa_em: iso(new Date(aceiteEm.getTime() + 0.8 * DIA)), auth_ip: '189.10.77.201', auth_navegador: 'Edge 129 / Windows', auth_dispositivo: 'Desktop', auth_data: iso(new Date(aceiteEm.getTime() + 0.8 * DIA)), auth_hash: sha256(parcId + 'empresa'),
          ...(exigeCertificado ? { auth_cert_subject: 'TRANSLOG SUL TRANSPORTES LTDA:45678901000123', auth_cert_issuer: 'AC SERASA RFB v5', auth_cert_serial: '5A2F9C1B', auth_cert_validade: ymd(new Date(agora.getTime() + 300 * DIA)), auth_signature: Buffer.from(sha256(parcId)).toString('base64') } : {}),
        } : {}),
        created_at: iso(aceiteEm),
      })
    }
  }

  // Cenários (chave → usado depois para requisições/faturamento)
  cenario({ chave: 'translog_poa',      emp: 'translog',    pst: 'poa',      origem: 'posto',   dias: 150, ciclo: 'quinzenal', limite: 60000, propostaModo: 'desconto', exigeContrato: false, resultado: 'ativa' })
  cenario({ chave: 'translog_canoas',   emp: 'translog',    pst: 'canoas',   origem: 'empresa', dias: 95,  ciclo: 'mensal',    limite: 40000, propostaModo: 'desconto', exigeContrato: true, exigeCertificado: true, resultado: 'ativa_contrato' })
  cenario({ chave: 'agro_poa',          emp: 'agro',        pst: 'poa',      origem: 'posto',   dias: 100, ciclo: 'mensal',    limite: 80000, propostaModo: 'bomba',    exigeContrato: true, resultado: 'ativa_contrato' })
  cenario({ chave: 'translog_curitiba', emp: 'translog',    pst: 'curitiba', origem: 'empresa', dias: 160, ciclo: 'semanal',   limite: 20000, propostaModo: 'desconto', exigeContrato: false, resultado: 'encerrada' })
  cenario({ chave: 'construtora_canoas',emp: 'construtora', pst: 'canoas',   origem: 'posto',   dias: 6,   ciclo: 'quinzenal', limite: 25000, propostaModo: 'acrescimo',exigeContrato: true, resultado: 'pendente_assinatura' })
  cenario({ chave: 'agro_curitiba',     emp: 'agro',        pst: 'curitiba', origem: 'posto',   dias: 7,   ciclo: 'mensal',    limite: 50000, propostaModo: 'desconto', exigeContrato: true, resultado: 'negociacao' })
  cenario({ chave: 'construtora_poa',   emp: 'construtora', pst: 'poa',      origem: 'empresa', dias: 20,  ciclo: 'mensal',    limite: 15000, propostaModo: 'acrescimo',exigeContrato: true, resultado: 'rejeitada' })
  cenario({ chave: 'construtora_curitiba', emp: 'construtora', pst: 'curitiba', origem: 'posto', dias: 1, ciclo: 'mensal',    limite: 30000, propostaModo: 'desconto', exigeContrato: true, resultado: 'aguardando' })
  cenario({ chave: 'agro_canoas',       emp: 'agro',        pst: 'canoas',   origem: 'posto',   dias: 3,   ciclo: 'quinzenal', limite: 45000, propostaModo: 'desconto', exigeContrato: false, resultado: 'proposta_recebida' })

  await inserir('solicitacoes', sols)
  await inserir('propostas', props)
  // O trigger recalcula validade_ate = NOW()+dias no INSERT; restaura as datas históricas
  for (const p of props) { const { error } = await svc.from('propostas').update({ validade_ate: p.validade_ate }).eq('id', p.id); falhou('update validade_ate', error) }
  await inserir('parcerias', parcs)
  await inserir('contratos', contratos)
  await inserir('parceria_mensagens', msgs)
  console.log(`   ✓ ${sols.length} solicitações, ${props.length} propostas, ${parcs.length} parcerias (${contratos.length} contratos), ${msgs.length} mensagens`)

  // ── 6. Liberações (abastecimento livre) ─────────────────────────────────────
  const libTranslog = randomUUID()
  await inserir('liberacoes', [
    { id: libTranslog, parceria_id: parceria.translog_poa.id, ativa: true, veiculos_config: 'selecionados', usar_limite_por_abast: true, limite_tipo: 'valor', limite_por_abast: 1500, usar_limite_mensal: true, limite_mensal: 30000, created_at: iso(diasAtras(60)) },
    { id: randomUUID(), parceria_id: parceria.agro_poa.id, ativa: false, veiculos_config: 'todos', usar_limite_por_abast: false, limite_tipo: null, limite_por_abast: null, usar_limite_mensal: false, limite_mensal: null, created_at: iso(diasAtras(40)) },
  ])
  await inserir('liberacao_veiculos', veiculos.translog.slice(0, 3).map((v) => ({ liberacao_id: libTranslog, veiculo_id: v.id })))
  console.log('   ✓ liberações')

  // ── 7. Requisições + validações (→ abastecimentos por trigger) ──────────────
  const reqs = [], vals = []
  function requisicao({ emp, parc, dias, status, hora }) {
    const v = escolha(veiculosAtivos(emp))
    const mot = motoristas[emp].find((m) => m.id === v.motoristaId)
    const criado = diasAtras(dias, hora ?? inteiro(5, 19))
    const tipo = escolha(['valor', 'valor', 'volume', 'tanque'])
    const litrosMax = v.limite > 10000 ? inteiro(250, 500) : inteiro(40, 120)
    const id = randomUUID()
    reqs.push({
      id, empresa_id: empresa[emp], veiculo_id: v.id, motorista_id: mot?.id ?? null, parceria_id: parc.id, posto_id: parc.posto_id,
      combustivel: v.comb, tipo_limite: tipo,
      limite_valor:  tipo === 'valor'  ? r2(litrosMax * PRECO[v.comb]) : null,
      limite_volume: tipo === 'volume' ? litrosMax : null,
      validade: iso(fimDoDia(criado)), quilometragem: v.limite > 10000 ? inteiro(120_000, 480_000) : inteiro(20_000, 90_000),
      observacao: rnd() > 0.7 ? escolha(['Viagem Porto Alegre → Curitiba', 'Entrega urgente — cliente aguardando', 'Completar tanque para rota da semana', 'Abastecer antes da pesagem']) : null,
      status, eh_livre: false, created_at: iso(criado), updated_at: iso(criado),
    })
    if (status === 'concluido') {
      const litros = r3(litrosMax * entre(0.7, 1))
      const unit = precoNegociado(parc, v.comb)
      const quando = new Date(criado.getTime() + inteiro(20, 240) * 60_000)
      vals.push({
        requisicao_id: id, frentista_id: escolha(frentistasDoPosto(parc.posto_id)), data_hora: iso(quando),
        litros, valor_unitario: unit, valor_cobrado: r2(litros * unit), hodometro: reqs.at(-1).quilometragem, created_at: iso(quando),
      })
    }
    return id
  }
  // Histórico concluído (últimos 90 dias) — volume maior na parceria principal
  for (let d = 90; d >= 1; d--) {
    const n = inteiro(0, 2); for (let i = 0; i < n; i++) requisicao({ emp: 'translog', parc: parceria.translog_poa, dias: d, status: 'concluido' })
    if (rnd() > 0.55) requisicao({ emp: 'agro',     parc: parceria.agro_poa,        dias: d, status: 'concluido' })
    if (rnd() > 0.7)  requisicao({ emp: 'translog', parc: parceria.translog_canoas, dias: d, status: 'concluido' })
  }
  // Parceria encerrada: histórico antigo
  for (let d = 150; d >= 40; d -= inteiro(6, 12)) requisicao({ emp: 'translog', parc: parceria.translog_curitiba, dias: d, status: 'concluido' })
  // Hoje: pendentes (aguardando o frentista), ativas (liberadas, abastecendo) e uma concluída
  requisicao({ emp: 'translog', parc: parceria.translog_poa, dias: 0, status: 'pendente', hora: 7 })
  requisicao({ emp: 'translog', parc: parceria.translog_poa, dias: 0, status: 'pendente', hora: 9 })
  requisicao({ emp: 'agro',     parc: parceria.agro_poa,     dias: 0, status: 'pendente', hora: 8 })
  requisicao({ emp: 'translog', parc: parceria.translog_canoas, dias: 0, status: 'pendente', hora: 10 })
  requisicao({ emp: 'translog', parc: parceria.translog_poa, dias: 0, status: 'ativo', hora: 6 })
  requisicao({ emp: 'agro',     parc: parceria.agro_poa,     dias: 0, status: 'ativo', hora: 7 })
  requisicao({ emp: 'translog', parc: parceria.translog_poa, dias: 0, status: 'concluido', hora: 5 })
  // Expiradas / canceladas
  for (const d of [2, 5, 11]) requisicao({ emp: 'translog', parc: parceria.translog_poa, dias: d, status: 'expirado' })
  requisicao({ emp: 'agro', parc: parceria.agro_poa, dias: 3, status: 'cancelado' })
  requisicao({ emp: 'translog', parc: parceria.translog_canoas, dias: 8, status: 'cancelado' })

  await inserir('requisicoes', reqs)
  await inserir('validacoes', vals) // trigger cria `abastecimentos` e marca a requisição como concluída
  console.log(`   ✓ ${reqs.length} requisições, ${vals.length} validações/abastecimentos`)

  // ── 8. Faturamentos (fecha ciclos passados a partir dos abastecimentos) ─────
  const { data: abasts, error: eAb } = await svc.from('abastecimentos').select('id, parceria_id, data, litros, valor').in('parceria_id', parcs.map((p) => p.id))
  falhou('select abastecimentos', eAb)

  const CICLO_LABEL = { diario: 'Diário', semanal: 'Semanal', quinzenal: 'Quinzenal', mensal: 'Mensal' }
  const fats = [], fatItens = [], faturadosIds = []
  function fechar(parc, deDias, ateDias, status) {
    const itens = abasts.filter((a) => a.parceria_id === parc.id && (agora - new Date(a.data)) / DIA <= deDias && (agora - new Date(a.data)) / DIA > ateDias)
    if (!itens.length) return
    const datas = itens.map((a) => new Date(a.data).getTime())
    const prazo = parc.ciclo_prazo_recebimento ?? 5
    const fechamento = diasAtras(ateDias)
    const venc = new Date(fechamento.getTime() + prazo * DIA)
    const id = randomUUID()
    fats.push({
      id, posto_id: parc.posto_id, empresa_id: parc.empresa_id, parceria_id: parc.id,
      periodo_inicio: ymd(new Date(Math.min(...datas))), periodo_fim: ymd(new Date(Math.max(...datas))),
      ciclo: `${CICLO_LABEL[parc.ciclo_tipo]} + ${prazo} dias`, desc_ciclo: `Vencimento ${prazo} dias após o fechamento`,
      data_faturamento: ymd(fechamento), data_vencimento: ymd(venc),
      total_abastecimentos: itens.length, total_litros: r3(itens.reduce((s, a) => s + Number(a.litros), 0)), total_valor: r2(itens.reduce((s, a) => s + Number(a.valor), 0)),
      status, pago_em: status === 'pago' ? iso(new Date(venc.getTime() - inteiro(0, 3) * DIA)) : null, created_at: iso(fechamento), updated_at: iso(fechamento),
    })
    itens.forEach((a) => { fatItens.push({ faturamento_id: id, abastecimento_id: a.id }); faturadosIds.push(a.id) })
  }
  // TransLog × POA: quinzenal — 5 ciclos pagos, 1 enviado (em aberto), últimos dias a faturar
  for (let k = 90; k > 15; k -= 15) fechar(parceria.translog_poa, k, k - 15, 'pago')
  fechar(parceria.translog_poa, 15, 5, 'enviado')
  // Agro × POA: mensal — 1 pago, 1 atrasado (venceu e não pagou), mês corrente a faturar
  fechar(parceria.agro_poa, 90, 60, 'pago')
  fechar(parceria.agro_poa, 60, 30, 'atrasado')
  // TransLog × Canoas: mensal — 1 pago, 1 enviado
  fechar(parceria.translog_canoas, 90, 45, 'pago')
  fechar(parceria.translog_canoas, 45, 10, 'enviado')
  // Parceria encerrada: tudo pago
  fechar(parceria.translog_curitiba, 200, 36, 'pago')

  // Faturamentos inseridos um a um para o trigger numerar em ordem cronológica
  for (const f of fats.sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const { data, error } = await svc.from('faturamentos').insert(f).select('numero').single()
    falhou('insert faturamentos', error); f.numero = data.numero
  }
  await inserir('faturamento_abastecimentos', fatItens)
  for (let i = 0; i < faturadosIds.length; i += 200) { const { error } = await svc.from('abastecimentos').update({ status: 'faturado' }).in('id', faturadosIds.slice(i, i + 200)); falhou('update abastecimentos', error) }
  // Um abastecimento recente contestado pela empresa
  const contestavel = abasts.filter((a) => !faturadosIds.includes(a.id) && a.parceria_id === parceria.translog_poa.id)[0]
  if (contestavel) { const { error } = await svc.from('abastecimentos').update({ status: 'contestado' }).eq('id', contestavel.id); falhou('update contestado', error) }
  console.log(`   ✓ ${fats.length} faturamentos (${faturadosIds.length} abastecimentos faturados)`)

  // ── 9. Avaliações e notificações ────────────────────────────────────────────
  await inserir('avaliacoes', [
    { posto_id: posto.poa,      empresa_id: empresa.translog, nota: 5, comentario: 'Atendimento rápido e faturamento sempre em dia.', util_count: 3, created_at: iso(diasAtras(40)) },
    { posto_id: posto.poa,      empresa_id: empresa.agro,     nota: 4, comentario: 'Bom preço no S-10; pista pequena para bitrem em horário de pico.', util_count: 1, created_at: iso(diasAtras(25)) },
    { posto_id: posto.canoas,   empresa_id: empresa.translog, nota: 4, comentario: 'Localização excelente na BR-116.', util_count: 0, created_at: iso(diasAtras(30)) },
    { posto_id: posto.curitiba, empresa_id: empresa.translog, nota: 3, comentario: 'Encerramos por mudança de rota, não por problemas.', util_count: 0, created_at: iso(diasAtras(34)) },
  ])

  const notif = (perfilId, tipo, titulo, descricao, link, dias, lida = true) => ({ perfil_id: perfilId, tipo, titulo, descricao, link, created_at: iso(diasAtras(dias)), lida_em: lida ? iso(diasAtras(dias - 0.1)) : null })
  const fatAtrasado = fats.find((f) => f.status === 'atrasado')
  await inserir('notificacoes', [
    // Transportadoras
    notif(perfil.translog, 'proposta_recebida', 'Nova proposta recebida', 'Posto Rota Sul – Porto Alegre enviou uma proposta comercial.', '/empresa/parcerias', 148),
    notif(perfil.translog, 'parceria_ativa', 'Parceria ativa', 'Sua parceria com Posto Rota Sul – Porto Alegre está ativa. Já é possível emitir requisições.', '/empresa/parcerias', 146),
    notif(perfil.translog, 'contrato_assinado_contraparte', 'Contrato assinado pelo posto', 'Posto Rota Sul – Canoas assinou o contrato. Falta a sua assinatura.', '/empresa/parcerias', 91),
    notif(perfil.translog, 'parceria_encerrada', 'Parceria encerrada', 'A parceria com Auto Posto Central foi encerrada.', '/empresa/parcerias', 35),
    notif(perfil.agro, 'proposta_revisada', 'Proposta revisada', 'Auto Posto Central enviou uma nova versão (v2) da proposta.', '/empresa/parcerias', 4.5, false),
    notif(perfil.agro, 'mensagem_negociacao', 'Nova mensagem na negociação', 'Auto Posto Central: "Vamos revisar. Com volume mínimo…"', '/empresa/parcerias', 5.5, false),
    notif(perfil.agro, 'proposta_recebida', 'Nova proposta recebida', 'Posto Rota Sul – Canoas enviou uma proposta comercial.', '/empresa/parcerias', 1, false),
    notif(perfil.construtora, 'contrato_pronto', 'Contrato pronto para assinatura', 'O contrato com Posto Rota Sul – Canoas aguarda sua assinatura.', '/empresa/parcerias', 3, false),
    notif(perfil.construtora, 'proposta_rejeitada', 'Proposta recusada', 'Você recusou a proposta de Posto Rota Sul – Porto Alegre.', '/empresa/parcerias', 16),
    // Postos
    notif(perfil.rotaSul, 'proposta_aceita', 'Proposta aceita', 'TransLog Sul aceitou sua proposta. Parceria ativa.', '/posto/parcerias/ativos', 146),
    notif(perfil.rotaSul, 'proposta_aceita', 'Proposta aceita', 'Construtora Horizonte aceitou sua proposta. Aguardando assinatura do contrato.', '/posto/parcerias/solicitacoes', 3, false),
    notif(perfil.rotaSul, 'solicitacao_nova', 'Nova solicitação de parceria', 'Construtora Horizonte solicitou parceria com Posto Rota Sul – Porto Alegre.', '/posto/parcerias/solicitacoes', 20),
    ...(fatAtrasado ? [notif(perfil.rotaSul, 'parceria_suspensa', 'Fatura em atraso', `${fatAtrasado.numero ?? 'Fatura'} de AgroVale Logística venceu sem pagamento.`, '/posto/faturamento', 2, false)] : []),
    notif(perfil.central, 'mensagem_negociacao', 'Nova mensagem na negociação', 'AgroVale Logística respondeu à proposta.', '/posto/parcerias/solicitacoes', 6),
    notif(perfil.central, 'parceria_encerrada', 'Parceria encerrada', 'A parceria com TransLog Sul foi encerrada.', '/posto/parcerias/ativos', 35),
  ])
  console.log('   ✓ avaliações e notificações')
}

// ══════════════════════════════════════════════════════════════════════════════
await limpar()
if (SO_LIMPAR) { console.log('\n✅ Limpeza concluída.'); process.exit(0) }
await seed()

console.log(`
✅ Dados mock prontos. Senha de todos: ${SENHA}

  Papel          E-mail                                   O que ver
  ─────────────  ───────────────────────────────────────  ──────────────────────────────────────────────
  admin          admin${DOMINIO}              dashboard geral, postos, empresas, transações
  posto          posto.rotasul${DOMINIO}      2 postos (POA + Canoas), 3 parcerias ativas, 1 pendente
                                                          de assinatura, faturas pagas/enviadas/atrasada
  posto          posto.central${DOMINIO}      conta em trial, negociação em andamento (v2),
                                                          solicitação nova, parceria encerrada
  empresa        empresa.translog${DOMINIO}   frota de 7 veículos, 3 parcerias, liberação ativa,
                                                          requisições pendentes hoje, histórico de 90 dias
  empresa        empresa.agrovale${DOMINIO}   parceria ativa, negociação v2 sem resposta,
                                                          proposta nova, motorista bloqueado, fatura atrasada
  empresa        empresa.construtora${DOMINIO} contrato aguardando assinatura, proposta rejeitada,
                                                          solicitação recém-aberta pelo posto
  frentista      frentista.f1${DOMINIO}       Posto POA — requisições pendentes/liberadas hoje
  frentista      frentista.f3${DOMINIO}       Posto Canoas
  frentista      frentista.f5${DOMINIO}       Auto Posto Central (sem parceria ativa)

  Para remover: node scripts/seed-mock.mjs --limpar
`)
