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
}

export default new AuthController()
