import prisma from '../config/database'
import { AuthCodeRequest, VerifyCodeRequest } from '../types/auth'
import crypto from 'crypto'
import { sendEmail, generateAuthCodeEmail } from '../utils/email'

export class AuthService {
  private readonly CODE_EXPIRY_MINUTES = 10
  private readonly MAX_ATTEMPTS = 5
  private readonly SESSION_EXPIRY_HOURS = 24 * 7 // 7 dias

  /**
   * Gera um código de 6 dígitos
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  /**
   * Gera um token de sessão
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Envia código de verificação por email
   */
  async sendAuthCode(data: AuthCodeRequest): Promise<{ code: string; expiresAt: Date }> {
    const { email } = data

    console.log(`[AuthService] Verificando usuário: ${email}`)

    // Verificar se usuário existe
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      console.log(`[AuthService] Usuário não encontrado: ${email}`)
      throw new Error('Usuário não encontrado. Entre em contato com o administrador.')
    }

    if (!user.ativo) {
      console.log(`[AuthService] Usuário inativo: ${email}`)
      throw new Error('Usuário inativo. Entre em contato com o administrador.')
    }

    console.log(`[AuthService] Usuário encontrado e ativo: ${email}`)

    // Invalidar códigos anteriores não usados
    await prisma.authCode.updateMany({
      where: {
        email,
        used: false,
        expiresAt: { gt: new Date() },
      },
      data: {
        used: true,
      },
    })

    // Gerar novo código
    const code = this.generateCode()
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + this.CODE_EXPIRY_MINUTES)

    console.log(`[AuthService] Gerando código para ${email}: ${code}`)

    // Salvar código no banco
    await prisma.authCode.create({
      data: {
        email,
        code,
        expiresAt,
      },
    })

    console.log(`[AuthService] Código salvo no banco para ${email}`)

    // Enviar email com o código
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
      // Em desenvolvimento, sempre mostra o código no console mesmo se falhar
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

  /**
   * Verifica código e cria sessão
   */
  async verifyCode(data: VerifyCodeRequest): Promise<{ token: string; user: any }> {
    const { email, code } = data

    console.log(`[AuthService] Verificando código para ${email}`)

    // Buscar código válido
    const authCode = await prisma.authCode.findFirst({
      where: {
        email,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    console.log(`[AuthService] Código encontrado:`, authCode ? 'Sim' : 'Não')

    if (!authCode) {
      console.log(`[AuthService] Código inválido ou expirado para ${email}`)
      // Incrementar tentativas de códigos inválidos
      await prisma.authCode.updateMany({
        where: {
          email,
          used: false,
          expiresAt: { gt: new Date() },
        },
        data: {
          attempts: { increment: 1 },
        },
      })

      throw new Error('Código inválido ou expirado')
    }

    // Verificar tentativas
    if (authCode.attempts >= this.MAX_ATTEMPTS) {
      await prisma.authCode.update({
        where: { id: authCode.id },
        data: { used: true },
      })
      throw new Error('Muitas tentativas inválidas. Solicite um novo código.')
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user || !user.ativo) {
      throw new Error('Usuário não encontrado ou inativo')
    }

    // Marcar código como usado
    await prisma.authCode.update({
      where: { id: authCode.id },
      data: { used: true },
    })

    // Criar sessão
    const token = this.generateToken()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + this.SESSION_EXPIRY_HOURS)

    console.log(`[AuthService] Criando sessão para usuário ${user.id}`)

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
      include: {
        user: true,
      },
    })

    console.log(`[AuthService] Sessão criada: ${session.id}`)

    // Atualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { ultimoLogin: new Date() },
    })

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
   * Valida token de sessão
   */
  async validateSession(token: string): Promise<any> {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session) {
      throw new Error('Sessão inválida')
    }

    if (session.expiresAt < new Date()) {
      // Sessão expirada, deletar
      await prisma.session.delete({
        where: { id: session.id },
      })
      throw new Error('Sessão expirada')
    }

    if (!session.user.ativo) {
      throw new Error('Usuário inativo')
    }

    // Atualizar última atividade
    await prisma.session.update({
      where: { id: session.id },
      data: { lastActivity: new Date() },
    })

    return {
      id: session.id,
      userId: session.userId,
      token: session.token,
      expiresAt: session.expiresAt,
      user: {
        id: session.user.id,
        nome: session.user.nome,
        email: session.user.email,
        role: session.user.role,
      },
    }
  }

  /**
   * Encerra sessão
   */
  async logout(token: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { token },
    })
  }

  /**
   * Limpa códigos expirados (manutenção)
   */
  async cleanupExpiredCodes(): Promise<number> {
    const result = await prisma.authCode.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { used: true },
        ],
      },
    })
    return result.count
  }

  /**
   * Limpa sessões expiradas (manutenção)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    })
    return result.count
  }
}

export default new AuthService()
