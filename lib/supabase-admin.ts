import { createClient } from '@supabase/supabase-js'

// Lazy init — évite crash build-time quand env vars absentes (Vercel preview, CI)
let _client: ReturnType<typeof createClient> | null = null

function getSupabaseAdmin() {
  if (!_client) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl) {
      throw new Error('[supabase-admin] NEXT_PUBLIC_SUPABASE_URL is not set!')
    }
    if (!supabaseSecretKey) {
      console.error('[supabase-admin] SUPABASE_SECRET_KEY is not set!')
    }

    _client = createClient(supabaseUrl, supabaseSecretKey || '')
  }
  return _client
}

// Client admin — API routes + SSR, jamais côté client
// Proxy lazy : même interface SupabaseClient, createClient() différé au premier appel runtime
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    const client = getSupabaseAdmin()
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})