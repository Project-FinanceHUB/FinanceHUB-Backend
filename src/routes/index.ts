import { Router } from 'express'
import solicitacaoRoutes from './solicitacao.routes'
import userRoutes from './user.routes'
import companyRoutes from './company.routes'
import mensagemRoutes from './mensagem.routes'
import authRoutes from './auth.routes'

const router = Router()

// Rotas da API
router.use('/auth', authRoutes)
router.use('/solicitacoes', solicitacaoRoutes)
router.use('/users', userRoutes)
router.use('/companies', companyRoutes)
router.use('/mensagens', mensagemRoutes)

// Rota de health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'FinanceHUB API',
  })
})

export default router
