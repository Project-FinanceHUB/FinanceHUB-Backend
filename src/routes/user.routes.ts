import { Router } from 'express'
import userController from '../controllers/user.controller'

const router = Router()

router.get('/', userController.findAll.bind(userController))
router.get('/:id', userController.findById.bind(userController))
router.post('/', userController.create.bind(userController))
router.put('/:id', userController.update.bind(userController))
router.delete('/:id', userController.delete.bind(userController))

export default router
