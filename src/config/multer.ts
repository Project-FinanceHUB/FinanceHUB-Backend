import multer from 'multer'

// Armazenamento em memória: os arquivos são gravados em disco no controller
// com nomeação padronizada (user_{userId}_{hash}.ext) em /uploads/user/{userId}/
const storage = multer.memoryStorage()

// Filtro de tipos de arquivo
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = {
    boleto: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    notaFiscal: ['application/pdf', 'application/xml', 'text/xml', 'image/jpeg', 'image/jpg', 'image/png'],
  }

  if (file.fieldname === 'boleto' || file.fieldname === 'notaFiscal') {
    const fieldMimes = file.fieldname === 'boleto' ? allowedMimes.boleto : allowedMimes.notaFiscal

    if (fieldMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`Tipo de arquivo não permitido para ${file.fieldname}. Tipos permitidos: PDF, JPG, PNG${file.fieldname === 'notaFiscal' ? ', XML' : ''}`))
    }
  } else {
    cb(null, true)
  }
}

// Limite por arquivo: Vercel tem 4.5 MB no corpo da requisição; 2 MB por arquivo (boleto + nota) deixa margem.
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB por arquivo

// Configuração do multer (memoryStorage para posterior gravação com nome padronizado)
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
})

// Middleware específico para solicitações (boleto e nota fiscal em memória)
export const uploadSolicitacaoFiles = upload.fields([
  { name: 'boleto', maxCount: 1 },
  { name: 'notaFiscal', maxCount: 1 },
])
