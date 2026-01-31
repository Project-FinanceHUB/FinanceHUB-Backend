import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'

// Criar diretório de uploads se não existir
const uploadsDir = process.env.UPLOADS_DIR || './uploads'
const boletoDir = path.join(uploadsDir, 'boletos')
const notaFiscalDir = path.join(uploadsDir, 'notas-fiscais')

// Criar diretórios se não existirem
;[uploadsDir, boletoDir, notaFiscalDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
})

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
