import { Request, Response } from 'express'
import companyService from '../services/company.service'
import { z } from 'zod'

const companyCreateSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255),
  cnpjs: z.array(z.string()).min(1, 'Pelo menos um CNPJ é obrigatório'),
  ativo: z.boolean().optional(),
})

const companyUpdateSchema = z.object({
  nome: z.string().min(1).max(255).optional(),
  cnpjs: z.array(z.string()).optional(),
  ativo: z.boolean().optional(),
})

export class CompanyController {
  async findAll(req: Request, res: Response) {
    try {
      const companies = await companyService.findAll()
      res.json({ data: companies })
    } catch (error: any) {
      console.error('Erro ao listar empresas:', error)
      res.status(500).json({
        error: 'Erro ao listar empresas',
        message: error.message,
      })
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const company = await companyService.findById(id)
      res.json({ data: company })
    } catch (error: any) {
      if (error.message === 'Empresa não encontrada') {
        return res.status(404).json({ error: error.message })
      }
      console.error('Erro ao buscar empresa:', error)
      res.status(500).json({
        error: 'Erro ao buscar empresa',
        message: error.message,
      })
    }
  }

  async create(req: Request, res: Response) {
    try {
      const data = companyCreateSchema.parse(req.body)
      const company = await companyService.create(data)
      res.status(201).json({
        message: 'Empresa criada com sucesso',
        data: company,
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }
      console.error('Erro ao criar empresa:', error)
      res.status(500).json({
        error: 'Erro ao criar empresa',
        message: error.message,
      })
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params
      const data = companyUpdateSchema.parse(req.body)
      const company = await companyService.update(id, data)
      res.json({
        message: 'Empresa atualizada com sucesso',
        data: company,
      })
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.errors,
        })
      }
      if (error.message === 'Empresa não encontrada') {
        return res.status(404).json({ error: error.message })
      }
      console.error('Erro ao atualizar empresa:', error)
      res.status(500).json({
        error: 'Erro ao atualizar empresa',
        message: error.message,
      })
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params
      await companyService.delete(id)
      res.json({ message: 'Empresa deletada com sucesso' })
    } catch (error: any) {
      if (error.message === 'Empresa não encontrada') {
        return res.status(404).json({ error: error.message })
      }
      console.error('Erro ao deletar empresa:', error)
      res.status(500).json({
        error: 'Erro ao deletar empresa',
        message: error.message,
      })
    }
  }
}

export default new CompanyController()
