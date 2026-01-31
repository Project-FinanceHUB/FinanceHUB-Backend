import prisma from '../config/database'
import { CompanyCreateInput, CompanyUpdateInput } from '../types/company'

export class CompanyService {
  async findAll() {
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Converter cnpjs de string JSON para array
    return companies.map((company) => ({
      ...company,
      cnpjs: typeof company.cnpjs === 'string' ? JSON.parse(company.cnpjs) : company.cnpjs,
    }))
  }

  async findById(id: string) {
    const company = await prisma.company.findUnique({
      where: { id },
    })

    if (!company) {
      throw new Error('Empresa não encontrada')
    }

    return {
      ...company,
      cnpjs: typeof company.cnpjs === 'string' ? JSON.parse(company.cnpjs) : company.cnpjs,
    }
  }

  async create(data: CompanyCreateInput) {
    return prisma.company.create({
      data: {
        nome: data.nome,
        cnpjs: JSON.stringify(data.cnpjs),
        ativo: data.ativo !== undefined ? data.ativo : true,
      },
    }).then((company) => ({
      ...company,
      cnpjs: JSON.parse(company.cnpjs),
    }))
  }

  async update(id: string, data: CompanyUpdateInput) {
    const company = await prisma.company.findUnique({
      where: { id },
    })

    if (!company) {
      throw new Error('Empresa não encontrada')
    }

    const updateData: any = {}
    if (data.nome) updateData.nome = data.nome
    if (data.cnpjs) updateData.cnpjs = JSON.stringify(data.cnpjs)
    if (data.ativo !== undefined) updateData.ativo = data.ativo
    updateData.updatedAt = new Date()

    return prisma.company.update({
      where: { id },
      data: updateData,
    }).then((company) => ({
      ...company,
      cnpjs: JSON.parse(company.cnpjs),
    }))
  }

  async delete(id: string) {
    const company = await prisma.company.findUnique({
      where: { id },
    })

    if (!company) {
      throw new Error('Empresa não encontrada')
    }

    await prisma.company.delete({
      where: { id },
    })

    return { message: 'Empresa deletada com sucesso' }
  }
}

export default new CompanyService()
