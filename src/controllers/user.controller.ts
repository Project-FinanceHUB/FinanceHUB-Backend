import { Request, Response } from 'express'
import userService from '../services/user.service'
import authService from '../services/auth.service'
import type { AuthRequest } from '../middleware/auth.middleware'
import { z } from 'zod'

const userCreateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
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
        const user = await userService.findById(userId) as Record<string, unknown> & { gerenteId?: string }
        const effectiveOwnerId = user.gerenteId || user.id
        return res.json({ data: { ...user, effectiveOwnerId } })
      } catch (err: any) {
        if (err.message !== 'Usuário não encontrado') throw err
        // Usuário existe no Auth mas não em public.users (ex.: login Supabase sem sync) — cria agora
        await authService.syncProfileFromSupabase(userId, email, { nome: nome || email })
        const user = await userService.findById(userId) as Record<string, unknown> & { gerenteId?: string }
        const effectiveOwnerId = user.gerenteId || user.id
        return res.json({ data: { ...user, effectiveOwnerId } })
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

  /** Lista apenas os funcionários vinculados ao usuário logado (gerente) */
  async findAll(req: AuthRequest, res: Response) {
    try {
      const gerenteId = req.user?.id
      if (!gerenteId) return res.status(401).json({ error: 'Não autorizado' })
      const users = await userService.findAllByGerente(gerenteId)
      res.json({ data: users })
    } catch (error: any) {
      console.error('Erro ao listar usuários:', error)
      res.status(500).json({
        error: 'Erro ao listar usuários',
        message: error.message,
      })
    }
  }

  async findById(req: AuthRequest, res: Response) {
    try {
      const currentUserId = req.user?.id
      if (!currentUserId) return res.status(401).json({ error: 'Não autorizado' })
      const { id } = req.params
      const user = await userService.findById(id) as { id: string; gerenteId?: string }
      if (user.id !== currentUserId && user.gerenteId !== currentUserId) {
        return res.status(404).json({ error: 'Usuário não encontrado' })
      }
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

  /** Cria um funcionário vinculado ao gerente logado (com login por e-mail/senha) */
  async create(req: AuthRequest, res: Response) {
    try {
      const gerenteId = req.user?.id
      if (!gerenteId) return res.status(401).json({ error: 'Não autorizado' })
      const data = userCreateSchema.parse(req.body)
      const { user } = await authService.registerWithPassword({
        nome: data.nome,
        email: data.email,
        password: data.password,
        role: data.role || 'usuario',
        gerenteId,
      })
      res.status(201).json({
        message: 'Usuário criado com sucesso. Ele pode fazer login com este e-mail e a senha definida.',
        data: { id: user.id, nome: user.nome, email: user.email, role: user.role, ativo: true },
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }
      if (error.message === 'E-mail já cadastrado' || error.message?.toLowerCase?.().includes('already registered')) {
        return res.status(409).json({ error: 'E-mail já cadastrado' })
      }
      console.error('Erro ao criar usuário:', error)
      res.status(500).json({
        error: 'Erro ao criar usuário',
        message: error.message,
      })
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const currentUserId = req.user?.id
      if (!currentUserId) return res.status(401).json({ error: 'Não autorizado' })
      const { id } = req.params
      const existing = await userService.findById(id) as { gerenteId?: string }
      if (existing.gerenteId !== currentUserId && id !== currentUserId) {
        return res.status(404).json({ error: 'Usuário não encontrado' })
      }
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

  async delete(req: AuthRequest, res: Response) {
    try {
      const currentUserId = req.user?.id
      if (!currentUserId) return res.status(401).json({ error: 'Não autorizado' })
      const { id } = req.params
      const existing = await userService.findById(id) as { gerenteId?: string }
      if (existing.gerenteId !== currentUserId) {
        return res.status(404).json({ error: 'Usuário não encontrado' })
      }
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
