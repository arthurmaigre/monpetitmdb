import { supabaseAdmin } from '@/lib/supabase-admin'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export const SE_PROPERTY_TYPE_MAP: Record<number, string> = {
  0: 'Appartement',
  1: 'Maison',
  2: 'Immeuble',
  3: 'Parking',
  4: 'Bureau',
  5: 'Terrain',
  6: 'Local commercial',
}

export const SE_KEYWORDS: Record<string, string[]> = {
  'Locataire en place': [
    'locataire en place', 'vendu loue', 'bail en cours', 'loyer actuel', 'location en cours',
  ],
  'Travaux lourds': [
    'entierement a renover', 'a renover entierement', 'a renover integralement',
    'a rehabiliter', 'inhabitable', 'tout a refaire', 'toiture a refaire',
    'a restaurer', 'a rafraichir', 'a remettre aux normes', 'a remettre en etat',
    'plateau a amenager', 'bien a renover', 'maison a renover',
    'appartement a renover', 'immeuble a renover',
  ],
  'Division': [
    'division possible', 'potentiel de division', 'bien divisible',
    'maison divisible', 'appartement divisible', 'a diviser',
  ],
  'Immeuble de rapport': [
    'immeuble de rapport', 'copropriete a creer', 'vente en bloc',
    'vendu en bloc', 'immeuble locatif', 'immeuble entierement loue',
  ],
}

const HAIKU_PROMPTS: Record<string, string> = {
  'Locataire en place': "Ce bien immobilier est-il vendu avec un locataire en place (bail d'habitation en cours, loyer actuel mentionné, occupé par un locataire) ? Réponds uniquement OUI ou NON.",
  'Travaux lourds': "Ce bien immobilier nécessite-t-il des travaux lourds (rénovation complète, gros œuvre, inhabitable, tout à refaire) — et non de simples travaux cosmétiques ou de finition ? Réponds uniquement OUI ou NON.",
  'Division': "Ce bien immobilier a-t-il un vrai potentiel de division en plusieurs logements résidentiels indépendants (maison, immeuble, atelier ou entrepôt à convertir en appartements — surface suffisante, accès séparés possibles, mention explicite de division ou conversion) ? Exclus les divisions de bureaux ou locaux commerciaux sans vocation résidentielle. Réponds uniquement OUI ou NON.",
  'Immeuble de rapport': "Ce bien immobilier est-il un immeuble de rapport vendu en bloc (immeuble entier avec plusieurs lots locatifs, monopropriété) ? Réponds uniquement OUI ou NON.",
}

export function detectMatchedKeywords(title: string, description: string, strategie: string): string[] {
  const normalized = (title + ' ' + description)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return (SE_KEYWORDS[strategie] || []).filter(kw => normalized.includes(kw))
}

export async function validateWithHaiku(title: string, description: string, strategie: string): Promise<boolean> {
  const prompt = HAIKU_PROMPTS[strategie]
  if (!prompt) return true

  try {
    const text = `Titre : ${title}\n\nDescription : ${description}`
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 5,
      messages: [{ role: 'user', content: `${prompt}\n\n${text}` }],
    })
    const answer = (response.content[0] as { type: string; text: string }).text.trim().toUpperCase()
    return answer.startsWith('OUI')
  } catch (err) {
    console.error('[SE ingest] Haiku error:', err)
    return true // fail open
  }
}

export function mapPublisherType(type: number | undefined): string | null {
  if (type === 0) return 'particulier'
  if (type === 1) return 'professionnel'
  return null
}

