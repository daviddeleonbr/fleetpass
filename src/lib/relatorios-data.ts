export interface Abastecimento {
  codigo: string
  data: string       // dd/MM/yyyy
  posto: string      // id do posto
  empresa: string
  cnpj: string
  responsavel: string
  telefone: string
  email: string
  veiculo: string
  motorista: string
  combustivel: string
  litros: number
  valorUnitario: number
  valor: number
  status: 'faturado' | 'pendente' | 'contestado'
}

export const POSTOS = [
  { id: 'todos',        label: 'Todos os postos'  },
  { id: 'shell-centro', label: 'Shell — Centro'   },
  { id: 'shell-norte',  label: 'Shell — Norte'    },
]

export const ABASTECIMENTOS: Abastecimento[] = [
  // ── Janeiro 2026 ──────────────────────────────────────────────
  { codigo: 'FL-AA1-1A1', posto: 'shell-centro', data: '03/01/2026', empresa: 'TransLog Transportes',  cnpj: '00.000.000/0001-00', responsavel: 'João Silva',      telefone: '(11) 99000-0001', email: 'joao@translog.com.br',     veiculo: 'ABC-1234', motorista: 'Carlos Santos',   combustivel: 'Diesel S-10',       litros: 50, valorUnitario: 6.25, valor: 312.50, status: 'faturado' },
  { codigo: 'FL-AA1-1A2', posto: 'shell-norte',  data: '07/01/2026', empresa: 'LogBR Express',          cnpj: '11.111.111/0001-11', responsavel: 'Beatriz Rocha',   telefone: '(21) 98111-1111', email: 'beatriz@logbr.com.br',    veiculo: 'LBR-9999', motorista: 'Sandro Mota',    combustivel: 'Diesel S-10',       litros: 65, valorUnitario: 6.25, valor: 406.25, status: 'faturado' },
  { codigo: 'FL-AA1-1A3', posto: 'shell-centro', data: '10/01/2026', empresa: 'Construtora Alpha',      cnpj: '22.222.222/0001-22', responsavel: 'Marcos Oliveira', telefone: '(31) 97222-2222', email: 'marcos@alpha.com.br',     veiculo: 'CAL-5678', motorista: 'Pedro Gomes',    combustivel: 'Gasolina Comum',    litros: 30, valorUnitario: 5.45, valor: 163.50, status: 'faturado' },
  { codigo: 'FL-AA1-1A4', posto: 'shell-norte',  data: '14/01/2026', empresa: 'TransLog Transportes',  cnpj: '00.000.000/0001-00', responsavel: 'João Silva',      telefone: '(11) 99000-0001', email: 'joao@translog.com.br',     veiculo: 'GHI-9012', motorista: 'Carlos Santos',   combustivel: 'Diesel S-10',       litros: 60, valorUnitario: 6.25, valor: 375.00, status: 'faturado' },
  { codigo: 'FL-AA1-1A5', posto: 'shell-centro', data: '17/01/2026', empresa: 'Turbo Fretes',           cnpj: '33.333.333/0001-33', responsavel: 'Cláudia Mendes', telefone: '(85) 96333-3333', email: 'claudia@turbofretes.com.br', veiculo: 'TFR-3456', motorista: 'Raimundo Neto', combustivel: 'Etanol',            litros: 40, valorUnitario: 3.40, valor: 136.00, status: 'faturado' },
  { codigo: 'FL-AA1-1A6', posto: 'shell-norte',  data: '21/01/2026', empresa: 'TransRota Logística',   cnpj: '44.444.444/0001-44', responsavel: 'Robson Freitas', telefone: '(41) 95444-4444', email: 'robson@transrota.com.br', veiculo: 'TRL-2345', motorista: 'João Batista',   combustivel: 'Diesel S-10',       litros: 55, valorUnitario: 6.25, valor: 343.75, status: 'faturado' },
  { codigo: 'FL-AA1-1A7', posto: 'shell-centro', data: '24/01/2026', empresa: 'LogBR Express',          cnpj: '11.111.111/0001-11', responsavel: 'Beatriz Rocha',   telefone: '(21) 98111-1111', email: 'beatriz@logbr.com.br',    veiculo: 'LBR-7777', motorista: 'Ana Fernandes',  combustivel: 'Diesel S-10',       litros: 70, valorUnitario: 6.25, valor: 437.50, status: 'faturado' },
  { codigo: 'FL-AA1-1A8', posto: 'shell-norte',  data: '28/01/2026', empresa: 'TransLog Transportes',  cnpj: '00.000.000/0001-00', responsavel: 'João Silva',      telefone: '(11) 99000-0001', email: 'joao@translog.com.br',     veiculo: 'DEF-5678', motorista: 'Ana Costa',       combustivel: 'Diesel S-10',       litros: 68, valorUnitario: 6.25, valor: 425.00, status: 'faturado' },
  { codigo: 'FL-AA1-1A9', posto: 'shell-centro', data: '30/01/2026', empresa: 'Construtora Alpha',      cnpj: '22.222.222/0001-22', responsavel: 'Marcos Oliveira', telefone: '(31) 97222-2222', email: 'marcos@alpha.com.br',     veiculo: 'CAL-6789', motorista: 'Marcos Lima',    combustivel: 'Diesel Comum',      litros: 45, valorUnitario: 5.68, valor: 255.60, status: 'faturado' },

  // ── Fevereiro 2026 ────────────────────────────────────────────
  { codigo: 'FL-BB2-2B1', posto: 'shell-norte',  data: '02/02/2026', empresa: 'TransLog Transportes',  cnpj: '00.000.000/0001-00', responsavel: 'João Silva',      telefone: '(11) 99000-0001', email: 'joao@translog.com.br',     veiculo: 'JKL-3456', motorista: 'Rafael Melo',     combustivel: 'Diesel S-10',       litros: 72, valorUnitario: 6.32, valor: 455.04, status: 'faturado' },
  { codigo: 'FL-BB2-2B2', posto: 'shell-centro', data: '05/02/2026', empresa: 'LogBR Express',          cnpj: '11.111.111/0001-11', responsavel: 'Beatriz Rocha',   telefone: '(21) 98111-1111', email: 'beatriz@logbr.com.br',    veiculo: 'LBR-5566', motorista: 'Diego Pires',    combustivel: 'Diesel S-10',       litros: 58, valorUnitario: 6.32, valor: 366.56, status: 'faturado' },
  { codigo: 'FL-BB2-2B3', posto: 'shell-norte',  data: '10/02/2026', empresa: 'Construtora Alpha',      cnpj: '22.222.222/0001-22', responsavel: 'Marcos Oliveira', telefone: '(31) 97222-2222', email: 'marcos@alpha.com.br',     veiculo: 'CAL-5678', motorista: 'Pedro Gomes',    combustivel: 'Gasolina Comum',    litros: 32, valorUnitario: 5.51, valor: 176.32, status: 'faturado' },
  { codigo: 'FL-BB2-2B4', posto: 'shell-centro', data: '12/02/2026', empresa: 'Turbo Fretes',           cnpj: '33.333.333/0001-33', responsavel: 'Cláudia Mendes', telefone: '(85) 96333-3333', email: 'claudia@turbofretes.com.br', veiculo: 'TFR-8901', motorista: 'Claudia Sousa', combustivel: 'Gasolina Comum',    litros: 28, valorUnitario: 5.51, valor: 154.28, status: 'faturado' },
  { codigo: 'FL-BB2-2B5', posto: 'shell-norte',  data: '14/02/2026', empresa: 'TransLog Transportes',  cnpj: '00.000.000/0001-00', responsavel: 'João Silva',      telefone: '(11) 99000-0001', email: 'joao@translog.com.br',     veiculo: 'ABC-1234', motorista: 'Carlos Santos',   combustivel: 'Diesel S-10',       litros: 48, valorUnitario: 6.32, valor: 303.36, status: 'faturado' },
  { codigo: 'FL-BB2-2B6', posto: 'shell-centro', data: '18/02/2026', empresa: 'TransRota Logística',   cnpj: '44.444.444/0001-44', responsavel: 'Robson Freitas', telefone: '(41) 95444-4444', email: 'robson@transrota.com.br', veiculo: 'TRL-9988', motorista: 'Robson Freitas',  combustivel: 'Gasolina Aditivada',litros: 36, valorUnitario: 6.05, valor: 217.80, status: 'faturado' },
  { codigo: 'FL-BB2-2B7', posto: 'shell-norte',  data: '20/02/2026', empresa: 'LogBR Express',          cnpj: '11.111.111/0001-11', responsavel: 'Beatriz Rocha',   telefone: '(21) 98111-1111', email: 'beatriz@logbr.com.br',    veiculo: 'LBR-1234', motorista: 'Fernanda Ramos', combustivel: 'Diesel S-10',       litros: 75, valorUnitario: 6.32, valor: 474.00, status: 'faturado' },
  { codigo: 'FL-BB2-2B8', posto: 'shell-centro', data: '25/02/2026', empresa: 'Construtora Alpha',      cnpj: '22.222.222/0001-22', responsavel: 'Marcos Oliveira', telefone: '(31) 97222-2222', email: 'marcos@alpha.com.br',     veiculo: 'CAL-6789', motorista: 'Marcos Lima',    combustivel: 'Diesel Comum',      litros: 48, valorUnitario: 5.75, valor: 276.00, status: 'faturado' },
  { codigo: 'FL-BB2-2B9', posto: 'shell-norte',  data: '27/02/2026', empresa: 'TransLog Transportes',  cnpj: '00.000.000/0001-00', responsavel: 'João Silva',      telefone: '(11) 99000-0001', email: 'joao@translog.com.br',     veiculo: 'GHI-9012', motorista: 'Carlos Santos',   combustivel: 'Gasolina Comum',    litros: 33, valorUnitario: 5.51, valor: 181.83, status: 'faturado' },

  // ── Março 2026 ────────────────────────────────────────────────
  { codigo: 'FL-XK9-3P2', posto: 'shell-centro', data: '01/03/2026', empresa: 'TransLog Transportes',  cnpj: '00.000.000/0001-00', responsavel: 'João Silva',      telefone: '(11) 99000-0001', email: 'joao@translog.com.br',     veiculo: 'JKL-3456', motorista: 'Rafael Melo',     combustivel: 'Diesel S-10',       litros: 72, valorUnitario: 6.39, valor: 460.08, status: 'faturado' },
  { codigo: 'FL-PL1-2C6', posto: 'shell-norte',  data: '02/03/2026', empresa: 'TransLog Transportes',  cnpj: '00.000.000/0001-00', responsavel: 'João Silva',      telefone: '(11) 99000-0001', email: 'joao@translog.com.br',     veiculo: 'JKL-3456', motorista: 'Rafael Melo',     combustivel: 'Diesel S-10',       litros: 72, valorUnitario: 6.39, valor: 460.08, status: 'faturado' },
  { codigo: 'FL-RN2-7P1', posto: 'shell-centro', data: '03/03/2026', empresa: 'Construtora Alpha',      cnpj: '22.222.222/0001-22', responsavel: 'Marcos Oliveira', telefone: '(31) 97222-2222', email: 'marcos@alpha.com.br',     veiculo: 'CAL-5678', motorista: 'Pedro Gomes',    combustivel: 'Gasolina Comum',    litros: 35, valorUnitario: 5.57, valor: 194.95, status: 'faturado' },
  { codigo: 'FL-HJ8-6M3', posto: 'shell-norte',  data: '03/03/2026', empresa: 'LogBR Express',          cnpj: '11.111.111/0001-11', responsavel: 'Beatriz Rocha',   telefone: '(21) 98111-1111', email: 'beatriz@logbr.com.br',    veiculo: 'LBR-5566', motorista: 'Diego Pires',    combustivel: 'Diesel S-10',       litros: 55, valorUnitario: 6.39, valor: 351.45, status: 'faturado' },
  { codigo: 'FL-ZW6-9N4', posto: 'shell-centro', data: '04/03/2026', empresa: 'TransLog Transportes',  cnpj: '00.000.000/0001-00', responsavel: 'João Silva',      telefone: '(11) 99000-0001', email: 'joao@translog.com.br',     veiculo: 'ABC-1234', motorista: 'Carlos Santos',   combustivel: 'Diesel S-10',       litros: 50, valorUnitario: 6.39, valor: 319.50, status: 'faturado' },
  { codigo: 'FL-SX9-0G5', posto: 'shell-norte',  data: '05/03/2026', empresa: 'Construtora Alpha',      cnpj: '22.222.222/0001-22', responsavel: 'Marcos Oliveira', telefone: '(31) 97222-2222', email: 'marcos@alpha.com.br',     veiculo: 'CAL-5678', motorista: 'Pedro Gomes',    combustivel: 'Gasolina Comum',    litros: 28, valorUnitario: 5.57, valor: 155.96, status: 'faturado' },
  { codigo: 'FL-OT1-4L6', posto: 'shell-centro', data: '05/03/2026', empresa: 'TransRota Logística',   cnpj: '44.444.444/0001-44', responsavel: 'Robson Freitas', telefone: '(41) 95444-4444', email: 'robson@transrota.com.br', veiculo: 'TRL-9988', motorista: 'Robson Freitas',  combustivel: 'Gasolina Aditivada',litros: 38, valorUnitario: 6.10, valor: 231.80, status: 'faturado' },
  { codigo: 'FL-BQ2-5T8', posto: 'shell-norte',  data: '07/03/2026', empresa: 'TransLog Transportes',  cnpj: '00.000.000/0001-00', responsavel: 'João Silva',      telefone: '(11) 99000-0001', email: 'joao@translog.com.br',     veiculo: 'DEF-5678', motorista: 'Ana Costa',       combustivel: 'Diesel S-10',       litros: 65, valorUnitario: 6.39, valor: 415.35, status: 'faturado' },
  { codigo: 'FL-GF3-5J8', posto: 'shell-centro', data: '07/03/2026', empresa: 'Turbo Fretes',           cnpj: '33.333.333/0001-33', responsavel: 'Cláudia Mendes', telefone: '(85) 96333-3333', email: 'claudia@turbofretes.com.br', veiculo: 'TFR-8901', motorista: 'Claudia Sousa', combustivel: 'Gasolina Comum',    litros: 25, valorUnitario: 5.57, valor: 139.25, status: 'faturado' },
  { codigo: 'FL-KB7-9Q2', posto: 'shell-norte',  data: '08/03/2026', empresa: 'TransRota Logística',   cnpj: '44.444.444/0001-44', responsavel: 'Robson Freitas', telefone: '(41) 95444-4444', email: 'robson@transrota.com.br', veiculo: 'TRL-2345', motorista: 'João Batista',   combustivel: 'Diesel S-10',       litros: 55, valorUnitario: 6.39, valor: 351.45, status: 'pendente' },
  { codigo: 'FL-YC4-3B7', posto: 'shell-centro', data: '08/03/2026', empresa: 'Construtora Alpha',      cnpj: '22.222.222/0001-22', responsavel: 'Marcos Oliveira', telefone: '(31) 97222-2222', email: 'marcos@alpha.com.br',     veiculo: 'CAL-6789', motorista: 'Marcos Lima',    combustivel: 'Diesel Comum',      litros: 50, valorUnitario: 5.80, valor: 290.00, status: 'contestado' },
  { codigo: 'FL-WD6-2H4', posto: 'shell-norte',  data: '09/03/2026', empresa: 'Turbo Fretes',           cnpj: '33.333.333/0001-33', responsavel: 'Cláudia Mendes', telefone: '(85) 96333-3333', email: 'claudia@turbofretes.com.br', veiculo: 'TFR-3456', motorista: 'Raimundo Neto', combustivel: 'Etanol',            litros: 40, valorUnitario: 3.50, valor: 140.00, status: 'pendente' },
  { codigo: 'FL-UT7-4D2', posto: 'shell-centro', data: '09/03/2026', empresa: 'LogBR Express',          cnpj: '11.111.111/0001-11', responsavel: 'Beatriz Rocha',   telefone: '(21) 98111-1111', email: 'beatriz@logbr.com.br',    veiculo: 'LBR-7777', motorista: 'Ana Fernandes',  combustivel: 'Diesel S-10',       litros: 80, valorUnitario: 6.39, valor: 511.20, status: 'pendente' },
  { codigo: 'FL-MM4-7R1', posto: 'shell-norte',  data: '10/03/2026', empresa: 'TransLog Transportes',  cnpj: '00.000.000/0001-00', responsavel: 'João Silva',      telefone: '(11) 99000-0001', email: 'joao@translog.com.br',     veiculo: 'GHI-9012', motorista: 'Carlos Santos',   combustivel: 'Gasolina Comum',    litros: 30, valorUnitario: 5.57, valor: 167.10, status: 'pendente' },
  { codigo: 'FL-XK9-3P3', posto: 'shell-centro', data: '11/03/2026', empresa: 'TransLog Transportes',  cnpj: '00.000.000/0001-00', responsavel: 'João Silva',      telefone: '(11) 99000-0001', email: 'joao@translog.com.br',     veiculo: 'ABC-1234', motorista: 'Carlos Santos',   combustivel: 'Diesel S-10',       litros: 45, valorUnitario: 6.39, valor: 287.55, status: 'pendente' },
  { codigo: 'FL-QA3-8F5', posto: 'shell-norte',  data: '11/03/2026', empresa: 'LogBR Express',          cnpj: '11.111.111/0001-11', responsavel: 'Beatriz Rocha',   telefone: '(21) 98111-1111', email: 'beatriz@logbr.com.br',    veiculo: 'LBR-9999', motorista: 'Sandro Mota',    combustivel: 'Diesel S-10',       litros: 60, valorUnitario: 6.39, valor: 383.40, status: 'pendente' },
  { codigo: 'FL-EV5-1K9', posto: 'shell-centro', data: '12/03/2026', empresa: 'LogBR Express',          cnpj: '11.111.111/0001-11', responsavel: 'Beatriz Rocha',   telefone: '(21) 98111-1111', email: 'beatriz@logbr.com.br',    veiculo: 'LBR-1234', motorista: 'Fernanda Ramos', combustivel: 'Diesel S-10',       litros: 70, valorUnitario: 6.39, valor: 447.30, status: 'pendente' },
]

