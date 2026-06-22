/**
 * Máscara e validação de CPF / CNPJ (incluindo o CNPJ ALFANUMÉRICO da Receita
 * Federal, válido a partir de jul/2026).
 *
 * - CPF:  000.000.000-00  (11 dígitos numéricos)
 * - CNPJ: 00.000.000/0000-00  (14 caracteres — 12 base alfanuméricos + 2 DV
 *   numéricos). Ref.: gov.br/receitafederal → CNPJ alfanumérico.
 *
 * No cálculo do DV do CNPJ alfanumérico, cada caractere vale (ASCII − 48):
 *   '0'..'9' → 0..9   e   'A'..'Z' → 17..42.  Para CNPJ puramente numérico o
 * resultado é idêntico ao algoritmo tradicional.
 */

/** Remove tudo que não for letra/dígito e põe em maiúsculo. */
export function limparDoc(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/** Aplica a máscara progressiva de CPF ou CNPJ conforme o que é digitado. */
export function maskCpfCnpj(value: string): string {
  let v = limparDoc(value)
  const temLetra = /[A-Z]/.test(v)

  // CPF: somente números e até 11 dígitos
  if (!temLetra && v.length <= 11) {
    v = v.slice(0, 11)
    let out = v.slice(0, 3)
    if (v.length > 3) out += '.' + v.slice(3, 6)
    if (v.length > 6) out += '.' + v.slice(6, 9)
    if (v.length > 9) out += '-' + v.slice(9, 11)
    return out
  }

  // CNPJ (numérico ou alfanumérico): 14 caracteres
  v = v.slice(0, 14)
  let out = v.slice(0, 2)
  if (v.length > 2) out += '.' + v.slice(2, 5)
  if (v.length > 5) out += '.' + v.slice(5, 8)
  if (v.length > 8) out += '/' + v.slice(8, 12)
  if (v.length > 12) out += '-' + v.slice(12, 14)
  return out
}

/** Valida CPF (11 dígitos, mod 11). */
export function isCpfValid(value: string): boolean {
  const d = value.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false

  let soma = 0
  for (let i = 0; i < 9; i++) soma += Number(d[i]) * (10 - i)
  let resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  if (resto !== Number(d[9])) return false

  soma = 0
  for (let i = 0; i < 10; i++) soma += Number(d[i]) * (11 - i)
  resto = (soma * 10) % 11
  if (resto === 10) resto = 0
  return resto === Number(d[10])
}

const PESO_CNPJ_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
const PESO_CNPJ_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

/** Valida CNPJ numérico OU alfanumérico (14 caracteres, DV numéricos). */
export function isCnpjValid(value: string): boolean {
  const c = limparDoc(value)
  if (c.length !== 14) return false
  if (!/^[0-9]{2}$/.test(c.slice(12))) return false // os 2 dígitos verificadores são numéricos
  if (/^(.)\1{13}$/.test(c)) return false           // rejeita todos os caracteres iguais

  const calcDV = (chars: string, pesos: number[]) => {
    let soma = 0
    for (let i = 0; i < pesos.length; i++) {
      soma += (chars.charCodeAt(i) - 48) * pesos[i]
    }
    const resto = soma % 11
    return resto < 2 ? 0 : 11 - resto
  }

  if (calcDV(c.slice(0, 12), PESO_CNPJ_1) !== Number(c[12])) return false
  return calcDV(c.slice(0, 13), PESO_CNPJ_2) === Number(c[13])
}

/** true se o valor for um CPF (11 dígitos) ou CNPJ (14) válido. */
export function isCpfCnpjValid(value: string): boolean {
  const v = limparDoc(value)
  if (!/[A-Z]/.test(v) && v.length <= 11) return isCpfValid(v)
  return isCnpjValid(v)
}

/** Comprimento esperado do documento conforme o que já foi digitado. */
export function tamanhoEsperado(value: string): number {
  const v = limparDoc(value)
  return !/[A-Z]/.test(v) && v.length <= 11 ? 11 : 14
}
