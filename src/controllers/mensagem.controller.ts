import { Request, Response } from 'express'
import mensagemService from '../services/mensagem.service'
import { z } from 'zod'

const mensagemCreateSchema = z.object({
  solicitacaoId: z.string().optional(),
  direcao: z.enum(['enviada', 'recebida']),
  assunto: z.string().min(1, 'Assunto é obrigatório'),
  conteudo: z.string().min(1, 'Conteúdo é obrigatório'),
  remetente: z.string().min(1, 'Remetente é obrigatório'),
  anexo: z.string().optional(),
})

const mensagemUpdateSchema = z.object({
  assunto: z.string().min(1).optional(),
  conteudo: z.string().min(1).optional(),
  lida: z.boolean().optional(),
  anexo: z.string().optional(),
})

export class MensagemController {
  async findAll(req: Request, res: Response) {
    try {
      const solicitacaoId = req.query.solicitacaoId as string | undefined
      const mensagens = await mensagemService.findAll(solicitacaoId)
      res.json({ data: mensagens })
    } catch (error: any) {
      console.error('Erro ao listar mensagens:', error)
      res.status(500).json({
        error: 'Erro ao listar mensagens',
        message: error.message,
      })
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const mensagem = await mensagemService.findById(id)
      res.json({ data: mensagem })
    } catch (error: any) {
      if (error.message === 'Mensagem não encontrada') {
        return res.status(404).json({ error: error.message })
      }
      console.error('Erro ao buscar mensagem:', error)
      res.status(500).json({
        error: 'Erro ao buscar mensagem',
        message: error.message,
      })
    }
  }

  async create(req: Request, res: Response) {
    try {
      const data = mensagemCreateSchema.parse(req.body)
      const mensagem = await mensagemService.create(data)
      res.status(201).json({
        message: 'Mensagem criada com sucesso',
        data: mensagem,
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }
      console.error('Erro ao criar mensagem:', error)
      res.status(500).json({
        error: 'Erro ao criar mensagem',
        message: error.message,
      })
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const data = mensagemUpdateSchema.parse(req.body)
      const mensagem = await mensagemService.update(id, data)
      res.json({
        message: 'Mensagem atualizada com sucesso',
        data: mensagem,
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }
      if (error.message === 'Mensagem não encontrada') {
        return res.status(404).json({ error: error.message })
      }
      console.error('Erro ao atualizar mensagem:', error)
      res.status(500).json({
        error: 'Erro ao atualizar mensagem',
        message: error.message,
      })
    }
  }

  async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params
      const mensagem = await mensagemService.markAsRead(id)
      res.json({
        message: 'Mensagem marcada como lida',
        data: mensagem,
      })
    } catch (error: any) {
      if (error.message === 'Mensagem não encontrada') {
        return res.status(404).json({ error: error.message })
      }
      console.error('Erro ao marcar mensagem como lida:', error)
      res.status(500).json({
        error: 'Erro ao marcar mensagem como lida',
        message: error.message,
      })
    }
  }

  async markAllAsRead(req: Request, res: Response) {
    try {
      await mensagemService.markAllAsRead()
      res.json({ message: 'Todas as mensagens foram marcadas como lidas' })
    } catch (error: any) {
      console.error('Erro ao marcar todas as mensagens como lidas:', error)
      res.status(500).json({
        error: 'Erro ao marcar todas as mensagens como lidas',
        message: error.message,
      })
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      await mensagemService.delete(id)
      res.json({ message: 'Mensagem deletada com sucesso' })
    } catch (error: any) {
      if (error.message === 'Mensagem não encontrada') {
        return res.status(404).json({ error: error.message })
      }
      console.error('Erro ao deletar mensagem:', error)
      res.status(500).json({
        error: 'Erro ao deletar mensagem',
        message: error.message,
      })
    }
  }
}

export default new MensagemController()
