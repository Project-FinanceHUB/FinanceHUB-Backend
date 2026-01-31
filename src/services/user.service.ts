import prisma from '../config/database'
import { UserCreateInput, UserUpdateInput } from '../types/user'
import { sendEmail, generateWelcomeEmail } from '../utils/email'

export class UserService {
  async findAll() {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      throw new Error('Usuário não encontrado')
    }

    return user
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    })
  }

  async create(data: UserCreateInput) {
    // Verificar se email já existe
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existing) {
      throw new Error('E-mail já cadastrado')
    }

    const user = await prisma.user.create({
      data: {
        nome: data.nome,
        email: data.email,
        role: data.role || 'usuario',
        ativo: data.ativo !== undefined ? data.ativo : true,
      },
    })

    // Enviar email de boas-vindas
    try {
      const emailContent = generateWelcomeEmail(user.nome, user.email, user.role)
      await sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
      })
      console.log(`[UserService] Email de boas-vindas enviado para ${user.email}`)
    } catch (error) {
      console.error('Erro ao enviar email de boas-vindas:', error)
      // Não falha a criação do usuário se o email falhar
    }

    return user
  }

  async update(id: string, data: UserUpdateInput) {
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      throw new Error('Usuário não encontrado')
    }

    // Se estiver atualizando email, verificar se já existe
    if (data.email && data.email !== user.email) {
      const existing = await prisma.user.findUnique({
        where: { email: data.email },
      })

      if (existing) {
        throw new Error('E-mail já cadastrado')
      }
    }

    return prisma.user.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })
  }

  async delete(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      throw new Error('Usuário não encontrado')
    }

    await prisma.user.delete({
      where: { id },
    })

    return { message: 'Usuário deletado com sucesso' }
  }

  async updateLastLogin(id: string) {
    return prisma.user.update({
      where: { id },
      data: {
        ultimoLogin: new Date(),
      },
    })
  }
}

export default new UserService()
