import supabase from '../config/supabase'
import { CompanyCreateInput, CompanyUpdateInput } from '../types/company'
import { toCamel, toSnake } from '../utils/caseMap'

const TABLE = 'company'

function parseCnpjs(company: Record<string, unknown>) {
  const cnpjs = company.cnpjs
  return {
    ...company,
    cnpjs: typeof cnpjs === 'string' ? JSON.parse(cnpjs) : cnpjs,
  }
}

export class CompanyService {
  async findAll() {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data || []).map((row) => parseCnpjs(toCamel(row) as Record<string, unknown>))
  }

  async findById(id: string) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()

    if (error || !data) throw new Error('Empresa não encontrada')
    return parseCnpjs(toCamel(data) as Record<string, unknown>)
  }

  async create(data: CompanyCreateInput) {
    const row = toSnake({
      nome: data.nome,
      cnpjs: JSON.stringify(data.cnpjs),
      ativo: data.ativo !== undefined ? data.ativo : true,
    }) as Record<string, unknown>

    const { data: company, error } = await supabase.from(TABLE).insert(row).select().single()
    if (error) throw new Error(error.message)
    return parseCnpjs(toCamel(company) as Record<string, unknown>)
  }

  async update(id: string, data: CompanyUpdateInput) {
    await this.findById(id)

    const updateData: Record<string, unknown> = {}
    if (data.nome) updateData.nome = data.nome
    if (data.cnpjs) updateData.cnpjs = JSON.stringify(data.cnpjs)
    if (data.ativo !== undefined) updateData.ativo = data.ativo
    updateData.updated_at = new Date().toISOString()

    const { data: company, error } = await supabase.from(TABLE).update(updateData).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return parseCnpjs(toCamel(company) as Record<string, unknown>)
  }

  async delete(id: string) {
    await this.findById(id)
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { message: 'Empresa deletada com sucesso' }
  }
}

export default new CompanyService()
