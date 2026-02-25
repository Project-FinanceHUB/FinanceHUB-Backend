import supabase from '../config/supabase'
import { CompanyCreateInput, CompanyUpdateInput } from '../types/company'
import { toCamel, toSnake } from '../utils/caseMap'

const TABLE = 'company'
const USER_COMPANY_TABLE = 'user_company'

function parseCnpjs(company: Record<string, unknown>) {
  const cnpjs = company.cnpjs
  return {
    ...company,
    cnpjs: typeof cnpjs === 'string' ? JSON.parse(cnpjs) : cnpjs,
  }
}

/** Retorna IDs de empresas às quais o usuário está vinculado (Gerente/Usuário). */
async function getLinkedCompanyIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from(USER_COMPANY_TABLE)
    .select('company_id')
    .eq('user_id', userId)
  if (error) return [] // tabela pode não existir ainda; fallback só por owner
  return (data || []).map((r: { company_id: string }) => r.company_id).filter(Boolean)
}

/** Retorna IDs de empresas vinculadas a um usuário (para API de usuário). */
export async function getCompanyIdsForUser(userId: string): Promise<string[]> {
  return getLinkedCompanyIds(userId)
}

/** Retorna mapa user_id -> company_ids[] para vários usuários (para listagem). */
export async function getCompanyIdsByUserIds(userIds: string[]): Promise<Record<string, string[]>> {
  if (userIds.length === 0) return {}
  const { data, error } = await supabase
    .from(USER_COMPANY_TABLE)
    .select('user_id, company_id')
    .in('user_id', userIds)
  if (error) return {}
  const map: Record<string, string[]> = {}
  for (const row of data || []) {
    const uid = (row as { user_id: string }).user_id
    const cid = (row as { company_id: string }).company_id
    if (!map[uid]) map[uid] = []
    map[uid].push(cid)
  }
  return map
}

export class CompanyService {
  /**
   * Lista empresas visíveis ao usuário:
   * - Administrador: empresas que criou (user_id = userId)
   * - Gerente/Usuário: empresas que criou OU às quais está vinculado (user_company)
   */
  async findAll(userId: string) {
    const linkedIds = await getLinkedCompanyIds(userId)

    const { data: owned, error: errOwned } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (errOwned) throw new Error(errOwned.message)
    const ownedList = (owned || []).map((row) => parseCnpjs(toCamel(row) as Record<string, unknown>))

    if (linkedIds.length === 0) return ownedList

    const ownedIds = new Set((owned || []).map((r: { id: string }) => r.id))
    const toFetch = linkedIds.filter((id) => !ownedIds.has(id))
    if (toFetch.length === 0) return ownedList

    const { data: linked, error: errLinked } = await supabase
      .from(TABLE)
      .select('*')
      .in('id', toFetch)
      .order('created_at', { ascending: false })

    if (errLinked) return ownedList
    const linkedList = (linked || []).map((row) => parseCnpjs(toCamel(row) as Record<string, unknown>))
    return [...ownedList, ...linkedList]
  }

  /**
   * Busca empresa por ID: permitido se for dono (user_id) ou vinculado (user_company).
   */
  async findById(id: string, userId: string) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()
    if (error || !data) throw new Error('Empresa não encontrada')

    const ownerId = (data as { user_id?: string }).user_id
    if (ownerId === userId) return parseCnpjs(toCamel(data) as Record<string, unknown>)

    const linkedIds = await getLinkedCompanyIds(userId)
    if (linkedIds.includes(id)) return parseCnpjs(toCamel(data) as Record<string, unknown>)

    throw new Error('Empresa não encontrada')
  }

  async create(data: CompanyCreateInput, userId: string) {
    const row = toSnake({
      nome: data.nome,
      cnpjs: JSON.stringify(data.cnpjs),
      ativo: data.ativo !== undefined ? data.ativo : true,
      userId,
    }) as Record<string, unknown>

    const { data: company, error } = await supabase.from(TABLE).insert(row).select().single()
    if (error) throw new Error(error.message)
    return parseCnpjs(toCamel(company) as Record<string, unknown>)
  }

  /** Atualiza empresa: apenas o dono (user_id) pode alterar. */
  async update(id: string, data: CompanyUpdateInput, userId: string) {
    await this.findById(id, userId)
    const { data: row } = await supabase.from(TABLE).select('user_id').eq('id', id).single()
    if (row?.user_id !== userId) throw new Error('Empresa não encontrada')

    const updateData: Record<string, unknown> = {}
    if (data.nome) updateData.nome = data.nome
    if (data.cnpjs) updateData.cnpjs = JSON.stringify(data.cnpjs)
    if (data.ativo !== undefined) updateData.ativo = data.ativo
    updateData.updated_at = new Date().toISOString()

    const { data: company, error } = await supabase
      .from(TABLE)
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return parseCnpjs(toCamel(company) as Record<string, unknown>)
  }

  /** Remove empresa: apenas o dono (user_id) pode excluir. */
  async delete(id: string, userId: string) {
    await this.findById(id, userId)
    const { data: row } = await supabase.from(TABLE).select('user_id').eq('id', id).single()
    if (row?.user_id !== userId) throw new Error('Empresa não encontrada')
    const { error } = await supabase.from(TABLE).delete().eq('id', id).eq('user_id', userId)
    if (error) throw new Error(error.message)
    return { message: 'Empresa deletada com sucesso' }
  }

  /**
   * Vincula um usuário a empresas (para perfis Gerente/Usuário visualizarem essas empresas).
   * Apenas empresas que o admin dono possui (user_id = adminId) são vinculadas.
   */
  async linkUserToCompanies(userId: string, companyIds: string[], adminId: string): Promise<void> {
    if (!companyIds?.length) return
    const validIds: string[] = []
    for (const cid of companyIds) {
      if (!cid) continue
      const { data } = await supabase.from(TABLE).select('id').eq('id', cid).eq('user_id', adminId).single()
      if (data?.id) validIds.push(cid)
    }
    if (validIds.length === 0) return
    await supabase.from(USER_COMPANY_TABLE).upsert(
      validIds.map((company_id) => ({ user_id: userId, company_id })),
      { onConflict: 'user_id,company_id' }
    )
  }

  /**
   * Substitui o vínculo do usuário com empresas (usado ao editar usuário).
   * Remove vínculos atuais e insere apenas companyIds cujas empresas pertencem ao adminId.
   */
  async replaceUserCompanies(userId: string, companyIds: string[], adminId: string): Promise<void> {
    await supabase.from(USER_COMPANY_TABLE).delete().eq('user_id', userId)
    if (!companyIds?.length) return
    const validIds: string[] = []
    for (const cid of companyIds) {
      if (!cid) continue
      const { data } = await supabase.from(TABLE).select('id').eq('id', cid).eq('user_id', adminId).single()
      if (data?.id) validIds.push(cid)
    }
    if (validIds.length === 0) return
    await supabase.from(USER_COMPANY_TABLE).insert(
      validIds.map((company_id) => ({ user_id: userId, company_id }))
    )
  }
}

export default new CompanyService()
