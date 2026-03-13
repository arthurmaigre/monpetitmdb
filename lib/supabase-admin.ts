import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!

// Client admin — API routes uniquement, jamais côté client
export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey)