import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

// ──────────────────────────────────────────────────────────────────────────────
// Auth helper
// ──────────────────────────────────────────────────────────────────────────────

async function checkAdminOrCron(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '')

  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return true

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return false

  const { data: profile } = await supabaseAdmin
    .from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin'
}

// ──────────────────────────────────────────────────────────────────────────────
// Regex patterns per strategy
// ──────────────────────────────────────────────────────────────────────────────

interface RegexConfig {
  valid: RegExp[]
  exclude: RegExp[]
}

const REGEX_CONFIGS: Record<string, RegexConfig> = {
  'Locataire en place': {
    valid: [
      /locataire\s+en\s+place/i,
      /vendu\s+lou[eé]/i,
      /bail\s+en\s+cours/i,
      /loyer\s+en\s+place/i,
      /bien\s+occup[eé]\s+lou[eé]/i,
      /occup[eé]\s+par\s+(un\s+)?locataire/i,
      /lou[eé]\s+et\s+occup[eé]/i,
      /vente\s+occup[eé]e?/i,
      /lou[eé]\s+en\s+place/i,
      /bail\s+(actif|restant|en\s+vigueur)/i,
      /locataire\s+(actuel|pr[eé]sent)/i,
      /lou[eé]\s+(actuellement|depuis\s+\d+)/i,
      /revenus?\s+locatifs?\s+de\s+\d+/i,
      /loyer\s+(actuel|en\s+cours|mensuel)\s+.{0,5}\d+/i,
      /rendement\s+(locatif|brut|net)\s+.{0,5}\d+/i,
      /bien\s+lou[eé]\s+(depuis|[àa]|avec)/i,
      /invest\w+\s+locatif\s+(avec|cl[eé]|imm[eé]diat)/i,
    ],
    exclude: [
      /(pas|sans|libre)\s+(de\s+)?locataire/i,
      /libre\s+de\s+(toute\s+)?occupation/i,
      /non\s+(lou[eé]|occup[eé])/i,
      /r[eé]sidence\s+(g[eé]r[eé]e|services?|senior)/i,
    ],
  },
  'Travaux lourds': {
    valid: [
      /[àa]\s+r[eé]nover/i,
      /r[eé]novation\s+(compl[eè]te|totale|enti[eè]re|int[eé]grale|lourde)/i,
      /gros\s+travaux/i,
      /tout\s+[àa]\s+refaire/i,
      /enti[eè]rement\s+[àa]\s+r[eé]nover/i,
      /[àa]\s+r[eé]habiliter/i,
      /travaux\s+importants/i,
      /vendu\s+en\s+l.[eé]tat/i,
      /toiture\s+[àa]\s+refaire/i,
      /mise\s+aux\s+normes/i,
      /inhabitable/i,
      /r[eé]novation\s+totale/i,
      /travaux\s+de\s+r[eé]novation/i,
      /[àa]\s+restaurer/i,
      /r[eé]nover\s+(enti[eè]rement|totalement|compl[eè]tement)/i,
    ],
    exclude: [
      /(pas|sans|aucun)\s+(de\s+)?(gros\s+)?travaux/i,
      /travaux\s+(r[eé]alis[eé]s|effectu[eé]s|termin[eé]s|faits)/i,
      /enti[eè]rement\s+r[eé]nov[eé]/i,
      /r[eé]cemment\s+r[eé]nov[eé]/i,
      /r[eé]novation\s+r[eé]cente/i,
      /refait\s+[àa]\s+neuf/i,
      /(pas|aucun)\s+(besoin\s+)?de\s+travaux/i,
    ],
  },
  'Division': {
    valid: [
      /divis(ible|ion|er)/i,
      /cr[eé]er\s+(des\s+lots|\d+\s+logements|plusieurs\s+logements|deux\s+logements)/i,
    ],
    exclude: [
      /non\s+divisible/i,
      /issu\s+d.une\s+division/i,
      /divis[eé]e?\s+en\s+deux\s+(espaces?|parties?)/i,
      /chambre\s+.{0,10}divisible/i,
      /(pi[eè]ce|salon|s[eé]jour)\s+.{0,10}divisible/i,
      /(jardin|cour)\s+.{0,15}divisible/i,
    ],
  },
  'Découpe': {
    valid: [
      /immeuble\s+de\s+rapport/i,
      /monopropri[eé]t[eé]/i,
      /copropri[eé]t[eé]\s+[àa]\s+cr[eé]er/i,
      /pas\s+(de|en)\s+copropri[eé]t[eé]/i,
      /hors\s+copropri[eé]t[eé]/i,
      /vent(e|u)\s+en\s+bloc/i,
      /plusieurs\s+(lots?|appartements?|logements?)/i,
      /division\s+en\s+plusieurs/i,
      /cr[eé](er|ation)\s+(de\s+)?plusieurs\s+(appartements?|logements?|lots?)/i,
    ],
    exclude: [],
  },
}

