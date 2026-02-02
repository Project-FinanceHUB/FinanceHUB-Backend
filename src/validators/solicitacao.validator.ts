import { z } from 'zod'

export const solicitacaoCreateSchema = z.object({
  titulo: z.string().min(1, 'Razão Social é obrigatória').max(255),
  origem: z.string().min(1, 'CNPJ é obrigatório').max(18),
  prioridade: z.enum(['baixa', 'media', 'alta']).optional().default('media'),
  status: z.enum(['aberto', 'pendente', 'aguardando_validacao', 'fechado']).optional().default('aberto'),
  estagio: z.enum(['Pendente', 'Em revisão', 'Aguardando validação', 'Fechado']).optional().default('Pendente'),
  descricao: z.string().optional(),
  mensagem: z.string().optional(),
  visualizado: z.boolean().optional().default(false),
  respondido: z.boolean().optional().default(false),
})

export const solicitacaoUpdateSchema = z.object({
  titulo: z.string().min(1).max(255).optional(),
  origem: z.string().min(1).max(18).optional(),
  prioridade: z.enum(['baixa', 'media', 'alta']).optional(),
  status: z.enum(['aberto', 'pendente', 'aguardando_validacao', 'fechado']).optional(),
  estagio: z.enum(['Pendente', 'Em revisão', 'Aguardando validação', 'Fechado']).optional(),
  descricao: z.string().optional(),
  mensagem: z.string().optional(),
  visualizado: z.boolean().optional(),
  respondido: z.boolean().optional(),
})
