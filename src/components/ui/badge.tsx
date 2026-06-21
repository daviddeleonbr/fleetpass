import { cn } from '@/lib/utils'

type BadgeVariant = 'pendente' | 'ativo' | 'rejeitado' | 'expirado' | 'concluido' | 'inativo'

interface BadgeProps {
  variant: BadgeVariant
  children?: React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  pendente: 'bg-amber-100 text-amber-700 border border-amber-200',
  ativo: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  rejeitado: 'bg-red-100 text-red-700 border border-red-200',
  expirado: 'bg-gray-100 text-gray-600 border border-gray-200',
  concluido: 'bg-blue-100 text-blue-700 border border-blue-200',
  inativo: 'bg-gray-100 text-gray-500 border border-gray-200',
}

const variantLabels: Record<BadgeVariant, string> = {
  pendente: 'Pendente',
  ativo: 'Ativo',
  rejeitado: 'Rejeitado',
  expirado: 'Expirado',
  concluido: 'Concluído',
  inativo: 'Inativo',
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
        variantStyles[variant],
        className
      )}
    >
      {children ?? variantLabels[variant]}
    </span>
  )
}
