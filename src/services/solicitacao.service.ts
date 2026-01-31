import prisma from '../config/database'
import { SolicitacaoCreateInput, SolicitacaoUpdateInput } from '../types/solicitacao'

export class SolicitacaoService {
  /**
   * Gera um número único de solicitação
   */
  private async generateNumero(): Promise<string> {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    return `${timestamp}-${random}`
  }

  /**
   * Cria uma nova solicitação
   */
  async create(data: SolicitacaoCreateInput & { boletoPath?: string; notaFiscalPath?: string }) {
    const numero = data.numero || (await this.generateNumero())

    // Verificar se o número já existe
    const existing = await prisma.solicitacao.findUnique({
      where: { numero },
    })

    if (existing) {
      throw new Error('Número de solicitação já existe')
    }

    const solicitacao = await prisma.solicitacao.create({
      data: {
        numero,
        titulo: data.titulo,
        origem: data.origem,
        prioridade: data.prioridade || 'media',
        status: data.status || 'aberto',
        estagio: data.estagio || 'Pendente',
        descricao: data.descricao,
        boletoPath: data.boletoPath,
        notaFiscalPath: data.notaFiscalPath,
      },
    })

    return solicitacao
  }

  /**
   * Busca todas as solicitações com paginação
   */
  async findAll(page: number = 1, limit: number = 10, filters?: { status?: string; search?: string }) {
    const skip = (page - 1) * limit

    const where: any = {}
    if (filters?.status) {
      where.status = filters.status
    }
    if (filters?.search) {
      where.OR = [
        { titulo: { contains: filters.search } },
        { numero: { contains: filters.search } },
        { origem: { contains: filters.search } },
      ]
    }

    const [solicitacoes, total] = await Promise.all([
      prisma.solicitacao.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          mensagens: {
            orderBy: { dataHora: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.solicitacao.count({ where }),
    ])

    return {
      solicitacoes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Busca uma solicitação por ID
   */
  async findById(id: string) {
    const solicitacao = await prisma.solicitacao.findUnique({
      where: { id },
      include: {
        mensagens: {
          orderBy: { dataHora: 'desc' },
        },
      },
    })

    if (!solicitacao) {
      throw new Error('Solicitação não encontrada')
    }

    return solicitacao
  }

  /**
   * Busca uma solicitação por número
   */
  async findByNumero(numero: string) {
    const solicitacao = await prisma.solicitacao.findUnique({
      where: { numero },
      include: {
        mensagens: {
          orderBy: { dataHora: 'desc' },
        },
      },
    })

    if (!solicitacao) {
      throw new Error('Solicitação não encontrada')
    }

    return solicitacao
  }

  /**
   * Atualiza uma solicitação
   */
  async update(id: string, data: SolicitacaoUpdateInput & { boletoPath?: string; notaFiscalPath?: string }) {
    const solicitacao = await prisma.solicitacao.findUnique({
      where: { id },
    })

    if (!solicitacao) {
      throw new Error('Solicitação não encontrada')
    }

    const updated = await prisma.solicitacao.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })

    return updated
  }

  /**
   * Deleta uma solicitação
   */
  async delete(id: string) {
    const solicitacao = await prisma.solicitacao.findUnique({
      where: { id },
    })

    if (!solicitacao) {
      throw new Error('Solicitação não encontrada')
    }

    await prisma.solicitacao.delete({
      where: { id },
    })

    return { message: 'Solicitação deletada com sucesso' }
  }
}

export default new SolicitacaoService()
