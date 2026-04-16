import { createClient, SupabaseClient } from '@supabase/supabase-js'

type AnySupabaseClient = SupabaseClient<any, any, any>

// Lazy init — évite crash build-time quand env vars absentes (Vercel preview, CI)
let _client: AnySupabaseClient | null = null

function getSupabaseAdmin() {
  if (!_client) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl) {
      throw new Error('[supabase-admin] NEXT_PUBLIC_SUPABASE_URL is not set!')
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SECRET_KEY) {
      console.error('[supabase-admin] SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY) is not set!')
    }

    _client = createClient<any>(supabaseUrl, supabaseSecretKey || '')
  }
  return _client
}

// Client admin — API routes + SSR, jamais côté client
// Proxy lazy : même interface SupabaseClient, createClient() différé au premier appel runtime
export const supabaseAdmin = new Proxy({} as AnySupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin()
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})
