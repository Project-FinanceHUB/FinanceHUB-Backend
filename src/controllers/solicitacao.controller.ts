import { Response } from 'express'
import solicitacaoService from '../services/solicitacao.service'
import type { AuthRequest } from '../middleware/auth.middleware'
import { solicitacaoCreateSchema, solicitacaoUpdateSchema } from '../validators/solicitacao.validator'

export class SolicitacaoController {
  /**
   * Cria uma nova solicitação
   * POST /api/solicitacoes
   */
  async create(req: AuthRequest, res: Response) {
    try {
      const ownerId = req.user?.effectiveOwnerId
      if (!ownerId) return res.status(401).json({ error: 'Não autorizado' })

      const bodyData = solicitacaoCreateSchema.parse(req.body)

      const files = req.files as { [fieldname: string]: Express.Multer.File[] }
      const boletoPath = files?.boleto?.[0]?.path
      const notaFiscalPath = files?.notaFiscal?.[0]?.path

      if (!boletoPath) {
        return res.status(400).json({
          error: 'Boleto é obrigatório',
          field: 'boleto',
        })
      }

      if (!notaFiscalPath) {
        return res.status(400).json({
          error: 'Nota Fiscal é obrigatória',
          field: 'notaFiscal',
        })
      }

      const solicitacao = await solicitacaoService.create(
        {
          ...bodyData,
          boletoPath,
          notaFiscalPath,
        },
        ownerId
      )

      res.status(201).json({
        message: 'Solicitação criada com sucesso',
        data: solicitacao,
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }

      console.error('Erro ao criar solicitação:', error)
      res.status(500).json({
        error: 'Erro ao criar solicitação',
        message: error.message,
      })
    }
  }

  /**
   * Lista todas as solicitações do usuário com paginação
   * GET /api/solicitacoes
   */
  async findAll(req: AuthRequest, res: Response) {
    try {
      const ownerId = req.user?.effectiveOwnerId
      if (!ownerId) return res.status(401).json({ error: 'Não autorizado' })

      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 10
      const status = req.query.status as string | undefined
      const search = req.query.search as string | undefined

      const result = await solicitacaoService.findAll(ownerId, page, limit, { status, search })

      res.json(result)
    } catch (error: any) {
      console.error('Erro ao listar solicitações:', error)
      res.status(500).json({
        error: 'Erro ao listar solicitações',
        message: error.message,
      })
    }
  }

  /**
   * Busca uma solicitação por ID
   * GET /api/solicitacoes/:id
   */
  async findById(req: AuthRequest, res: Response) {
    try {
      const ownerId = req.user?.effectiveOwnerId
      if (!ownerId) return res.status(401).json({ error: 'Não autorizado' })
      const { id } = req.params
      const solicitacao = await solicitacaoService.findById(id, ownerId)

      res.json({ data: solicitacao })
    } catch (error: any) {
      if (error.message === 'Solicitação não encontrada') {
        return res.status(404).json({
          error: error.message,
        })
      }

      console.error('Erro ao buscar solicitação:', error)
      res.status(500).json({
        error: 'Erro ao buscar solicitação',
        message: error.message,
      })
    }
  }

  /**
   * Busca uma solicitação por número
   * GET /api/solicitacoes/numero/:numero
   */
  async findByNumero(req: AuthRequest, res: Response) {
    try {
      const ownerId = req.user?.effectiveOwnerId
      if (!ownerId) return res.status(401).json({ error: 'Não autorizado' })
      const { numero } = req.params
      const solicitacao = await solicitacaoService.findByNumero(numero, ownerId)

      res.json({ data: solicitacao })
    } catch (error: any) {
      if (error.message === 'Solicitação não encontrada') {
        return res.status(404).json({
          error: error.message,
        })
      }

      console.error('Erro ao buscar solicitação:', error)
      res.status(500).json({
        error: 'Erro ao buscar solicitação',
        message: error.message,
      })
    }
  }

  /**
   * Atualiza uma solicitação
   * PUT /api/solicitacoes/:id
   */
  async update(req: AuthRequest, res: Response) {
    try {
      const ownerId = req.user?.effectiveOwnerId
      if (!ownerId) return res.status(401).json({ error: 'Não autorizado' })
      const { id } = req.params

      const bodyData = solicitacaoUpdateSchema.parse(req.body)

      const files = req.files as { [fieldname: string]: Express.Multer.File[] }
      const boletoPath = files?.boleto?.[0]?.path
      const notaFiscalPath = files?.notaFiscal?.[0]?.path

      const updateData: any = { ...bodyData }
      if (boletoPath) updateData.boletoPath = boletoPath
      if (notaFiscalPath) updateData.notaFiscalPath = notaFiscalPath

      const solicitacao = await solicitacaoService.update(id, updateData, ownerId)

      res.json({
        message: 'Solicitação atualizada com sucesso',
        data: solicitacao,
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }

      if (error.message === 'Solicitação não encontrada') {
        return res.status(404).json({
          error: error.message,
        })
      }

      console.error('Erro ao atualizar solicitação:', error)
      res.status(500).json({
        error: 'Erro ao atualizar solicitação',
        message: error.message,
      })
    }
  }

  /**
   * Deleta uma solicitação
   * DELETE /api/solicitacoes/:id
   */
  async delete(req: AuthRequest, res: Response) {
    try {
      const ownerId = req.user?.effectiveOwnerId
      if (!ownerId) return res.status(401).json({ error: 'Não autorizado' })
      const { id } = req.params
      await solicitacaoService.delete(id, ownerId)

      res.json({
        message: 'Solicitação deletada com sucesso',
      })
    } catch (error: any) {
      if (error.message === 'Solicitação não encontrada') {
        return res.status(404).json({
          error: error.message,
        })
      }

      console.error('Erro ao deletar solicitação:', error)
      res.status(500).json({
        error: 'Erro ao deletar solicitação',
        message: error.message,
      })
    }
  }
}

export default new SolicitacaoController()
