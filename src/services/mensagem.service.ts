import prisma from '../config/database'
import { MensagemCreateInput, MensagemUpdateInput } from '../types/mensagem'

export class MensagemService {
  async findAll(solicitacaoId?: string) {
    const where: any = {}
    if (solicitacaoId) {
      where.solicitacaoId = solicitacaoId
    }

    return prisma.mensagem.findMany({
      where,
      orderBy: { dataHora: 'desc' },
    })
  }

  async findById(id: string) {
    const mensagem = await prisma.mensagem.findUnique({
      where: { id },
    })

    if (!mensagem) {
      throw new Error('Mensagem não encontrada')
    }

    return mensagem
  }

  async create(data: MensagemCreateInput) {
    return prisma.mensagem.create({
      data: {
        solicitacaoId: data.solicitacaoId,
        direcao: data.direcao,
        assunto: data.assunto,
        conteudo: data.conteudo,
        remetente: data.remetente,
        anexo: data.anexo,
        lida: false,
      },
    })
  }

  async update(id: string, data: MensagemUpdateInput) {
    const mensagem = await prisma.mensagem.findUnique({
      where: { id },
    })

    if (!mensagem) {
      throw new Error('Mensagem não encontrada')
    }

    return prisma.mensagem.update({
      where: { id },
      data: {
        ...data,
      },
    })
  }

  async markAsRead(id: string) {
    const mensagem = await prisma.mensagem.findUnique({
      where: { id },
    })

    if (!mensagem) {
      throw new Error('Mensagem não encontrada')
    }

    return prisma.mensagem.update({
      where: { id },
      data: {
        lida: true,
      },
    })
  }

  async markAllAsRead() {
    await prisma.mensagem.updateMany({
      where: {
        lida: false,
      },
      data: {
        lida: true,
      },
    })

    return { message: 'Todas as mensagens foram marcadas como lidas' }
  }

  async delete(id: string) {
    const mensagem = await prisma.mensagem.findUnique({
      where: { id },
    })

    if (!mensagem) {
      throw new Error('Mensagem não encontrada')
    }

    await prisma.mensagem.delete({
      where: { id },
    })

    return { message: 'Mensagem deletada com sucesso' }
  }
}

export default new MensagemService()