function testRegex(text: string, config: RegexConfig): boolean {
  // At least one valid pattern must match
  const hasValid = config.valid.some(re => re.test(text))
  if (!hasValid) return false

  // No exclude pattern must match
  const hasExclude = config.exclude.some(re => re.test(text))
  return !hasExclude
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/admin/regex
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await checkAdminOrCron(req)
    if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json()
    const { strategie, cursor } = body

    if (strategie && !REGEX_CONFIGS[strategie]) {
      return NextResponse.json({ error: 'Stratégie invalide' }, { status: 400 })
    }

    // Query biens not yet checked by regex
    let query = supabaseAdmin
      .from('biens')
      .select('id, created_at, strategie_mdb, moteurimmo_data')
      .eq('statut', 'Toujours disponible')
      .is('regex_statut', null)
      .not('moteurimmo_data', 'is', null)
      .order('created_at', { ascending: true })
      .limit(500)

    if (strategie) {
      query = query.eq('strategie_mdb', strategie)
    }
    if (cursor) {
      query = query.gt('created_at', cursor)
    }

    const { data: biens, error } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!biens || biens.length === 0) {
      return NextResponse.json({ checked: 0, faux_positifs: 0, next_cursor: null })
    }

    let fauxPositifs = 0
    const idsToMarkFP: string[] = []
    const idsValid: string[] = []
    const now = new Date().toISOString()

    for (const bien of biens) {
      const strat = bien.strategie_mdb
      const config = REGEX_CONFIGS[strat]
      if (!config) {
        idsValid.push(bien.id)
        continue
      }

      const md = bien.moteurimmo_data as { title?: string; description?: string } | null
      const text = [md?.title || '', md?.description || ''].join(' ')

      if (!testRegex(text, config)) {
        idsToMarkFP.push(bien.id)
        fauxPositifs++
      } else {
        idsValid.push(bien.id)
      }
    }

    // Batch update faux positifs (50 at a time)
    for (let i = 0; i < idsToMarkFP.length; i += 50) {
      const batch = idsToMarkFP.slice(i, i + 50)
      await supabaseAdmin
        .from('biens')
        .update({ statut: 'Faux positif', regex_statut: 'faux_positif', regex_date: now })
        .in('id', batch)
    }

    // Batch mark valid biens (50 at a time)
    for (let i = 0; i < idsValid.length; i += 50) {
      const batch = idsValid.slice(i, i + 50)
      await supabaseAdmin
        .from('biens')
        .update({ regex_statut: 'valide', regex_date: now })
        .in('id', batch)
    }

    const lastBien = biens[biens.length - 1]
    const nextCursor = biens.length === 500 ? lastBien.created_at : null

    return NextResponse.json({
      checked: biens.length,
      faux_positifs: fauxPositifs,
      next_cursor: nextCursor,
    })
  } catch (err) {
    console.error('Regex validation error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
