import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseSecretKey && typeof window === 'undefined') {
  console.error('[supabase-admin] SUPABASE_SECRET_KEY is not set!')
}

// Client admin — API routes + SSR, jamais côté client
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey)