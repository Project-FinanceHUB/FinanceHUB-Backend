import supabase from '../config/supabase'
import { AuthCodeRequest, VerifyCodeRequest } from '../types/auth'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import * as jose from 'jose'
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

      if (alg === 'HS256') {
        const secret = process.env.SUPABASE_JWT_SECRET
        if (!secret) return null
        const verified = jwt.verify(token, secret, {
          algorithms: ['HS256'],
          audience: 'authenticated',
        }) as SupabaseJwtPayload
        return verified
      }

      if ((alg === 'ES256' || alg === 'RS256') && iss) {
        const jwksUrl = `${iss.replace(/\/$/, '')}/.well-known/jwks.json`
        const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl))
        const { payload: verified } = await jose.jwtVerify(token, JWKS, {
          audience: 'authenticated',
        })
        return {
          sub: verified.sub as string,
          email: verified.email as string | undefined,
          role: verified.role as string | undefined,
          exp: verified.exp,
          aud: verified.aud as string | undefined,
        }
      }

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

    const { data: user, error: userError } = await supabase
      .from(USER_TABLE)
      .select('*')
      .eq('id', payload.sub)
      .maybeSingle()

    if (userError) throw new Error('Sessão inválida')
    const email = payload.email || (user?.email ?? '')

    // Se não existe em public.users (ex.: acabou de fazer signUp), retorna user mínimo para sync-profile criar
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
      userId: payload.sub,
      token,
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
      user: {
        id: user.id,
        nome: user.nome,
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
    const { data: existing } = await supabase
      .from(USER_TABLE)
      .select('*')
      .eq('id', authUserId)
      .maybeSingle()

    const payload = {
      id: authUserId,
      nome: (data.nome || email).trim(),
      email,
      role: data.role || 'usuario',
      ativo: true,
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      const { data: updated, error } = await supabase
        .from(USER_TABLE)
        .update({
          nome: payload.nome,
          role: payload.role,
          updated_at: payload.updated_at,
        })
        .eq('id', authUserId)
        .select()
        .single()
      if (error) throw new Error(error.message)
      return { user: { id: updated.id, nome: updated.nome, email: updated.email, role: updated.role } }
    }

    const { data: inserted, error } = await supabase
      .from(USER_TABLE)
      .insert({
        id: authUserId,
        nome: payload.nome,
        email: payload.email,
        role: payload.role,
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
