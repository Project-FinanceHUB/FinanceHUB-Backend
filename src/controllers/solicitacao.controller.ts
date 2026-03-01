import path from 'path'
import { Response } from 'express'
import solicitacaoService from '../services/solicitacao.service'
import type { AuthRequest } from '../middleware/auth.middleware'
import { deleteSuccess } from '../utils/responses'
import { solicitacaoCreateSchema, solicitacaoUpdateSchema } from '../validators/solicitacao.validator'
import { saveUserUpload, saveUserUploadAsync, getFileBuffer, deleteUserFile, useSupabaseStorage } from '../utils/uploadUserFile'

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
      const boletoFile = files?.boleto?.[0]
      const notaFiscalFile = files?.notaFiscal?.[0]

      if (!boletoFile?.buffer) {
        return res.status(400).json({
          error: 'Boleto é obrigatório',
          field: 'boleto',
        })
      }

      if (!notaFiscalFile?.buffer) {
        return res.status(400).json({
          error: 'Nota Fiscal é obrigatória',
          field: 'notaFiscal',
        })
      }

      // Grava em disco local ou Supabase Storage (persistente em produção/Vercel)
      const boletoPath = useSupabaseStorage()
        ? await saveUserUploadAsync(boletoFile.buffer, ownerId, boletoFile.originalname)
        : saveUserUpload(boletoFile.buffer, ownerId, boletoFile.originalname)
      const notaFiscalPath = useSupabaseStorage()
        ? await saveUserUploadAsync(notaFiscalFile.buffer, ownerId, notaFiscalFile.originalname)
        : saveUserUpload(notaFiscalFile.buffer, ownerId, notaFiscalFile.originalname)

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
      const boletoFile = files?.boleto?.[0]
      const notaFiscalFile = files?.notaFiscal?.[0]

      const updateData: any = { ...bodyData }
      if (boletoFile?.buffer) {
        updateData.boletoPath = useSupabaseStorage()
          ? await saveUserUploadAsync(boletoFile.buffer, ownerId, boletoFile.originalname)
          : saveUserUpload(boletoFile.buffer, ownerId, boletoFile.originalname)
      }
      if (notaFiscalFile?.buffer) {
        updateData.notaFiscalPath = useSupabaseStorage()
          ? await saveUserUploadAsync(notaFiscalFile.buffer, ownerId, notaFiscalFile.originalname)
          : saveUserUpload(notaFiscalFile.buffer, ownerId, notaFiscalFile.originalname)
      }

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
   * Download de arquivo anexado (boleto ou nota fiscal)
   * GET /api/solicitacoes/:id/arquivo/:tipo (tipo = boleto | nota-fiscal)
   */
  async downloadArquivo(req: AuthRequest, res: Response) {
    try {
      const ownerId = req.user?.effectiveOwnerId
      if (!ownerId) return res.status(401).json({ error: 'Não autorizado' })
      const { id, tipo } = req.params
      if (!id || !tipo) return res.status(400).json({ error: 'ID e tipo são obrigatórios' })
      if (tipo !== 'boleto' && tipo !== 'nota-fiscal') {
        return res.status(400).json({ error: 'Tipo deve ser boleto ou nota-fiscal' })
      }

      const solicitacao = await solicitacaoService.findById(id, ownerId)
      const filePathRaw = tipo === 'boleto' ? (solicitacao as any).boletoPath : (solicitacao as any).notaFiscalPath
      if (!filePathRaw || typeof filePathRaw !== 'string') {
        return res.status(404).json({ error: tipo === 'boleto' ? 'Boleto não encontrado' : 'Nota fiscal não encontrada' })
      }

      const filePath = filePathRaw.replace(/^[/\\]+/, '').replace(/\\/g, '/').trim()
      const buffer = await getFileBuffer(filePath)
      if (!buffer) {
        console.warn('[downloadArquivo] Arquivo não encontrado:', { filePath })
        return res.status(404).json({ error: 'Arquivo não encontrado no servidor. Verifique se os arquivos foram enviados corretamente.' })
      }

      const filename = path.basename(filePath)
      const ext = path.extname(filename).toLowerCase()
      const contentType: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
      }
      res.setHeader('Content-Type', contentType[ext] || 'application/octet-stream')
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
      res.send(buffer)
    } catch (error: any) {
      if (error.message === 'Solicitação não encontrada') {
        return res.status(404).json({ error: error.message })
      }
      console.error('Erro ao baixar arquivo:', error)
      res.status(500).json({
        error: 'Erro ao baixar arquivo',
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
      const solicitacao = await solicitacaoService.findById(id, ownerId)
      await solicitacaoService.delete(id, ownerId)
      const boletoPath = (solicitacao as any).boletoPath
      const notaFiscalPath = (solicitacao as any).notaFiscalPath
      if (typeof boletoPath === 'string') await deleteUserFile(boletoPath)
      if (typeof notaFiscalPath === 'string') await deleteUserFile(notaFiscalPath)
      return deleteSuccess(res, 'Solicitação excluída com sucesso.')
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
