export interface AuthCodeRequest {
  email: string
}

export interface AuthCodeResponse {
  message: string
  expiresIn: number // segundos até expirar
}

export interface VerifyCodeRequest {
  email: string
  code: string
}

export interface VerifyCodeResponse {
  success: boolean
  token?: string
  user?: {
    id: string
    nome: string
    email: string
    role: string
  }
  message?: string
}

export interface SessionData {
  id: string
  userId: string
  token: string
  expiresAt: string
  user: {
    id: string
    nome: string
    email: string
    role: string
  }
}
