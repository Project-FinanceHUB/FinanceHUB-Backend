export type MensagemDirecao = 'enviada' | 'recebida'

export interface Mensagem {
  id: string
  solicitacaoId?: string
  direcao: MensagemDirecao
  assunto: string
  conteudo: string
  remetente: string
  dataHora: string
  lida: boolean
  anexo?: string
}

export interface MensagemCreateInput {
  solicitacaoId?: string
  direcao: MensagemDirecao
  assunto: string
  conteudo: string
  remetente: string
  anexo?: string
}

export interface MensagemUpdateInput {
  assunto?: string
  conteudo?: string
  lida?: boolean
  anexo?: string
}
