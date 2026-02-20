import { Router } from 'express'
import solicitacaoController from '../controllers/solicitacao.controller'
import { uploadSolicitacaoFiles } from '../config/multer'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()

router.post('/', requireAuth, uploadSolicitacaoFiles, solicitacaoController.create.bind(solicitacaoController))
router.get('/', requireAuth, solicitacaoController.findAll.bind(solicitacaoController))
router.get('/numero/:numero', requireAuth, solicitacaoController.findByNumero.bind(solicitacaoController))
router.get('/:id', requireAuth, solicitacaoController.findById.bind(solicitacaoController))
router.put('/:id', requireAuth, uploadSolicitacaoFiles, solicitacaoController.update.bind(solicitacaoController))
router.delete('/:id', requireAuth, solicitacaoController.delete.bind(solicitacaoController))

export default router