/* ─── Helpers de data ─────────────────────────────────────────── */

/** "dd/MM/yyyy" → Date */
export function parseDataBR(str: string): Date {
  const [d, m, y] = str.split('/').map(Number)
  return new Date(y, m - 1, d)
}

/** "yyyy-MM-dd" → Date */
export function parseDataISO(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Formata label do período selecionado */
export function labelPeriodo(inicio: string, fim: string): string {
  const fmt = (s: string) => {
    const [y, m, d] = s.split('-')
    return `${d}/${m}/${y}`
  }
  return `${fmt(inicio)} a ${fmt(fim)}`
}

/** Filtra abastecimentos pelo intervalo (datas em "yyyy-MM-dd") */
export function filtrarPorIntervalo(dados: Abastecimento[], inicio: string, fim: string): Abastecimento[] {
  const di = parseDataISO(inicio)
  const df = parseDataISO(fim)
  df.setHours(23, 59, 59)
  return dados.filter((a) => {
    const da = parseDataBR(a.data)
    return da >= di && da <= df
  })
}

/** Filtra abastecimentos por posto ('todos' retorna tudo) */
export function filtrarPorPosto(dados: Abastecimento[], postoId: string): Abastecimento[] {
  if (postoId === 'todos') return dados
  return dados.filter((a) => a.posto === postoId)
}

/* ─── Agrupamentos ────────────────────────────────────────────── */

export function agruparPorEmpresa(dados: Abastecimento[]) {
  const mapa: Record<string, {
    empresa: string; cnpj: string; responsavel: string; telefone: string; email: string
    abastecimentos: number; litros: number; valor: number; pendente: number; faturado: number; contestado: number
  }> = {}
  for (const a of dados) {
    if (!mapa[a.empresa]) {
      mapa[a.empresa] = { empresa: a.empresa, cnpj: a.cnpj, responsavel: a.responsavel, telefone: a.telefone, email: a.email, abastecimentos: 0, litros: 0, valor: 0, pendente: 0, faturado: 0, contestado: 0 }
    }
    mapa[a.empresa].abastecimentos++
    mapa[a.empresa].litros += a.litros
    mapa[a.empresa].valor += a.valor
    mapa[a.empresa][a.status] += a.valor
  }
  return Object.values(mapa).sort((a, b) => b.valor - a.valor)
}

export function agruparPorCombustivel(dados: Abastecimento[]) {
  const mapa: Record<string, { combustivel: string; abastecimentos: number; litros: number; valor: number }> = {}
  for (const a of dados) {
    if (!mapa[a.combustivel]) mapa[a.combustivel] = { combustivel: a.combustivel, abastecimentos: 0, litros: 0, valor: 0 }
    mapa[a.combustivel].abastecimentos++
    mapa[a.combustivel].litros += a.litros
    mapa[a.combustivel].valor += a.valor
  }
  return Object.values(mapa).sort((a, b) => b.litros - a.litros)
}

export function empresaSlug(nome: string) {
  return encodeURIComponent(nome.toLowerCase().replace(/\s+/g, '-'))
}

export function slugToEmpresa(slug: string) {
  return decodeURIComponent(slug).replace(/-/g, ' ')
}

export const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
