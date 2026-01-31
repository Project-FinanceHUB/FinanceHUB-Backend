import { Request, Response } from 'express'
import userService from '../services/user.service'
import { z } from 'zod'

const userCreateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255),
  email: z.string().email('E-mail inválido'),
  role: z.enum(['admin', 'gerente', 'usuario']).optional(),
  ativo: z.boolean().optional(),
})

const userUpdateSchema = z.object({
  nome: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'gerente', 'usuario']).optional(),
  ativo: z.boolean().optional(),
})

export class UserController {
  async findAll(req: Request, res: Response) {
    try {
      const users = await userService.findAll()
      res.json({ data: users })
    } catch (error: any) {
      console.error('Erro ao listar usuários:', error)
      res.status(500).json({
        error: 'Erro ao listar usuários',
        message: error.message,
      })
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const user = await userService.findById(id)
      res.json({ data: user })
    } catch (error: any) {
      if (error.message === 'Usuário não encontrado') {
        return res.status(404).json({ error: error.message })
      }
      console.error('Erro ao buscar usuário:', error)
      res.status(500).json({
        error: 'Erro ao buscar usuário',
        message: error.message,
      })
    }
  }

  async create(req: Request, res: Response) {
    try {
      const data = userCreateSchema.parse(req.body)
      const user = await userService.create(data)
      res.status(201).json({
        message: 'Usuário criado com sucesso',
        data: user,
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }
      if (error.message === 'E-mail já cadastrado') {
        return res.status(409).json({ error: error.message })
      }
      console.error('Erro ao criar usuário:', error)
      res.status(500).json({
        error: 'Erro ao criar usuário',
        message: error.message,
      })
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const data = userUpdateSchema.parse(req.body)
      const user = await userService.update(id, data)
      res.json({
        message: 'Usuário atualizado com sucesso',
        data: user,
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }
      if (error.message === 'Usuário não encontrado' || error.message === 'E-mail já cadastrado') {
        return res.status(error.message === 'Usuário não encontrado' ? 404 : 409).json({
          error: error.message,
        })
      }
      console.error('Erro ao atualizar usuário:', error)
      res.status(500).json({
        error: 'Erro ao atualizar usuário',
        message: error.message,
      })
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      await userService.delete(id)
      res.json({ message: 'Usuário deletado com sucesso' })
    } catch (error: any) {
      if (error.message === 'Usuário não encontrado') {
        return res.status(404).json({ error: error.message })
      }
      console.error('Erro ao deletar usuário:', error)
      res.status(500).json({
        error: 'Erro ao deletar usuário',
        message: error.message,
      })
    }
  }
}

export default new UserController()
