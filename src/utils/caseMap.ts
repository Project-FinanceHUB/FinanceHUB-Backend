/**
 * Converte chaves snake_case para camelCase (resposta do Supabase -> API).
 */
export function toCamel<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => toCamel(item)) as T
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      result[camelKey] = toCamel(value)
    }
    return result as T
  }
  return obj as T
}

/**
 * Converte chaves camelCase para snake_case (API -> Supabase).
 */
export function toSnake<T = unknown>(obj: unknown): T {
  if (obj === null || obj === undefined) {
    return obj as T
  }
  if (obj instanceof Date) {
    return obj as T
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => toSnake(item)) as T
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
      result[snakeKey] = toSnake(value)
    }
    return result as T
  }
  return obj as T
}
