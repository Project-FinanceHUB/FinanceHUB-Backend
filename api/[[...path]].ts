/**
 * Handler serverless do Vercel: encaminha todas as requisições para o app Express.
 * OPTIONS (preflight) é respondido aqui para garantir status 200 e headers CORS.
 */
import app from '../src/server'

const CORS_ORIGIN = 'https://finance-hub-front-seven.vercel.app'

export default function handler(req: any, res: any) {
  // Responder preflight OPTIONS no handler para evitar "does not have HTTP ok status"
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers?.origin || CORS_ORIGIN)
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Max-Age', '86400')
    return res.status(200).end()
  }
  return app(req, res)
}
