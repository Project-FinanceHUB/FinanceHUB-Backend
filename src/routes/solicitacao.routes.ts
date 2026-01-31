import { Router } from 'express'
import solicitacaoController from '../controllers/solicitacao.controller'
import { uploadSolicitacaoFiles } from '../config/multer'

const router = Router()

// Criar nova solicitação (com upload de arquivos)
router.post('/', uploadSolicitacaoFiles, solicitacaoController.create.bind(solicitacaoController))

// Listar todas as solicitações
router.get('/', solicitacaoController.findAll.bind(solicitacaoController))

// Buscar por número
router.get('/numero/:numero', solicitacaoController.findByNumero.bind(solicitacaoController))

// Buscar por ID
router.get('/:id', solicitacaoController.findById.bind(solicitacaoController))

// Atualizar solicitação (com upload opcional de arquivos)
router.put('/:id', uploadSolicitacaoFiles, solicitacaoController.update.bind(solicitacaoController))

// Deletar solicitação
router.delete('/:id', solicitacaoController.delete.bind(solicitacaoController))

export default router
