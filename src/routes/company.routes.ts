import { Router } from 'express'
import companyController from '../controllers/company.controller'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()

router.get('/', requireAuth, companyController.findAll.bind(companyController))
router.get('/:id', requireAuth, companyController.findById.bind(companyController))
router.post('/', requireAuth, companyController.create.bind(companyController))
router.put('/:id', requireAuth, companyController.update.bind(companyController))
router.delete('/:id', requireAuth, companyController.delete.bind(companyController))

export default router
