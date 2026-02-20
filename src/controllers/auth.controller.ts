import { Request, Response } from 'express'
import authService from '../services/auth.service'
import { z } from 'zod'

const sendCodeSchema = z.object({
  email: z.string().email('E-mail inválido'),
})

const verifyCodeSchema = z.object({
  email: z.string().email('E-mail inválido'),
  code: z.string().length(6, 'Código deve ter 6 dígitos').regex(/^\d+$/, 'Código deve conter apenas números'),
})

const registerSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  role: z.enum(['admin', 'gerente', 'usuario']).optional(),
})

export class AuthController {
  /**
   * Envia código de verificação por email
   * POST /api/auth/send-code
   */
  async sendCode(req: Request, res: Response) {
    try {
      const data = sendCodeSchema.parse(req.body)
      const { code, expiresAt } = await authService.sendAuthCode(data)

      // Em desenvolvimento, retornamos o código (remover em produção!)
      const isDevelopment = process.env.NODE_ENV === 'development'

      res.status(200).json({
        message: 'Código de verificação enviado com sucesso',
        expiresIn: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
        ...(isDevelopment && { code }), // Apenas em desenvolvimento
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }

      console.error('Erro ao enviar código:', error)
      res.status(400).json({
        error: error.message || 'Erro ao enviar código de verificação',
      })
    }
  }

  /**
   * Verifica código e cria sessão
   * POST /api/auth/verify-code
   */
  async verifyCode(req: Request, res: Response) {
    try {
      const data = verifyCodeSchema.parse(req.body)
      const { token, user } = await authService.verifyCode(data)

      res.status(200).json({
        success: true,
        message: 'Código verificado com sucesso',
        token,
        user,
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }

      console.error('Erro ao verificar código:', error)
      res.status(400).json({
        success: false,
        error: error.message || 'Código inválido ou expirado',
      })
    }
  }

  /**
   * Valida token de sessão
   * GET /api/auth/validate
   */
  async validateSession(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token as string

      if (!token) {
        return res.status(401).json({
          error: 'Token não fornecido',
        })
      }

      const session = await authService.validateSession(token)

      res.json({
        valid: true,
        session,
      })
    } catch (error: any) {
      console.error('Erro ao validar sessão:', error)
      res.status(401).json({
        valid: false,
        error: error.message || 'Sessão inválida ou expirada',
      })
    }
  }

  /**
   * Encerra sessão
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response) {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') || req.body.token

      if (!token) {
        return res.status(400).json({
          error: 'Token não fornecido',
        })
      }

      await authService.logout(token)

      res.json({
        message: 'Logout realizado com sucesso',
      })
    } catch (error: any) {
      console.error('Erro ao fazer logout:', error)
      res.status(500).json({
        error: 'Erro ao fazer logout',
      })
    }
  }

  /**
   * Confirma o e-mail de um usuário pela API Admin (sem enviar e-mail).
   * POST /api/auth/confirm-user
   * Body: { email: string }
   * Header (opcional): x-confirm-secret = CONFIRM_USER_SECRET do .env (recomendado em produção)
   */
  async confirmUser(req: Request, res: Response) {
    try {
      const secret = process.env.CONFIRM_USER_SECRET
      if (secret) {
        const headerSecret = req.headers['x-confirm-secret']
        if (headerSecret !== secret) {
          return res.status(401).json({ error: 'Não autorizado.' })
        }
      } else if (process.env.NODE_ENV === 'production') {
        return res.status(501).json({
          error: 'Configure CONFIRM_USER_SECRET no .env para usar este endpoint em produção.',
        })
      }
      const schema = z.object({ email: z.string().email('E-mail inválido') })
      const { email } = schema.parse(req.body)
      const result = await authService.confirmUserByEmail(email)
      res.json(result)
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'E-mail inválido', details: error.errors })
      }
      console.error('Erro ao confirmar usuário:', error)
      res.status(400).json({ error: error.message || 'Erro ao confirmar usuário.' })
    }
  }

  /**
   * Cadastro pelo backend: cria usuário no Supabase já confirmado (sem e-mail de confirmação).
   * Cadastro público sempre cria como "usuario"; evita "User not allowed" por hooks que bloqueiam admin.
   * POST /api/auth/register
   * Body: { nome: string, email: string, password: string, role?: string }
   */
  async register(req: Request, res: Response) {
    try {
      const body = registerSchema.parse(req.body)
      const bodyAsUsuario = { ...body, role: 'usuario' as const }
      const result = await authService.registerWithPassword(bodyAsUsuario)
      res.status(201).json({
        success: true,
        message: 'Conta criada com sucesso. Faça login para entrar.',
        user: result.user,
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }
      if (error.message?.includes('already registered')) {
        return res.status(400).json({ error: 'Este e-mail já está cadastrado.' })
      }
      if (error.message?.includes('Bearer token') || error.message?.includes('valid Bearer')) {
        return res.status(500).json({
          error: 'Chave do Supabase incorreta. Use a chave service_role (secret) em SUPABASE_SERVICE_KEY no .env do backend. A chave anon/public não tem permissão para criar usuários. Em Supabase: Settings > API > service_role.',
        })
      }
      if (error.message?.toLowerCase().includes('user not allowed')) {
        return res.status(400).json({
          error: 'Cadastro bloqueado. Verifique no Supabase: Authentication > Providers > Email (ative "Enable Email Signup") e use a chave service_role em SUPABASE_SERVICE_KEY. Se usar Auth Hooks, permita criação de usuários.',
        })
      }
      console.error('Erro ao cadastrar:', error)
      res.status(400).json({
        error: error.message || 'Erro ao criar conta',
      })
    }
  }

  /**
   * Sincroniza perfil do usuário após cadastro no Supabase Auth (email/senha).
   * POST /api/auth/sync-profile
   * Body: { nome: string, role?: string }
   */
  async syncProfile(req: Request, res: Response) {
    try {
      const authReq = req as import('../middleware/auth.middleware').AuthRequest
      const user = authReq.user
      if (!user) {
        return res.status(401).json({ error: 'Não autorizado' })
      }
      const schema = z.object({
        nome: z.string().min(1, 'Nome é obrigatório'),
        role: z.enum(['admin', 'gerente', 'usuario']).optional(),
      })
      const body = schema.parse(req.body)
      const result = await authService.syncProfileFromSupabase(user.id, user.email || '', {
        nome: body.nome,
        role: body.role,
      })
      res.status(200).json({
        success: true,
        message: 'Perfil sincronizado',
        user: result.user,
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }
      console.error('Erro ao sincronizar perfil:', error)
      res.status(400).json({
        error: error.message || 'Erro ao sincronizar perfil',
      })
    }
  }
}

export default new AuthController()
