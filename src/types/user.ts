export type UserRole = 'admin' | 'gerente' | 'usuario'

export interface User {
  id: string
  nome: string
  email: string
  role: UserRole
  ativo: boolean
  telefone?: string
  cargo?: string
  ultimoLogin?: string
  createdAt?: string
  updatedAt?: string
}

export interface UserCreateInput {
  nome: string
  email: string
  role?: UserRole
  ativo?: boolean
}

export interface UserUpdateInput {
  nome?: string
  email?: string
  role?: UserRole
  ativo?: boolean
  telefone?: string | null
  cargo?: string | null
}

/** Campos editáveis no "Meu Perfil" (sem email) */
export interface ProfileUpdateInput {
  nome?: string
  telefone?: string | null
  cargo?: string | null
}
