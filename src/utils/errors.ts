import { Response } from 'express'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public field?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const handleError = (error: any, res: Response) => {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      field: error.field,
    })
  }

  console.error('Erro não tratado:', error)
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: error.message,
  })
}
