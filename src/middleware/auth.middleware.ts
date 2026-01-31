import { Request, Response, NextFunction } from 'express'
import authService from '../services/auth.service'

export interface AuthRequest extends Request {
  user?: {
    id: string
    nome: string
    email: string
    role: string
  }
  session?: any
}

/**
 * Middleware para proteger rotas que requerem autenticação
 */
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token as string

    if (!token) {
      return res.status(401).json({
        error: 'Token não fornecido',
      })
    }

    const session = await authService.validateSession(token)
    req.user = session.user
    req.session = session

    next()
  } catch (error: any) {
    return res.status(401).json({
      error: error.message || 'Sessão inválida ou expirada',
    })
  }
}

/**
 * Middleware opcional - adiciona user se token válido, mas não bloqueia
 */
export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token as string

    if (token) {
      const session = await authService.validateSession(token)
      req.user = session.user
      req.session = session
    }
  } catch (error) {
    // Ignora erros - autenticação é opcional
  }

  next()
}
