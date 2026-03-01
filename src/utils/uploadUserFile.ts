import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import supabase from '../config/supabase'

const BUCKET_UPLOADS = 'uploads'

/** Usar Supabase Storage para persistir anexos (obrigatório em Vercel; opcional local) */
export function useSupabaseStorage(): boolean {
  return !!(process.env.VERCEL || process.env.USE_SUPABASE_STORAGE)
}

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
 * Garante que o bucket de uploads existe no Supabase Storage (chamado antes do primeiro upload).
 */
async function ensureUploadsBucket(): Promise<void> {
  const { error } = await supabase.storage.createBucket(BUCKET_UPLOADS, { public: false })
  if (error && error.message?.toLowerCase().includes('already exists')) return
  if (error) console.warn('[uploadUserFile] createBucket:', error.message)
}

/**
 * Salva um arquivo no Supabase Storage (persistente).
 * Mesmo formato de caminho que o disco: user/{userId}/{filename}
 */
async function saveUserUploadToStorage(
  buffer: Buffer,
  userId: string,
  originalName: string
): Promise<string> {
  await ensureUploadsBucket()
  const ext = path.extname(originalName) || ''
  const hash = generateFileHash(buffer, userId)
  const filename = `user_${userId}_${hash}${ext}`
  const storagePath = `user/${userId}/${filename}`

  const contentType = getContentType(ext)
  const { error } = await supabase.storage
    .from(BUCKET_UPLOADS)
    .upload(storagePath, buffer, { contentType, upsert: true })
  if (error) throw new Error(`Falha ao salvar arquivo no storage: ${error.message}`)
  return storagePath
}

function getContentType(ext: string): string {
  const m: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.xml': 'application/xml',
  }
  return m[ext.toLowerCase()] || 'application/octet-stream'
}

/**
 * Salva um arquivo em /uploads/user/{userId}/ (disco) com nome padronizado.
 */
function saveUserUploadToDisk(
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
  return `user/${userId}/${filename}`
}

/**
 * Salva um arquivo (Storage em produção/Vercel, disco local caso contrário).
 * Retorna caminho relativo: user/{userId}/{filename}
 */
export async function saveUserUploadAsync(
  buffer: Buffer,
  userId: string,
  originalName: string
): Promise<string> {
  if (useSupabaseStorage()) {
    return saveUserUploadToStorage(buffer, userId, originalName)
  }
  return Promise.resolve(saveUserUploadToDisk(buffer, userId, originalName))
}

/**
 * Síncrono: salva em disco. Em ambiente com Storage use create/update que chamam saveUserUploadAsync.
 */
export function saveUserUpload(
  buffer: Buffer,
  userId: string,
  originalName: string
): string {
  return saveUserUploadToDisk(buffer, userId, originalName)
}

/**
 * Obtém o conteúdo do arquivo: do Supabase Storage (se uso Storage) ou do disco.
 * Retorna null se o arquivo não existir.
 */
export async function getFileBuffer(relativePath: string): Promise<Buffer | null> {
  const normalized = relativePath.replace(/^[/\\]+/, '').replace(/\\/g, '/').trim()
  if (useSupabaseStorage()) {
    const { data, error } = await supabase.storage.from(BUCKET_UPLOADS).download(normalized)
    if (error || !data) return null
    return Buffer.from(await data.arrayBuffer())
  }
  const base = getUploadsBase()
  const absolutePath = path.join(base, ...normalized.split('/'))
  if (!fs.existsSync(absolutePath)) return null
  return fs.readFileSync(absolutePath)
}

/**
 * Remove arquivo do Storage (ou do disco). Ignora erros (ex.: já removido).
 */
export async function deleteUserFile(relativePath: string): Promise<void> {
  const normalized = relativePath.replace(/^[/\\]+/, '').replace(/\\/g, '/').trim()
  if (!normalized) return
  if (useSupabaseStorage()) {
    await supabase.storage.from(BUCKET_UPLOADS).remove([normalized])
    return
  }
  const base = getUploadsBase()
  const absolutePath = path.join(base, ...normalized.split('/'))
  if (fs.existsSync(absolutePath)) fs.unlinkSync(absolutePath)
}
