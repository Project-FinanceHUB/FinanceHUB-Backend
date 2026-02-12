import supabase from '../config/supabase'
import { MensagemCreateInput, MensagemUpdateInput } from '../types/mensagem'
import { toCamel, toSnake } from '../utils/caseMap'

const TABLE = 'mensagem'

export class MensagemService {
  async findAll(solicitacaoId?: string) {
    let query = supabase.from(TABLE).select('*').order('data_hora', { ascending: false })
    if (solicitacaoId) query = query.eq('solicitacao_id', solicitacaoId)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data || []).map((row) => toCamel(row))
  }

  async findById(id: string) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()
    if (error || !data) throw new Error('Mensagem não encontrada')
    return toCamel(data)
  }

  async create(data: MensagemCreateInput) {
    const row = toSnake({
      solicitacaoId: data.solicitacaoId,
      direcao: data.direcao,
      assunto: data.assunto,
      conteudo: data.conteudo,
      remetente: data.remetente,
      anexo: data.anexo,
      lida: false,
    }) as Record<string, unknown>

    const { data: mensagem, error } = await supabase.from(TABLE).insert(row).select().single()
    if (error) throw new Error(error.message)
    return toCamel(mensagem)
  }

  async update(id: string, data: MensagemUpdateInput) {
    await this.findById(id)
    const row = toSnake(data) as Record<string, unknown>
    const { data: updated, error } = await supabase.from(TABLE).update(row).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return toCamel(updated)
  }

  async markAsRead(id: string) {
    await this.findById(id)
    const { data, error } = await supabase.from(TABLE).update({ lida: true }).eq('id', id).select().single()
    if (error) throw new Error(error.message)
    return toCamel(data)
  }

  async markAllAsRead() {
    await supabase.from(TABLE).update({ lida: true }).eq('lida', false)
    return { message: 'Todas as mensagens foram marcadas como lidas' }
  }

  async delete(id: string) {
    await this.findById(id)
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { message: 'Mensagem deletada com sucesso' }
  }
}

export default new MensagemService()
