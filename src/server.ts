import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import apiRoutes from './routes'

// Carregar variáveis de ambiente
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Servir arquivos estáticos (uploads)
app.use('/uploads', express.static(path.join(process.cwd(), process.env.UPLOADS_DIR || 'uploads')))

// Rotas da API
app.use('/api', apiRoutes)

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'FinanceHUB API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: {
        sendCode: '/api/auth/send-code',
        verifyCode: '/api/auth/verify-code',
        validate: '/api/auth/validate',
        logout: '/api/auth/logout',
      },
      solicitacoes: '/api/solicitacoes',
      users: '/api/users',
      companies: '/api/companies',
      mensagens: '/api/mensagens',
    },
  })
})

// Middleware de tratamento de erros
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro não tratado:', err)

  if (err instanceof Error) {
    return res.status(500).json({
      error: 'Erro interno do servidor',
      message: err.message,
    })
  }

  res.status(500).json({
    error: 'Erro interno do servidor',
  })
})

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`)
  console.log(`📡 API disponível em http://localhost:${PORT}/api`)
  console.log(`🌐 Frontend configurado: ${FRONTEND_URL}`)
})

// Tratamento de erro ao iniciar servidor
server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ Erro: A porta ${PORT} já está em uso!`)
    console.error(`\n💡 Soluções:`)
    console.error(`   1. Encerre o processo que está usando a porta ${PORT}`)
    console.error(`   2. Ou altere a porta no arquivo .env (PORT=3002)`)
    console.error(`\n📝 Para encontrar o processo na porta ${PORT}:`)
    console.error(`   Windows: netstat -ano | findstr :${PORT}`)
    console.error(`   Linux/Mac: lsof -i :${PORT}`)
    process.exit(1)
  } else {
    console.error('❌ Erro ao iniciar servidor:', error)
    process.exit(1)
  }
})

export default app
