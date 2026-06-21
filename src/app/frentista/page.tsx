import { redirect } from 'next/navigation'

// O login e o fluxo do frentista acontecem em /frentista/validar.
export default function FrentistaIndex() {
  redirect('/frentista/validar')
}
