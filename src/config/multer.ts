import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'

// No Vercel (serverless) o disco é read-only exceto /tmp. Usar /tmp quando VERCEL estiver setado
// ou quando a criação de ./uploads falhar (ex.: VERCEL ainda não definido na carga do módulo).
function resolveUploadDirs(): { uploadsDir: string; boletoDir: string; notaFiscalDir: string } {
  const base = process.env.VERCEL
    ? path.join('/tmp', process.env.UPLOADS_DIR || 'uploads')
    : (process.env.UPLOADS_DIR || './uploads')
  const uploadsDir = base
  const boletoDir = path.join(base, 'boletos')
  const notaFiscalDir = path.join(base, 'notas-fiscais')
  const dirs = [uploadsDir, boletoDir, notaFiscalDir]
  try {
    dirs.forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    })
    return { uploadsDir, boletoDir, notaFiscalDir }
  } catch (err: any) {
    if ((err?.code === 'ENOENT' || err?.code === 'EACCES') && !process.env.VERCEL) {
      const tmpBase = path.join('/tmp', process.env.UPLOADS_DIR || 'uploads')
      const fallback = [tmpBase, path.join(tmpBase, 'boletos'), path.join(tmpBase, 'notas-fiscais')]
      fallback.forEach((dir) => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      })
      return {
        uploadsDir: tmpBase,
        boletoDir: fallback[1],
        notaFiscalDir: fallback[2],
      }
    }
    throw err
  }
}

const { uploadsDir, boletoDir, notaFiscalDir } = resolveUploadDirs()

// Configuração de armazenamento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'boleto') {
      cb(null, boletoDir)
    } else if (file.fieldname === 'notaFiscal') {
      cb(null, notaFiscalDir)
    } else {
      cb(null, uploadsDir)
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  },
})

// Filtro de tipos de arquivo
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = {
    boleto: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    notaFiscal: ['application/pdf', 'application/xml', 'text/xml', 'image/jpeg', 'image/jpg', 'image/png'],
  }

  // Verificar se o campo é boleto ou notaFiscal
  if (file.fieldname === 'boleto' || file.fieldname === 'notaFiscal') {
    const fieldMimes = file.fieldname === 'boleto' ? allowedMimes.boleto : allowedMimes.notaFiscal

    if (fieldMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Tipo de arquivo não permitido para ${file.fieldname}. Tipos permitidos: PDF, JPG, PNG${file.fieldname === 'notaFiscal' ? ', XML' : ''}`))
    }
  } else {
    // Permitir outros campos (para flexibilidade)
    cb(null, true)
  }
}

// Configuração do multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
})

// Middleware específico para solicitações
export const uploadSolicitacaoFiles = upload.fields([
  { name: 'boleto', maxCount: 1 },
  { name: 'notaFiscal', maxCount: 1 },
])
