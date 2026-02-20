import { Request, Response } from 'express'
import userService from '../services/user.service'
import authService from '../services/auth.service'
import type { AuthRequest } from '../middleware/auth.middleware'
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
  telefone: z.string().max(50).optional().nullable(),
  cargo: z.string().max(100).optional().nullable(),
})

/** Schema para "Meu Perfil": só nome, telefone e cargo (e-mail não pode ser alterado) */
const profileUpdateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255).optional(),
  telefone: z.string().max(50).optional().nullable(),
  cargo: z.string().max(100).optional().nullable(),
})

export class UserController {
  /** Perfil do usuário logado (GET /api/users/me) */
  async getMe(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id
      const email = req.user?.email ?? ''
      const nome = req.user?.nome ?? ''
      if (!userId) return res.status(401).json({ error: 'Não autenticado' })
      try {
        const user = await userService.findById(userId)
        return res.json({ data: user })
      } catch (err: any) {
        if (err.message !== 'Usuário não encontrado') throw err
        // Usuário existe no Auth mas não em public.users (ex.: login Supabase sem sync) — cria agora
        await authService.syncProfileFromSupabase(userId, email, { nome: nome || email })
        const user = await userService.findById(userId)
        return res.json({ data: user })
      }
    } catch (error: any) {
      console.error('Erro ao buscar perfil:', error)
      res.status(500).json({
        error: 'Erro ao buscar perfil',
        message: error.message,
      })
    }
  }

  /** Atualizar perfil do usuário logado (PUT /api/users/me) - não altera e-mail */
  async updateMe(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id
      const email = req.user?.email ?? ''
      const nomeAuth = req.user?.nome ?? ''
      if (!userId) return res.status(401).json({ error: 'Não autenticado' })
      const data = profileUpdateSchema.parse(req.body)
      let user: any
      try {
        user = await userService.update(userId, data)
      } catch (err: any) {
        if (err.message !== 'Usuário não encontrado') throw err
        // Usuário existe no Auth mas não em public.users — cria e aplica a atualização
        await authService.syncProfileFromSupabase(userId, email, {
          nome: (data.nome && data.nome.trim()) || nomeAuth || email,
        })
        user = await userService.update(userId, data)
      }
      res.json({
        message: 'Perfil atualizado com sucesso',
        data: user,
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }
      console.error('Erro ao atualizar perfil:', error)
      const msg = String(error?.message || '')
      const isMissingColumn = /column ["']?(telefone|cargo)["']? .* does not exist/i.test(msg)
      const clientMessage = isMissingColumn
        ? 'Banco desatualizado. Execute a migration 005_users_telefone_cargo no Supabase.'
        : msg || 'Erro ao atualizar perfil.'
      res.status(500).json({
        error: 'Erro ao atualizar perfil',
        message: clientMessage,
      })
    }
  }

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
