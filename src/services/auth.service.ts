import supabase from '../config/supabase'
import { AuthCodeRequest, VerifyCodeRequest } from '../types/auth'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { sendEmail, generateAuthCodeEmail } from '../utils/email'
import { toCamel } from '../utils/caseMap'

const USER_TABLE = 'users'
const AUTH_CODE_TABLE = 'auth_code'
const SESSION_TABLE = 'session'

/** Payload do JWT do Supabase Auth */
interface SupabaseJwtPayload {
  sub: string
  email?: string
  role?: string
  exp?: number
  aud?: string
}

export class AuthService {
  private readonly CODE_EXPIRY_MINUTES = 10
  private readonly MAX_ATTEMPTS = 5
  private readonly SESSION_EXPIRY_HOURS = 24 * 7 // 7 dias

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  async sendAuthCode(data: AuthCodeRequest): Promise<{ code: string; expiresAt: Date }> {
    const { email } = data

    console.log(`[AuthService] Verificando usuário: ${email}`)

    const { data: user, error: userError } = await supabase
      .from(USER_TABLE)
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (userError) throw new Error(userError.message)
    if (!user) {
      console.log(`[AuthService] Usuário não encontrado: ${email}`)
      throw new Error('Usuário não encontrado. Entre em contato com o administrador.')
    }

    if (!user.ativo) {
      console.log(`[AuthService] Usuário inativo: ${email}`)
      throw new Error('Usuário inativo. Entre em contato com o administrador.')
    }

    console.log(`[AuthService] Usuário encontrado e ativo: ${email}`)

    const now = new Date().toISOString()
    await supabase
      .from(AUTH_CODE_TABLE)
      .update({ used: true })
      .eq('email', email)
      .eq('used', false)
      .gt('expires_at', now)

    const code = this.generateCode()
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + this.CODE_EXPIRY_MINUTES)

    console.log(`[AuthService] Gerando código para ${email}: ${code}`)

    const { error: insertError } = await supabase.from(AUTH_CODE_TABLE).insert({
      email,
      code,
      expires_at: expiresAt.toISOString(),
    })

    if (insertError) throw new Error(insertError.message)
    console.log(`[AuthService] Código salvo no banco para ${email}`)

