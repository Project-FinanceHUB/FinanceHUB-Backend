import { Response } from 'express'

/**
 * Resposta padronizada para exclusões.
 * Todas as rotas DELETE devem retornar 200 com { message } em caso de sucesso.
 * O front-end deve exibir sempre o modal de confirmação (ConfirmDeleteModal) antes de chamar DELETE.
 */
export function deleteSuccess(res: Response, message: string) {
  return res.status(200).json({ message })
}
