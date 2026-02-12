export type SolicitacaoStatus = 'aberto' | 'pendente' | 'aguardando_validacao' | 'fechado'
export type SolicitacaoPriority = 'baixa' | 'media' | 'alta'
export type SolicitacaoStage = 'Pendente' | 'Em revisão' | 'Aguardando validação' | 'Fechado'

export interface SolicitacaoCreateInput {
  numero?: string
  titulo: string
  origem: string
  prioridade?: SolicitacaoPriority
  status?: SolicitacaoStatus
  estagio?: SolicitacaoStage
  descricao?: string
  mensagem?: string
  /** Mês do contrato (1-12) para o gráfico de boletos */
  mes?: number
  boletoPath?: string
  notaFiscalPath?: string
  visualizado?: boolean
  visualizadoEm?: Date
  respondido?: boolean
  respondidoEm?: Date
}

export interface SolicitacaoUpdateInput {
  titulo?: string
  origem?: string
  prioridade?: SolicitacaoPriority
  status?: SolicitacaoStatus
  estagio?: SolicitacaoStage
  descricao?: string
  mensagem?: string
  mes?: number
  boletoPath?: string
  notaFiscalPath?: string
  visualizado?: boolean
  visualizadoEm?: Date
  respondido?: boolean
  respondidoEm?: Date
}
