import { Router } from 'express'
import authController from '../controllers/auth.controller'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()

// Enviar código de verificação (legado)
router.post('/send-code', authController.sendCode.bind(authController))

// Verificar código e criar sessão (legado)
router.post('/verify-code', authController.verifyCode.bind(authController))

// Validar sessão
router.get('/validate', authController.validateSession.bind(authController))

// Logout
router.post('/logout', authController.logout.bind(authController))

// Confirmar e-mail de usuário pela API Admin (sem enviar e-mail)
router.post('/confirm-user', authController.confirmUser.bind(authController))

// Cadastro pelo backend (usuário já confirmado, sem e-mail)
router.post('/register', authController.register.bind(authController))

// Sincronizar perfil após cadastro com Supabase Auth (email/senha)
router.post('/sync-profile', requireAuth, authController.syncProfile.bind(authController))

export default router