export function buildBienPayload(
  property: any,
  advert: any,
  strategie: string,
  metropoleMap: Map<string, string>,
  sourceKeywords: string[],
  isValid: boolean,
): Record<string, unknown> {
  const surface = property.surface || advert.surface || null
  const prix_fai = advert.price || null
  const code_postal = property.city?.zipcode || null

  return {
    url: advert.url,
    strategie_mdb: strategie,
    statut: isValid ? 'Toujours disponible' : 'Faux positif',
    type_bien: SE_PROPERTY_TYPE_MAP[property.propertyType] || null,
    prix_fai,
    surface,
    prix_m2: prix_fai && surface ? Math.round((prix_fai / surface) * 100) / 100 : null,
    nb_pieces: property.room ? `T${property.room}` : (advert.room ? `T${advert.room}` : null),
    nb_chambres: property.bedroom || advert.bedroom || null,
    etage: advert.floor !== undefined && advert.floor !== null
      ? (advert.floor === 0 ? 'RDC' : String(advert.floor))
      : null,
    annee_construction: advert.constructionYear || property.constructionYear || null,
    dpe: advert.energy?.category || null,
    dpe_valeur: advert.energy?.value || null,
    ges: advert.greenHouseGas?.category || null,
    ville: property.city?.name || null,
    code_postal,
    metropole: code_postal ? (metropoleMap.get(code_postal) || null) : null,
    photo_url: advert.pictures?.[0] || property.pictures?.[0] || null,
    latitude: property.location?.lat ?? property.locations?.lat ?? null,
    longitude: property.location?.lon ?? property.locations?.lon ?? null,
    surface_terrain: advert.landSurface || property.landSurface || null,
    stream_estate_id: property.uuid,
    source_provider: 'stream_estate',
    publisher_type: mapPublisherType(advert.publisher?.type),
    price_history: advert.events?.length ? advert.events : null,
    regex_statut: isValid ? 'valide' : 'faux_positif',
    source_keywords: sourceKeywords.length > 0 ? sourceKeywords : null,
    ...(advert.elevator === true || property.elevator === true ? { ascenseur: true } : {}),
    ...(advert.elevator === false || property.elevator === false ? { ascenseur: false } : {}),
    ...(advert.condominiumFees ? { charges_copro: Math.round(advert.condominiumFees / 12) } : {}),
    ...(advert.propertyTax ? { taxe_fonc_ann: advert.propertyTax } : {}),
    moteurimmo_data: {
      uniqueId: property.uuid,
      origin: advert.publisher?.name || null,
      title: advert.title || property.title || null,
      description: advert.description || property.description || null,
      pictureUrls: advert.pictures || property.pictures || [],
      publisher: { name: advert.contact?.name || null },
      duplicates: (property.adverts || [])
        .filter((a: any) => a.url !== advert.url)
        .map((a: any) => ({ url: a.url, origin: a.publisher?.name || null })),
      category: SE_PROPERTY_TYPE_MAP[property.propertyType] || null,
      creationDate: advert.createdAt || null,
      source: 'stream_estate',
      priceHistory: advert.events || null,
      stations: property.stations || null,
      features: advert.features || null,
    },
  }
}

export async function findExistingBien(
  url: string,
  property: any,
  advert: any,
): Promise<{ id: number; source_provider: string } | null> {
  const { data: byUrl } = await supabaseAdmin
    .from('biens')
    .select('id, source_provider')
    .eq('url', url)
    .limit(1)
    .single()
  if (byUrl) return byUrl

  if (property.uuid) {
    const { data: bySeid } = await supabaseAdmin
      .from('biens')
      .select('id, source_provider')
      .eq('stream_estate_id', property.uuid)
      .limit(1)
      .single()
    if (bySeid) return bySeid
  }

  const { data: bySourceUrl } = await supabaseAdmin
    .from('biens_source_urls')
    .select('bien_id')
    .eq('url', url)
    .limit(1)
    .single()
  if (bySourceUrl) {
    const { data: bienFromUrl } = await supabaseAdmin
      .from('biens')
      .select('id, source_provider')
      .eq('id', bySourceUrl.bien_id)
      .single()
    if (bienFromUrl) return bienFromUrl
  }

  const code_postal = property.city?.zipcode
  const surface = property.surface || advert.surface
  const prix = advert.price
  const type_bien = SE_PROPERTY_TYPE_MAP[property.propertyType]
  const nb_pieces = property.room ? `T${property.room}` : null

  if (code_postal && surface && prix && type_bien && nb_pieces) {
    const { data: byGeo } = await supabaseAdmin
      .from('biens')
      .select('id, source_provider')
      .eq('code_postal', code_postal)
      .eq('type_bien', type_bien)
      .eq('nb_pieces', nb_pieces)
      .gte('surface', surface - 1)
      .lte('surface', surface + 1)
      .gte('prix_fai', prix * 0.98)
      .lte('prix_fai', prix * 1.02)
      .limit(1)
      .single()
    if (byGeo) return byGeo
  }

  return null
}

let _metropoleMap: Map<string, string> | null = null

export async function getMetropoleMap(): Promise<Map<string, string>> {
  if (_metropoleMap) return _metropoleMap
  const { data: communes } = await supabaseAdmin
    .from('ref_communes')
    .select('code_postal, metropole')
    .not('metropole', 'is', null)
  _metropoleMap = new Map<string, string>()
  if (communes) {
    for (const c of communes) {
      if (c.metropole) _metropoleMap.set(c.code_postal, c.metropole)
    }
  }
  return _metropoleMap
}

export async function insertBienWithUrls(
  bien: Record<string, unknown>,
  property: any,
  advert: any,
): Promise<{ action: string; id?: number; error?: string }> {
  const { data: inserted, error } = await supabaseAdmin
    .from('biens')
    .insert(bien)
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { action: 'duplicate', id: undefined }
    return { action: 'error', error: error.message }
  }

  if (inserted?.id) {
    const urlsToInsert: { bien_id: number; url: string }[] = []
    if (advert.url) urlsToInsert.push({ bien_id: inserted.id, url: advert.url })
    const otherAdverts = (property.adverts || []).filter((a: any) => a.url && a.url !== advert.url)
    for (const a of otherAdverts) {
      urlsToInsert.push({ bien_id: inserted.id, url: a.url })
    }
    if (urlsToInsert.length > 0) {
      await supabaseAdmin
        .from('biens_source_urls')
        .upsert(urlsToInsert, { onConflict: 'url', ignoreDuplicates: true })
    }
  }

  return { action: 'inserted', id: inserted?.id }
}
