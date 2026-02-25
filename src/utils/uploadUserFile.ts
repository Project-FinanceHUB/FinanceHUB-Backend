import crypto from 'crypto'
import path from 'path'
import fs from 'fs'

/** Tamanho do hash (entre 8 e 16 caracteres) */
const HASH_LENGTH = 12

/**
 * Retorna o diretório base de uploads (compatível com Vercel e local).
 */
export function getUploadsBase(): string {
  const base = process.env.VERCEL
    ? path.join('/tmp', process.env.UPLOADS_DIR || 'uploads')
    : (process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'))
  return base
}

/**
 * Gera hash único com base em conteúdo do arquivo, timestamp e ID do usuário.
 * Usa SHA-256 limitado a 8–16 caracteres (padrão 12).
 */
function generateFileHash(buffer: Buffer, userId: string, hashLength: number = HASH_LENGTH): string {
  const timestamp = Buffer.from(String(Date.now()))
  const userIdBuf = Buffer.from(userId, 'utf8')
  const combined = Buffer.concat([buffer, timestamp, userIdBuf])
  const hash = crypto.createHash('sha256').update(combined).digest('hex')
  return hash.slice(0, Math.min(16, Math.max(8, hashLength)))
}

/**
 * Salva um arquivo em /uploads/user/{userId}/ com nome padronizado:
 * user_{userId}_{hash}.{extensao}
 *
 * @param buffer - Conteúdo do arquivo
 * @param userId - ID do usuário (contexto)
 * @param originalName - Nome original (usado apenas para extensão)
 * @returns Caminho relativo ao base de uploads, ex: user/15/user_15_a8f3c9d2.jpg
 */
export function saveUserUpload(
  buffer: Buffer,
  userId: string,
  originalName: string
): string {
  const base = getUploadsBase()
  const ext = path.extname(originalName) || ''
  const hash = generateFileHash(buffer, userId)
  const filename = `user_${userId}_${hash}${ext}`
  const userDir = path.join(base, 'user', userId)
  const absolutePath = path.join(userDir, filename)

  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true })
  }

  fs.writeFileSync(absolutePath, buffer)

  // Retorna caminho relativo ao base com barras (portável para banco e URLs)
  return `user/${userId}/${filename}`
}
