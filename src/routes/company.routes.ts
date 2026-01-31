import { Router } from 'express'
import companyController from '../controllers/company.controller'

const router = Router()

router.get('/', companyController.findAll.bind(companyController))
router.get('/:id', companyController.findById.bind(companyController))
router.post('/', companyController.create.bind(companyController))
router.put('/:id', companyController.update.bind(companyController))
router.delete('/:id', companyController.delete.bind(companyController))

export default router
