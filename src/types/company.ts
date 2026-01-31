export interface Company {
  id: string
  nome: string
  cnpjs: string[] | string // Pode ser array ou string JSON
  ativo: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CompanyCreateInput {
  nome: string
  cnpjs: string[]
  ativo?: boolean
}

export interface CompanyUpdateInput {
  nome?: string
  cnpjs?: string[]
  ativo?: boolean
}
