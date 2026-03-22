import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ──────────────────────────────────────────────────────────────────────────────
// Options mapping (shared with ingest)
// ──────────────────────────────────────────────────────────────────────────────

function mapOptionsToFields(options: string[] | undefined) {
  const fields: Record<string, unknown> = {}
  if (!options) return fields

  for (const opt of options) {
    switch (opt) {
      case 'hasLift': fields.ascenseur = true; break
      case 'hasNoLift': fields.ascenseur = false; break
      case 'hasCave': fields.has_cave = true; break
      case 'hasSwimmingPool': fields.has_piscine = true; break
      case 'hasGarage': fields.parking_type = 'box_ferme'; break
      case 'hasParking': if (!fields.parking_type) fields.parking_type = 'parking_ouvert'; break
      case 'hasTerrace': fields.acces_exterieur = 'Terrasse'; break
      case 'hasBalcony': if (!fields.acces_exterieur) fields.acces_exterieur = 'Balcon'; break
      case 'hasGarden': fields.acces_exterieur = 'Jardin'; break
    }
  }
  return fields
}

// ──────────────────────────────────────────────────────────────────────────────
// Detect strategie from keywords in title+description
// ──────────────────────────────────────────────────────────────────────────────

const STRATEGY_KEYWORDS: { strategie: string; patterns: RegExp[] }[] = [
  {
    strategie: 'Locataire en place',
    patterns: [/locataire\s+en\s+place/i, /vendu\s+lou[eé]/i, /bail\s+en\s+cours/i],
  },
  {
    strategie: 'Travaux lourds',
    patterns: [/[àa]\s+r[eé]nover/i, /gros\s+travaux/i, /r[eé]novation\s+(compl[eè]te|totale)/i, /inhabitable/i],
  },
  {
    strategie: 'Division',
    patterns: [/divis(ible|ion|er)/i, /cr[eé]er\s+(des\s+lots|plusieurs\s+logements)/i],
  },
  {
    strategie: 'Découpe',
    patterns: [/immeuble\s+de\s+rapport/i, /monopropri[eé]t[eé]/i, /vent(e|u)\s+en\s+bloc/i],
  },
]

function detectStrategie(text: string): string | null {
  for (const { strategie, patterns } of STRATEGY_KEYWORDS) {
    if (patterns.some(re => re.test(text))) return strategie
  }
  return null
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/moteurimmo/webhook — No auth (called by Moteur Immo)
// ──────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const ad = await req.json()

    if (!ad || !ad.url) {
      return NextResponse.json({ error: 'URL manquante' }, { status: 400 })
    }

    // Detect metropole
    const code_postal = ad.location?.postalCode || null
    let metropole: string | null = null
    if (code_postal) {
      const { data: commune } = await supabaseAdmin
        .from('ref_communes')
        .select('metropole')
        .eq('code_postal', code_postal)
        .not('metropole', 'is', null)
        .limit(1)
        .single()
      metropole = commune?.metropole || null
    }

    // Detect strategie from content
    const text = [ad.title || '', ad.description || ''].join(' ')
    const strategie = detectStrategie(text) || 'Travaux lourds' // default fallback

    const optionFields = mapOptionsToFields(ad.options)
    const loyer = ad.rent || ad.priceStats?.rent || null
    const surface = ad.surface || null
    const prix_fai = ad.price || null

    const bien: Record<string, unknown> = {
      url: ad.url,
      strategie_mdb: strategie,
      statut: 'Toujours disponible',
      prix_fai,
      surface,
      prix_m2: prix_fai && surface ? Math.round((prix_fai / surface) * 100) / 100 : null,
      nb_pieces: ad.rooms ? `T${ad.rooms}` : null,
      etage: ad.floor !== undefined && ad.floor !== null ? (ad.floor === 0 ? 'RDC' : String(ad.floor)) : null,
      dpe: ad.energyGrade || null,
      loyer,
      charges_copro: ad.propertyCharges || null,
      taxe_fonc_ann: ad.propertyTax || null,
      ville: ad.location?.city || null,
      code_postal,
      metropole,
      photo_url: ad.pictureUrls?.[0] || null,
      longitude: ad.position?.[0] || null,
      latitude: ad.position?.[1] || null,
      rendement_brut: loyer && prix_fai ? Math.round((loyer * 12 / prix_fai) * 10000) / 10000 : null,
      moteurimmo_data: {
        uniqueId: ad.uniqueId,
        origin: ad.origin,
        adId: ad.adId,
        title: ad.title,
        description: ad.description,
        publisher: ad.publisher,
        pictureUrls: ad.pictureUrls,
        options: ad.options,
        duplicates: ad.duplicates,
        priceStats: ad.priceStats,
        originalPrice: ad.originalPrice,
        priceDrop: ad.priceDrop,
        creationDate: ad.creationDate,
        lastPriceChangeDate: ad.lastPriceChangeDate,
        lastPublicationDate: ad.lastPublicationDate,
        deletionDate: ad.deletionDate,
      },
      ...optionFields,
    }

    // Upsert by url
    const { error } = await supabaseAdmin
      .from('biens')
      .upsert(bien, { onConflict: 'url' })

    if (error) {
      // Fallback: try update
      if (error.code === '23505') {
        const { error: updateErr } = await supabaseAdmin
          .from('biens')
          .update(bien)
          .eq('url', bien.url)
        if (updateErr) {
          console.error(`Webhook update error: ${updateErr.message}`)
          return NextResponse.json({ error: updateErr.message }, { status: 500 })
        }
      } else {
        console.error(`Webhook upsert error: ${error.message}`)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur interne' },
      { status: 500 }
    )
  }
}
