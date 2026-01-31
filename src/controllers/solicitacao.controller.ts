import { Request, Response } from 'express'
import solicitacaoService from '../services/solicitacao.service'
import { solicitacaoCreateSchema, solicitacaoUpdateSchema } from '../validators/solicitacao.validator'

export class SolicitacaoController {
  /**
   * Cria uma nova solicitação
   * POST /api/solicitacoes
   */
  async create(req: Request, res: Response) {
    try {
      // Validar dados do body
      const bodyData = solicitacaoCreateSchema.parse(req.body)

      // Obter caminhos dos arquivos enviados
      const files = req.files as { [fieldname: string]: Express.Multer.File[] }
      const boletoPath = files?.boleto?.[0]?.path
      const notaFiscalPath = files?.notaFiscal?.[0]?.path

      // Validar se os arquivos obrigatórios foram enviados
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

      // Criar solicitação
      const solicitacao = await solicitacaoService.create({
        ...bodyData,
        boletoPath,
        notaFiscalPath,
      })

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
   * Lista todas as solicitações com paginação
   * GET /api/solicitacoes
   */
  async findAll(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 10
      const status = req.query.status as string | undefined
      const search = req.query.search as string | undefined

      const result = await solicitacaoService.findAll(page, limit, { status, search })

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
  async findById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const solicitacao = await solicitacaoService.findById(id)

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
  async findByNumero(req: Request, res: Response) {
    try {
      const { numero } = req.params
      const solicitacao = await solicitacaoService.findByNumero(numero)

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
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params

      // Validar dados do body
      const bodyData = solicitacaoUpdateSchema.parse(req.body)

      // Obter caminhos dos arquivos enviados (opcionais na atualização)
      const files = req.files as { [fieldname: string]: Express.Multer.File[] }
      const boletoPath = files?.boleto?.[0]?.path
      const notaFiscalPath = files?.notaFiscal?.[0]?.path

      const updateData: any = { ...bodyData }
      if (boletoPath) updateData.boletoPath = boletoPath
      if (notaFiscalPath) updateData.notaFiscalPath = notaFiscalPath

      const solicitacao = await solicitacaoService.update(id, updateData)

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
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      await solicitacaoService.delete(id)

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