    try {
      const emailContent = generateAuthCodeEmail(code)
      await sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      })
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error)
      if (process.env.NODE_ENV === 'development') {
        console.log('\n' + '⚠'.repeat(35))
        console.log('⚠️  FALHA NO ENVIO DE EMAIL - CÓDIGO DE VERIFICAÇÃO')
        console.log('⚠'.repeat(35))
        console.log(`📧 Email: ${email}`)
        console.log(`🔑 Código: ${code}`)
        console.log(`⏰ Expira em: ${this.CODE_EXPIRY_MINUTES} minutos`)
        console.log('⚠'.repeat(35) + '\n')
      }
    }

    return { code, expiresAt }
  }

  async verifyCode(data: VerifyCodeRequest): Promise<{ token: string; user: any }> {
    const { email, code } = data

    console.log(`[AuthService] Verificando código para ${email}`)

    const now = new Date().toISOString()
    const { data: authCodes, error: codeError } = await supabase
      .from(AUTH_CODE_TABLE)
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)

    if (codeError) throw new Error(codeError.message)
    const authCode = authCodes?.[0]

    console.log(`[AuthService] Código encontrado:`, authCode ? 'Sim' : 'Não')

    if (!authCode) {
      throw new Error('Código inválido ou expirado')
    }

    if ((authCode.attempts ?? 0) >= this.MAX_ATTEMPTS) {
      await supabase.from(AUTH_CODE_TABLE).update({ used: true }).eq('id', authCode.id)
      throw new Error('Muitas tentativas inválidas. Solicite um novo código.')
    }

    const { data: user, error: userError } = await supabase
      .from(USER_TABLE)
      .select('*')
      .eq('email', email)
      .single()

    if (userError || !user || !user.ativo) throw new Error('Usuário não encontrado ou inativo')

    await supabase.from(AUTH_CODE_TABLE).update({ used: true }).eq('id', authCode.id)

    const token = this.generateToken()
    const sessionExpiresAt = new Date()
    sessionExpiresAt.setHours(sessionExpiresAt.getHours() + this.SESSION_EXPIRY_HOURS)

    console.log(`[AuthService] Criando sessão para usuário ${user.id}`)

    const { data: session, error: sessionError } = await supabase
      .from(SESSION_TABLE)
      .insert({
        user_id: user.id,
        token,
        expires_at: sessionExpiresAt.toISOString(),
      })
      .select()
      .single()

    if (sessionError) throw new Error(sessionError.message)
    console.log(`[AuthService] Sessão criada: ${session.id}`)

    await supabase
      .from(USER_TABLE)
      .update({ ultimo_login: new Date().toISOString() })
      .eq('id', user.id)

    console.log(`[AuthService] Login realizado com sucesso para ${email}`)

    return {
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
      },
    }
  }

  /**
   * Valida JWT emitido pelo Supabase Auth (login com email/senha).
   * Suporta HS256 (JWT Secret legado) e ES256/RS256 (chaves assimétricas via JWKS).
   */
  async validateSupabaseJwt(token: string): Promise<SupabaseJwtPayload | null> {
    try {
      const decoded = jwt.decode(token, { complete: true })
      if (!decoded || typeof decoded !== 'object' || !decoded.payload || typeof decoded.payload !== 'object')
        return null
      const payload = decoded.payload as Record<string, unknown>
      const alg = decoded.header?.alg
      const iss = typeof payload.iss === 'string' ? payload.iss : null
      const exp = typeof payload.exp === 'number' ? payload.exp : null
      if (exp != null && exp < Math.floor(Date.now() / 1000)) {
        console.error('[Auth] JWT expirado, exp=', exp)
        return null
      }

      if (alg === 'HS256') {
        const secret = process.env.SUPABASE_JWT_SECRET
        if (!secret) {
          console.error('[Auth] SUPABASE_JWT_SECRET não definido (HS256)')
          return null
        }
        const verified = jwt.verify(token, secret, {
          algorithms: ['HS256'],
          audience: 'authenticated',
        }) as SupabaseJwtPayload
        return verified
      }

      if ((alg === 'ES256' || alg === 'RS256') && iss) {
        const jwksUrl = `${iss.replace(/\/$/, '')}/.well-known/jwks.json`
        const jose = await (Function('return import("jose")')() as Promise<typeof import('jose')>)
        const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl))
        // Verificar assinatura e exp; não exigir audience para compatibilidade com todos os projetos Supabase
        const { payload: verified } = await jose.jwtVerify(token, JWKS)
        return {
          sub: verified.sub as string,
          email: verified.email as string | undefined,
          role: verified.role as string | undefined,
          exp: verified.exp,
          aud: verified.aud as string | undefined,
        }
      }

      console.error('[Auth] Algoritmo não suportado ou iss ausente:', alg, iss)
      return null
    } catch (err: any) {
      console.error('[Auth] Falha ao validar JWT do Supabase:', err?.message || err)
      return null
    }
  }

  async validateSession(token: string): Promise<any> {
    // 1) Tentar token da tabela session (fluxo antigo código por email)
    const { data: session, error: sessionError } = await supabase
      .from(SESSION_TABLE)
      .select('*')
      .eq('token', token)
      .single()

    if (!sessionError && session) {
      const { data: user, error: userError } = await supabase
        .from(USER_TABLE)
        .select('*')
        .eq('id', session.user_id)
        .single()

      if (userError || !user) throw new Error('Sessão inválida')
      if (new Date(session.expires_at) < new Date()) {
        await supabase.from(SESSION_TABLE).delete().eq('id', session.id)
        throw new Error('Sessão expirada')
      }
      if (!user.ativo) throw new Error('Usuário inativo')

      await supabase
        .from(SESSION_TABLE)
        .update({ last_activity: new Date().toISOString() })
        .eq('id', session.id)

      return {
        id: session.id,
        userId: session.user_id,
        token: session.token,
        expiresAt: session.expires_at,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
          role: user.role,
        },
      }
    }

    // 2) Tentar JWT do Supabase Auth (login com email/senha)
    const payload = await this.validateSupabaseJwt(token)
    if (!payload) throw new Error('Sessão inválida ou expirada')

    const email = payload.email ?? ''
    const trimmed = email.trim()
    type UserRow = { id: string; nome: string; email: string; role: string; ativo: boolean; updated_at?: string }
    const { data: userById, error: userError } = await supabase
      .from(USER_TABLE)
      .select('*')
      .eq('id', payload.sub)
      .maybeSingle()

    if (userError) throw new Error('Sessão inválida')

    // Busca todos os registros com esse e-mail (pode haver mais de um) — sem maybeSingle para não falhar com duplicados
    const candidates: UserRow[] = []
    if (userById) candidates.push(userById as UserRow)
    if (trimmed) {
      const { data: byEmail } = await supabase.from(USER_TABLE).select('*').eq('email', trimmed)
      if (byEmail?.length) candidates.push(...(byEmail as UserRow[]))
      if (trimmed !== trimmed.toLowerCase()) {
        const { data: byEmailLower } = await supabase.from(USER_TABLE).select('*').eq('email', trimmed.toLowerCase())
        if (byEmailLower?.length) {
          for (const row of byEmailLower as UserRow[]) {
            if (!candidates.some((c) => c.id === row.id)) candidates.push(row)
          }
        }
      }
    }

    // Remove duplicados por id e escolhe o registro mais recente (updated_at) para sempre retornar o perfil editado
    const byId = new Map<string, UserRow>()
    for (const row of candidates) {
      if (!row.ativo) continue
      const existing = byId.get(row.id)
      const rowUpdated = row.updated_at ? new Date(row.updated_at).getTime() : 0
      const existingUpdated = existing?.updated_at ? new Date(existing.updated_at).getTime() : 0
      if (!existing || rowUpdated > existingUpdated) byId.set(row.id, row)
    }
    const sorted = [...byId.values()].sort((a, b) => {
      const ta = a.updated_at ? new Date(a.updated_at).getTime() : 0
      const tb = b.updated_at ? new Date(b.updated_at).getTime() : 0
      return tb - ta
    })
    const user = sorted[0]

    // Se ainda não existe em public.users, retorna user mínimo para sync-profile criar
    if (!user) {
      return {
        id: payload.sub,
        userId: payload.sub,
        token,
        expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
        user: {
          id: payload.sub,
          nome: '',
          email: email || '',
          role: 'usuario',
        },
      }
    }
    if (!user.ativo) throw new Error('Usuário inativo')

    return {
      id: payload.sub,
      userId: user.id,
      token,
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
      user: {
        id: user.id,
        nome: user.nome ?? '',
        email: user.email,
        role: user.role,
      },
    }
  }

  /**
   * Cadastra usuário pelo backend (API Admin). Cria em auth.users com email já confirmado,
   * sem enviar e-mail de confirmação. Depois cria/atualiza public.users.
   */
  async registerWithPassword(data: {
    nome: string
    email: string
    password: string
    role?: string
  }): Promise<{ user: any }> {
    const { nome, email, password, role } = data
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { nome: nome.trim(), role: role || 'usuario' },
    })
    if (createError) throw new Error(createError.message)
    const authUser = authData?.user
    if (!authUser?.id) throw new Error('Erro ao criar usuário no sistema de autenticação.')

    const result = await this.syncProfileFromSupabase(authUser.id, authUser.email || email, {
      nome: nome.trim(),
      role: role || 'usuario',
    })
    return result
  }

  /**
   * Sincroniza perfil do usuário após signUp no Supabase Auth.
   * Cria ou atualiza registro em public.users com id = auth.user.id.
   */
  async syncProfileFromSupabase(
    authUserId: string,
    email: string,
    data: { nome: string; role?: string }
  ): Promise<{ user: any }> {
    const normalizedEmail = email.trim().toLowerCase()
    const nome = (data.nome || email).trim()
    const role = data.role || 'usuario'
    const updatedAt = new Date().toISOString()

    const { data: existingById } = await supabase
      .from(USER_TABLE)
      .select('*')
      .eq('id', authUserId)
      .maybeSingle()

    if (existingById) {
      const { data: updated, error } = await supabase
        .from(USER_TABLE)
        .update({ nome, role, updated_at: updatedAt })
        .eq('id', authUserId)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return { user: { id: updated.id, nome: updated.nome, email: updated.email, role: updated.role } }
    }

    // Evita duplicate key: se já existe usuário com este e-mail (outro id), apenas atualiza
    const { data: existingByEmail } = await supabase
      .from(USER_TABLE)
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingByEmail) {
      const { data: updated, error } = await supabase
        .from(USER_TABLE)
        .update({ nome, role, updated_at: updatedAt })
        .eq('id', existingByEmail.id)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return { user: { id: updated.id, nome: updated.nome, email: updated.email, role: updated.role } }
    }

    const { data: inserted, error } = await supabase
      .from(USER_TABLE)
      .insert({
        id: authUserId,
        nome,
        email: normalizedEmail,
        role,
        ativo: true,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return { user: { id: inserted.id, nome: inserted.nome, email: inserted.email, role: inserted.role } }
  }

  /**
   * Confirma o e-mail de um usuário pela API Admin (sem enviar e-mail).
   * Use para contas criadas pelo fluxo antigo que ficaram "não confirmadas".
   */
  async confirmUserByEmail(email: string): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.trim().toLowerCase()
    const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    if (error) throw new Error(error.message)
    const user = data?.users?.find((u) => (u.email || '').toLowerCase() === normalizedEmail)
    if (!user) throw new Error('Usuário não encontrado com este e-mail.')
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    })
    if (updateError) throw new Error(updateError.message)
    return { success: true, message: 'E-mail confirmado. O usuário já pode fazer login.' }
  }

  async logout(token: string): Promise<void> {
    await supabase.from(SESSION_TABLE).delete().eq('token', token)
  }

  async cleanupExpiredCodes(): Promise<number> {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from(AUTH_CODE_TABLE)
      .delete()
      .or(`expires_at.lt.${now},used.eq.true`)
      .select('id')

    if (error) return 0
    return data?.length ?? 0
  }

  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from(SESSION_TABLE)
      .delete()
      .lt('expires_at', now)
      .select('id')

    if (error) return 0
    return data?.length ?? 0
  }
}

export default new AuthService()
