import supabase from '../config/supabase'
import { UserCreateInput, UserUpdateInput } from '../types/user'
import { sendEmail, generateWelcomeEmail } from '../utils/email'
import { toCamel, toSnake } from '../utils/caseMap'

const TABLE = 'users'

export class UserService {
  async findAll() {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return (data || []).map((row) => toCamel(row))
  }

  async findById(id: string) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()

    if (error || !data) throw new Error('Usuário não encontrado')
    return toCamel(data)
  }

  async findByEmail(email: string) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('email', email).maybeSingle()
    if (error) throw new Error(error.message)
    return data ? toCamel(data) : null
  }

  async create(data: UserCreateInput) {
    const existing = await this.findByEmail(data.email)
    if (existing) throw new Error('E-mail já cadastrado')

    const row = toSnake({
      nome: data.nome,
      email: data.email,
      role: data.role || 'usuario',
      ativo: data.ativo !== undefined ? data.ativo : true,
    }) as Record<string, unknown>

    const { data: user, error } = await supabase.from(TABLE).insert(row).select().single()

    if (error) throw new Error(error.message)
    const created = toCamel<{ nome: string; email: string; role: string }>(user)

    try {
      const emailContent = generateWelcomeEmail(created.nome, created.email, created.role)
      await sendEmail({
        to: created.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      })
      console.log(`[UserService] Email de boas-vindas enviado para ${created.email}`)
    } catch (err) {
      console.error('Erro ao enviar email de boas-vindas:', err)
    }

    return created
  }

  async update(id: string, data: UserUpdateInput) {
    const user = (await this.findById(id)) as { email?: string }
    if (data.email && data.email !== user.email) {
      const existing = await this.findByEmail(data.email)
      if (existing) throw new Error('E-mail já cadastrado')
    }

    const row = toSnake({ ...data, updatedAt: new Date() }) as Record<string, unknown>
    const { data: updated, error } = await supabase.from(TABLE).update(row).eq('id', id).select().single()

    if (error) throw new Error(error.message)
    return toCamel(updated)
  }

  async delete(id: string) {
    await this.findById(id)
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw new Error(error.message)
    return { message: 'Usuário deletado com sucesso' }
  }

  async updateLastLogin(id: string) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ultimo_login: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return toCamel(data)
  }
}

export default new UserService()
