import { Router } from 'express'
import mensagemController from '../controllers/mensagem.controller'

const router = Router()

router.get('/', mensagemController.findAll.bind(mensagemController))
router.get('/:id', mensagemController.findById.bind(mensagemController))
router.post('/', mensagemController.create.bind(mensagemController))
router.put('/:id', mensagemController.update.bind(mensagemController))
router.patch('/:id/read', mensagemController.markAsRead.bind(mensagemController))
router.patch('/read-all', mensagemController.markAllAsRead.bind(mensagemController))
router.delete('/:id', mensagemController.delete.bind(mensagemController))

export default router
