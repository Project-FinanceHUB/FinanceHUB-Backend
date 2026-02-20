import { Router } from 'express'
import userController from '../controllers/user.controller'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()

// Rotas de perfil do usuário logado (devem vir antes de /:id)
router.get('/me', requireAuth, userController.getMe.bind(userController))
router.put('/me', requireAuth, userController.updateMe.bind(userController))

router.get('/', requireAuth, userController.findAll.bind(userController))
router.get('/:id', requireAuth, userController.findById.bind(userController))
router.post('/', requireAuth, userController.create.bind(userController))
router.put('/:id', requireAuth, userController.update.bind(userController))
router.delete('/:id', requireAuth, userController.delete.bind(userController))

export default router
