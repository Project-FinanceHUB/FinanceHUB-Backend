/**
 * Handler serverless do Vercel: encaminha todas as requisições para o app Express.
 * No Vercel, as rotas ficam em /api/* (ex.: /api/health, /api/auth/send-code).
 */
import app from '../src/server'

export default function handler(req: any, res: any) {
  return app(req, res)
}
