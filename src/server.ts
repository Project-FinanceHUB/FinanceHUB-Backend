import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import apiRoutes from './routes'

// Carregar variáveis de ambiente (.env e depois .env.local para overrides locais)
dotenv.config()
dotenv.config({ path: path.join(process.cwd(), '.env.local'), override: true })

const app = express()
const PORT = process.env.PORT || 3001
// Várias origens separadas por vírgula (ex.: FRONTEND_URL=https://app.com,https://app.vercel.app)
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'
const allowedOrigins = FRONTEND_URL.split(',').map((o) => o.trim()).filter(Boolean)

// Middleware
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    return cb(null, false)
  },
  credentials: true,
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Servir arquivos estáticos (uploads). No Vercel usa /tmp (efêmero)
const uploadsDir = process.env.VERCEL
  ? path.join('/tmp', process.env.UPLOADS_DIR || 'uploads')
  : path.join(process.cwd(), process.env.UPLOADS_DIR || 'uploads')
app.use('/uploads', express.static(uploadsDir))

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

// No Vercel (serverless) não iniciamos o servidor HTTP; o handler em api/ usa o app
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`)
    console.log(`📡 API disponível em http://localhost:${PORT}/api`)
    console.log(`🌐 CORS origens: ${allowedOrigins.join(', ') || FRONTEND_URL}`)
  })

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
}

export default app
