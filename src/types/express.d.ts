import { Multer } from 'multer'

declare global {
  namespace Express {
    interface Request {
      files?: {
        [fieldname: string]: Express.Multer.File[]
      }
    }
  }
}
