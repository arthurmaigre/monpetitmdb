import { createClient, SupabaseClient } from '@supabase/supabase-js'

type AnySupabaseClient = SupabaseClient<any, any, any>

// Lazy init — évite crash build-time quand NEXT_PUBLIC env vars absentes (Vercel preview, CI)
let _client: AnySupabaseClient | null = null

function getSupabase() {
  if (!_client) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set!')
    }

    _client = createClient<any>(supabaseUrl, supabaseAnonKey)
  }
  return _client
}

// Client public — utilisable partout (pages, composants)
// Proxy lazy : createClient() différé au premier appel runtime
export const supabase = new Proxy({} as AnySupabaseClient, {
  get(_target, prop) {
    const client = getSupabase()
    const value = (client as any)[prop]
    if (typeof value === 'function') {
      return value.bind(client)
    }
    return value
  },
})