export type UserRole = 'empresa' | 'posto' | 'frentista' | 'admin'

export interface MockUser {
  email: string
  password: string
  role: UserRole
  name: string
  redirect: string
}

export const MOCK_USERS: MockUser[] = [
  {
    email: 'joao@translog.com.br',
    password: 'empresa123',
    role: 'empresa',
    name: 'João Silva — TransLog Transportes',
    redirect: '/empresa',
  },
  {
    email: 'maria@shellcentro.com.br',
    password: 'posto123',
    role: 'posto',
    name: 'Maria Gomes — Shell Centro',
    redirect: '/posto',
  },
  {
    email: 'roberto@shellcentro.com.br',
    password: 'frentista123',
    role: 'frentista',
    name: 'Roberto Alves — Frentista',
    redirect: '/frentista/validar',
  },
  {
    email: 'admin@fuellink.com.br',
    password: 'admin123',
    role: 'admin',
    name: 'Administrador — FuelLink',
    redirect: '/admin',
  },
]

export function authenticate(email: string, password: string): MockUser | null {
  return (
    MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    ) ?? null
  )
}
