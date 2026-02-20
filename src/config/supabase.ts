import 'dotenv/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Aceita SUPABASE_SERVICE_KEY ou SUPABASE_SERVICE_ROLE_KEY (usado pela integração Vercel + Supabase)
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL e SUPABASE_SERVICE_KEY (ou SUPABASE_SERVICE_ROLE_KEY) devem estar definidos')
}

/**
 * Cliente Supabase com Service Role Key (backend).
 * Usado para operações que não passam pelo Auth do Supabase (sessões próprias).
 */
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export default supabase
