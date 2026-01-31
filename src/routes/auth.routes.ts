import { Router } from 'express'
import authController from '../controllers/auth.controller'

const router = Router()

// Enviar código de verificação
router.post('/send-code', authController.sendCode.bind(authController))

// Verificar código e criar sessão
router.post('/verify-code', authController.verifyCode.bind(authController))

// Validar sessão
router.get('/validate', authController.validateSession.bind(authController))

// Logout
router.post('/logout', authController.logout.bind(authController))

export default router
