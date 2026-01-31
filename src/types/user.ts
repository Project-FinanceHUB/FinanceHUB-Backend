export type UserRole = 'admin' | 'gerente' | 'usuario'

export interface User {
  id: string
  nome: string
  email: string
  role: UserRole
  ativo: boolean
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
}
