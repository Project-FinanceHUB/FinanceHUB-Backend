/**
 * Entrada serverless da Vercel: exporta o app Express.
 * Todas as rotas são encaminhadas aqui via rewrites em vercel.json.
 */
import app from '../src/server'
export default app
