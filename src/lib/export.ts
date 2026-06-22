import { formatBRL } from './relatorios-data'

/* ─── Excel ─────────────────────────────────────────────────── */

export async function exportarExcel(
  colunas: string[],
  linhas: (string | number)[][],
  nomeArquivo: string,
  nomeAba = 'Relatório',
) {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.aoa_to_sheet([colunas, ...linhas])

  // Largura automática por coluna
  const colWidths = colunas.map((_, ci) => ({
    wch: Math.max(
      colunas[ci].length,
      ...linhas.map((r) => String(r[ci] ?? '').length),
    ) + 2,
  }))
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, nomeAba)
  XLSX.writeFile(wb, `${nomeArquivo}.xlsx`)
}

/* ─── PDF ────────────────────────────────────────────────────── */

interface PDFConfig {
  titulo: string
  subtitulo: string
  periodo: string
  colunas: string[]
  linhas: (string | number)[][]
  totais?: { label: string; valor: string }[]
  nomeArquivo: string
}

export async function exportarPDF({
  titulo,
  subtitulo,
  periodo,
  colunas,
  linhas,
  totais,
  nomeArquivo,
}: PDFConfig) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()

  // ── Header background
  doc.setFillColor(15, 23, 42) // gray-950
  doc.rect(0, 0, W, 30, 'F')

  // ── Logo placeholder
  doc.setFillColor(37, 99, 235) // blue-600
  doc.roundedRect(10, 7, 16, 16, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('FL', 18, 17, { align: 'center' })

  // ── Título
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('FuelLink', 30, 13)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(156, 163, 175)
  doc.text('Marketplace de Abastecimento B2B', 30, 19)

  // ── Nome do relatório (direita do header)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(titulo, W - 10, 13, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(156, 163, 175)
  doc.text(subtitulo, W - 10, 19, { align: 'right' })

  // ── Linha de info
  doc.setFillColor(241, 245, 249)
  doc.rect(0, 30, W, 10, 'F')
  doc.setTextColor(71, 85, 105)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Posto: Shell — Centro  ·  CNPJ: 00.000.000/0002-00  ·  Período: ${periodo}`, 10, 36)
  const gerado = `Gerado em: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`
  doc.text(gerado, W - 10, 36, { align: 'right' })

  // ── Tabela
  autoTable(doc, {
    startY: 44,
    head: [colunas],
    body: linhas.map((row) => row.map(String)),
    styles: {
      fontSize: 8,
      cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      [colunas.length - 1]: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 10, right: 10 },
  })

  // ── Totais
  if (totais?.length) {
    const finalY = (doc as any).lastAutoTable.finalY + 6
    let x = W - 10
    const boxH = 9
    const boxPad = 6

    for (let i = totais.length - 1; i >= 0; i--) {
      const { label, valor } = totais[i]
      const boxW = doc.getTextWidth(valor) + doc.getTextWidth(label) + boxPad * 3 + 8
      x -= boxW + 3

      doc.setFillColor(i === 0 ? 37 : 241, i === 0 ? 99 : 245, i === 0 ? 235 : 249)
      doc.roundedRect(x, finalY, boxW, boxH, 1.5, 1.5, 'F')

      doc.setTextColor(i === 0 ? 255 : 71, i === 0 ? 255 : 85, i === 0 ? 255 : 105)
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'normal')
      doc.text(label, x + boxPad, finalY + 6)
      doc.setFont('helvetica', 'bold')
      doc.text(valor, x + boxW - boxPad, finalY + 6, { align: 'right' })
    }
  }

  // ── Rodapé em todas as páginas
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFillColor(241, 245, 249)
    doc.rect(0, doc.internal.pageSize.getHeight() - 8, W, 8, 'F')
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.setFont('helvetica', 'normal')
    doc.text('FuelLink — Relatório Confidencial. Uso interno.', 10, doc.internal.pageSize.getHeight() - 3)
    doc.text(`Página ${i} de ${pageCount}`, W - 10, doc.internal.pageSize.getHeight() - 3, { align: 'right' })
  }

  doc.save(`${nomeArquivo}.pdf`)
}

/* ─── PDF Extrato de Faturamento por Empresa ─────────────────── */

export interface ExtratoEmpresaConfig {
  empresa: string
  cnpj: string
  responsavel: string
  email: string
  telefone: string
  periodo: string
  totalGeral: number
  totalPendente: number
  totalFaturado: number
  totalContestado: number
  totalLitros: number
  abastecimentos: {
    codigo: string; data: string; veiculo: string; motorista: string
    combustivel: string; litros: number; valorUnitario: number; valor: number; status: string
  }[]
  porVeiculo: { veiculo: string; abastecimentos: number; litros: number; valor: number }[]
  porCombustivel: { combustivel: string; abastecimentos: number; litros: number; valor: number }[]
  nomeArquivo: string
}

export async function exportarExtrato(cfg: ExtratoEmpresaConfig) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  // ── Header escuro
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, W, 38, 'F')

  // Logo
  doc.setFillColor(37, 99, 235)
  doc.roundedRect(10, 8, 14, 14, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('FL', 17, 17, { align: 'center' })

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('FuelLink', 27, 14)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text('Extrato de Faturamento', 27, 20)

  // Título direita
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('EXTRATO DE FATURAMENTO', W - 10, 14, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text(`Período: ${cfg.periodo}`, W - 10, 20, { align: 'right' })
  doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, W - 10, 26, { align: 'right' })

  // ── Bloco empresa (abaixo do header)
  doc.setFillColor(248, 250, 252)
  doc.rect(0, 38, W, 28, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(0, 66, W, 66)

  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('EMPRESA PARCEIRA', 10, 46)

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(cfg.empresa, 10, 53)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text(`CNPJ: ${cfg.cnpj}`, 10, 59)
  doc.text(`Responsável: ${cfg.responsavel}  ·  ${cfg.email}  ·  ${cfg.telefone}`, 10, 64.5)

  // ── Bloco Posto (direita)
  doc.setTextColor(100, 116, 139)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('POSTO EMISSOR', W - 10, 46, { align: 'right' })
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Shell — Centro', W - 10, 53, { align: 'right' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(71, 85, 105)
  doc.text('CNPJ: 00.000.000/0002-00', W - 10, 59, { align: 'right' })
  doc.text('Av. Paulista, 1000 · São Paulo, SP', W - 10, 64.5, { align: 'right' })

  // ── Cards de resumo financeiro
  const cards = [
    { label: 'Total do Período', value: formatBRL(cfg.totalGeral), color: [15, 23, 42] as [number, number, number] },
    { label: 'A Faturar', value: formatBRL(cfg.totalPendente), color: [180, 83, 9] as [number, number, number] },
    { label: 'Validadas', value: formatBRL(cfg.totalFaturado), color: [5, 150, 105] as [number, number, number] },
    { label: 'Contestado', value: formatBRL(cfg.totalContestado), color: [220, 38, 38] as [number, number, number] },
  ]

  const cardW = (W - 20 - 9) / 4
  cards.forEach((c, i) => {
    const x = 10 + i * (cardW + 3)
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, 70, cardW, 18, 2, 2, 'FD')

    doc.setFontSize(6.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(c.label.toUpperCase(), x + cardW / 2, 76, { align: 'center' })

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...c.color)
    doc.text(c.value, x + cardW / 2, 83, { align: 'center' })
  })

  // ── Tabela principal: todos os abastecimentos
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('Abastecimentos realizados no período', 10, 97)

  const statusLabel: Record<string, string> = { pendente: 'Pendente', faturado: 'Faturado', contestado: 'Contestado' }

  autoTable(doc, {
    startY: 100,
    head: [['Código', 'Data', 'Veículo', 'Motorista', 'Combustível', 'Litros', 'R$/L', 'Total', 'Status']],
    body: cfg.abastecimentos.map((a) => [
      a.codigo, a.data, a.veiculo, a.motorista, a.combustivel,
      `${a.litros} L`, formatBRL(a.valorUnitario), formatBRL(a.valor),
      statusLabel[a.status] ?? a.status,
    ]),
    styles: { fontSize: 7.5, cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 }, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.2 },
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { font: 'courier', fontSize: 7 },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
      8: { halign: 'center' },
    },
    didDrawCell: (data) => {
      if (data.column.index === 8 && data.section === 'body') {
        const raw = cfg.abastecimentos[data.row.index]?.status
        if (raw === 'pendente') doc.setTextColor(180, 83, 9)
        else if (raw === 'faturado') doc.setTextColor(5, 150, 105)
        else if (raw === 'contestado') doc.setTextColor(220, 38, 38)
      }
    },
    margin: { left: 10, right: 10 },
  })

  const afterTable = (doc as any).lastAutoTable.finalY + 8

  // ── Duas mini-tabelas lado a lado: por veículo e por combustível
  const halfW = (W - 25) / 2

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('Por veículo', 10, afterTable)
  doc.text('Por combustível', 15 + halfW, afterTable)

  autoTable(doc, {
    startY: afterTable + 3,
    head: [['Veículo', 'Qtd.', 'Litros', 'Total']],
    body: cfg.porVeiculo.map((v) => [v.veiculo, v.abastecimentos, `${v.litros} L`, formatBRL(v.valor)]),
    styles: { fontSize: 7.5, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.2 },
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 10, right: 15 + halfW },
  })

  autoTable(doc, {
    startY: afterTable + 3,
    head: [['Combustível', 'Qtd.', 'Litros', 'Total']],
    body: cfg.porCombustivel.map((c) => [c.combustivel, c.abastecimentos, `${c.litros} L`, formatBRL(c.valor)]),
    styles: { fontSize: 7.5, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 }, textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.2 },
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 15 + halfW, right: 10 },
  })

  // ── Linha de total final
  const finalY = Math.max((doc as any).lastAutoTable.finalY + 8, afterTable + 40)
  doc.setFillColor(15, 23, 42)
  doc.roundedRect(10, finalY, W - 20, 12, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`Total · ${cfg.abastecimentos.length} abastecimentos · ${cfg.totalLitros} L`, 16, finalY + 7.5)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(formatBRL(cfg.totalGeral), W - 15, finalY + 7.5, { align: 'right' })

  // ── Rodapé
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFillColor(241, 245, 249)
    doc.rect(0, H - 8, W, 8, 'F')
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.setFont('helvetica', 'normal')
    doc.text('FuelLink — Extrato confidencial. Uso exclusivo para fins de faturamento.', 10, H - 3)
    doc.text(`Página ${i} de ${pageCount}`, W - 10, H - 3, { align: 'right' })
  }

  doc.save(`${cfg.nomeArquivo}.pdf`)
}
