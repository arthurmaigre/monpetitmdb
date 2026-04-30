import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildReviewBasePrompt } from '@/lib/editorial'

export const maxDuration = 60

// GET - Liste des articles (ou un article par id pour le polling)
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (id) {
    const { data, error } = await supabaseAdmin.from('articles').select('*').eq('id', id).single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ article: data })
  }

  const { data, error } = await supabaseAdmin
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ articles: data })
}

// Normaliser les categories → 5 categories canoniques alignees audit SEO + guide/sitemap
// Canoniques : Stratégies, Fiscalité, Travaux, Financement, Marché
const CATEGORY_MAP: Record<string, string> = {
  // Strategies
  'Strategies': 'Stratégies', 'Stratégies': 'Stratégies',
  'Strategie d\'investissement': 'Stratégies', 'Stratégie d\'investissement': 'Stratégies',
  'Guide debutant': 'Stratégies', 'Guide débutant': 'Stratégies',
  'Cas pratique': 'Stratégies',
  // Fiscalite
  'Fiscalite': 'Fiscalité', 'Fiscalité': 'Fiscalité',
  // Travaux
  'Travaux': 'Travaux', 'Travaux & rénovation': 'Travaux', 'Travaux & renovation': 'Travaux',
  // Financement
  'Financement': 'Financement',
  // Marche
  'Marche': 'Marché', 'Marché': 'Marché',
  'Marche immobilier': 'Marché', 'Marché immobilier': 'Marché',
}
function normalizeCategory(cat: string): string {
  return CATEGORY_MAP[cat] || cat
}

// POST - Creer un article (draft ou lancer génération async via VPS)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, keyword, tone, length_target, angle, audience, generate } = body
  const category = normalizeCategory(body.category || '')

  if (!title) return NextResponse.json({ error: 'Titre requis' }, { status: 400 })

  const slug = title.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 80)

  if (!generate) {
    const { data, error } = await supabaseAdmin
      .from('articles')
      .insert({ title, slug, category, keyword, tone, length_target, angle, audience: audience || [], status: 'draft' })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ article: data })
  }

  // ── Génération async ────────────────────────────────────────────

  // 1. Construire les prompts
  const { systemPrompt, userPrompt } = buildArticlePrompts({ title, category, keyword, tone, length_target, angle, audience })

  // 2. Créer le stub en Supabase (status='generating')
  const { data: article, error: insertError } = await supabaseAdmin
    .from('articles')
    .insert({ title, slug, category, keyword, tone, length_target, angle, audience: audience || [], status: 'generating' })
    .select()
    .single()
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // 3. Envoyer au VPS (await la confirmation "queued" < 1s, puis VPS génère en background)
  const vpsUrl = process.env.VPS_GENERATION_URL
  if (!vpsUrl) {
    await supabaseAdmin.from('articles').update({ status: 'failed', gen_error: 'VPS_GENERATION_URL non definie' }).eq('id', article.id)
    return NextResponse.json({ article })
  }

  const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.monpetitmdb.fr'}/api/editorial/articles/complete`

  try {
    const vpsRes = await fetch(`${vpsUrl}/generate/article`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-generation-secret': process.env.GENERATION_SECRET || '',
      },
      body: JSON.stringify({
        article_id: article.id,
        callback_url: callbackUrl,
        title,
        category,
        systemPrompt,
        userPrompt,
        googleSearchKey: process.env.GOOGLE_SEARCH_KEY || '',
        googleSearchCx: process.env.GOOGLE_SEARCH_CX || '',
        reviewBasePrompt: buildReviewBasePrompt(),
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!vpsRes.ok) {
      const errText = await vpsRes.text().catch(() => '')
      await supabaseAdmin.from('articles').update({ status: 'failed', gen_error: `VPS ${vpsRes.status}: ${errText}` }).eq('id', article.id)
    }
  } catch (err: any) {
    await supabaseAdmin.from('articles').update({ status: 'failed', gen_error: err.message }).eq('id', article.id)
  }

  // 4. Retourner le stub immédiatement — le frontend poll jusqu'à status != 'generating'
  return NextResponse.json({ article })
}

// DELETE - Supprimer un article
export async function DELETE(request: NextRequest) {
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  await supabaseAdmin
    .from('editorial_calendar')
    .update({ article_id: null, status: 'planned' })
    .eq('article_id', id)

  const { error } = await supabaseAdmin.from('articles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// PATCH - Mettre a jour un article
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  if (updates.status === 'published') {
    updates.published_at = new Date().toISOString()
    fetch('https://www.google.com/ping?sitemap=https://www.monpetitmdb.fr/sitemap.xml').catch(() => {})
  }
  updates.updated_at = new Date().toISOString()

  if (updates.content) {
    updates.word_count = updates.content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter((w: string) => w.length > 0).length
  }

  const { data, error } = await supabaseAdmin
    .from('articles')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ article: data })
}

// ── Helpers ─────────────────────────────────────────────────────
function buildArticlePrompts(params: {
  title: string, category?: string, keyword?: string,
  tone?: string, length_target?: string, angle?: string, audience?: string[]
}): { systemPrompt: string, userPrompt: string } {
  const toneLabels: Record<string, string> = {
    pedagogique: 'Pedagogique et accessible',
    expert: 'Expert et technique',
    'cas-pratique': 'Cas pratique et chiffre',
    alerte: 'Alerte / Mise en garde',
  }
  const lengthDesc: Record<string, string> = {
    court: '800 mots', moyen: '1500 mots', long: '2500 mots', pilier: '3000 mots'
  }

  let effectiveLength = params.length_target || 'moyen'
  if (params.angle) {
    const angleLC = params.angle.toLowerCase()
    if (angleLC.includes('pilier') || angleLC.includes('3000')) effectiveLength = 'pilier'
    else if (angleLC.includes('2500') || angleLC.includes('2000')) effectiveLength = 'long'
    else if (angleLC.includes('1500')) effectiveLength = 'moyen'
    else if (angleLC.includes('800') || angleLC.includes('600')) effectiveLength = 'court'
  }

  const angleLC = (params.angle || '').toLowerCase()
  const isPilier = angleLC.includes('pilier')
  const isVille = angleLC.includes('ville') || angleLC.includes('investir a') || angleLC.includes('investir à')

  const typeInstructions = isPilier
    ? `C'est un ARTICLE PILIER — il doit etre exhaustif, faire autorite sur le sujet, couvrir tous les aspects. Structure riche avec sommaire, sous-sections detaillees, exemples chiffres, tableaux comparatifs, FAQ en fin d'article. C'est la page de reference vers laquelle tous les articles satellites pointeront. Minimum ${lengthDesc[effectiveLength] || '3000 mots'}.`
    : isVille
    ? `C'est une PAGE VILLE — guide local pour investisseurs. Inclure : prix moyen au m2 (donnees DVF), rendement locatif moyen, tension locative, quartiers porteurs, strategies pertinentes (locataire en place, travaux, IDR), nombre de biens disponibles sur Mon Petit MDB. Terminer par un CTA vers la recherche filtree par ville.`
    : `C'est un ARTICLE SATELLITE — il doit etre cible et actionnable sur un sous-sujet precis. Faire un lien naturel vers l'article pilier parent mentionne dans les instructions. ${lengthDesc[effectiveLength] || '1500 mots'}.`

  const systemPrompt = `Tu es le redacteur expert de "Mon Petit MDB" (www.monpetitmdb.fr), la premiere plateforme francaise qui democratise la methodologie marchand de biens pour les investisseurs particuliers.

## POSITIONNEMENT UNIQUE — A INTEGRER DANS CHAQUE ARTICLE

Mon Petit MDB ne se contente pas de lister des annonces. La plateforme apporte une VISION DIFFERENTE de l'investissement immobilier : au lieu d'acheter un bien et esperer que ca marche, l'investisseur analyse chaque opportunite comme le ferait un marchand de biens professionnel — en calculant la plus-value potentielle, le cashflow net, et la fiscalite optimale AVANT d'acheter.

Cette approche "MDB pour particuliers" repose sur 4 piliers :
1. **Sourcing intelligent** : agregation de 60+ plateformes (LBC, SeLoger, Bienici, PAP...) avec detection automatique des biens sous-evalues, des locataires en place, des travaux lourds et des immeubles de rapport
2. **Estimation DVF** : chaque bien est compare aux transactions notariales reelles (donnees DVF) pour connaitre son vrai prix de marche — c'est le prix de revente apres travaux, la base de toute operation MDB
3. **Analyse fiscale complete** : simulation sur 7 regimes fiscaux cote a cote (micro-foncier, reel, LMNP micro/reel, LMP, SCI IS, marchand de biens IS) — l'investisseur voit immediatement quel montage optimise sa rentabilite
4. **Scenario de revente** : waterfall complet sur 1 a 5 ans (prix DVF - frais agence - prix achat - notaire - travaux = PV brute, puis fiscalite selon le regime) — exactement le calcul que fait un MdB pro avant de se positionner

Ce qui differencie Mon Petit MDB de LyBox, Horiz.io ou Castorus :
- Les concurrents calculent un rendement locatif brut. Mon Petit MDB va jusqu'au cashflow net d'impot selon CHAQUE regime fiscal.
- Les concurrents ne simulent pas la revente. Mon Petit MDB modelise l'operation MDB complete : achat → travaux → exploitation locative → revente, avec la fiscalite de la plus-value.
- Les concurrents traitent l'immobilier comme un placement passif. Mon Petit MDB le traite comme une OPERATION ENTREPRENEURIALE, accessible a tous.

## COMMENT INTEGRER CE POSITIONNEMENT

NE PAS se contenter de dire "Mon Petit MDB fait X". A la place, MONTRER comment l'approche MDB change la facon d'analyser chaque sujet aborde dans l'article :
- Si l'article parle de rendement → expliquer que le rendement brut ne suffit pas, qu'il faut raisonner en cashflow net + plus-value comme un MdB, et que Mon Petit MDB fait ce calcul automatiquement
- Si l'article parle de fiscalite → montrer qu'un MdB pro compare toujours plusieurs regimes avant d'acheter, et que Mon Petit MDB simule les 7 regimes pour chaque bien
- Si l'article parle de travaux → expliquer que pour un MdB, les travaux ne sont pas un cout mais un levier de creation de valeur, et que Mon Petit MDB estime le budget et la plus-value apres travaux
- Si l'article parle de villes → montrer que l'approche MDB analyse le potentiel de transformation (division, renovation, decoupe) et pas seulement le rendement locatif

Integrer cette vision 3 a 5 fois dans l'article (introduction, au moins 2 sections, conclusion) de maniere naturelle et argumentee — pas comme un encart publicitaire mais comme un fil rouge pedagogique.

${typeInstructions}

Ta mission : rediger un article de haute qualite qui eduque les lecteurs ET leur fait decouvrir une nouvelle facon d'investir dans l'immobilier grace a la methode marchand de biens democratisee par Mon Petit MDB.

Regles editoriales :
- Adapter le niveau de detail et le vocabulaire au public cible indique
- Ton selon la demande (pedagogique = accessible, exemples simples / expert = technique, references juridiques / cas-pratique = chiffres, simulation complete / alerte = mise en garde, risques)
- Toujours ancrer dans la realite francaise (droit francais, fiscalite francaise, marche francais)
- Utiliser des exemples chiffres concrets quand c'est pertinent
- Structure claire : titre H1, sous-titres H2/H3, paragraphes, listes si pertinent
- Integrer naturellement le mot-cle SEO demande (dans le H1, au moins 2 H2, et dans l'introduction)
- Terminer par une conclusion actionnable avec un appel a l'action vers Mon Petit MDB
- SOURCES OBLIGATOIRES : citer 3 a 6 sources avec liens cliquables en fin d'article dans une section "Sources". Format : <a href="URL">Nom de la source</a>. Ne jamais inventer une URL — utiliser uniquement des sites reels et reconnus. Sources autorisees :
  * Officielles : BOFiP (bofip.impots.gouv.fr), Service-Public.fr, Legifrance, INSEE, economie.gouv.fr, impots.gouv.fr, anil.org, notaires.fr, ecologie.gouv.fr
  * Expertise comptable : experts-comptables.fr, compta-online.com, l-expert-comptable.com, lecoindesentrepreneurs.fr, captaincontrat.com
  * Droit immobilier : village-justice.com, dalloz-actualite.fr, pap.fr/conseils, leparticulier.lefigaro.fr, immobilier-danger.com
  * Investissement immobilier : investissement-locatif.com, rendementlocatif.com, lybox.fr/blog, meilleurtaux.com, empruntis.com, cafpi.fr
  * Fiscalite immobiliere : corrigetonimpot.fr, jedeclaremonmeuble.com, fiscalonline.com, impots-et-finances.com
  * Notaires et juridique : notaires.fr, immobilier.notaires.fr, chambre-paris.notaires.fr
- CHIFFRES CLES : pour illustrer les donnees importantes, utiliser des blocs HTML stylises en "cards" avec la syntaxe suivante. Ne PAS utiliser de tableaux <table>. A la place, utiliser des blocs <div> inline-style pour creer des cartes visuelles :
  <div style="display:flex;gap:16px;margin:28px 0;flex-wrap:wrap">
    <div style="flex:1;min-width:140px;background:#faf7f2;border-radius:8px;padding:20px;text-align:center;border-top:3px solid #c0392b">
      <div style="font-size:28px;font-weight:800;color:#c0392b">19%</div>
      <div style="font-size:12px;color:#9a8f8b;margin-top:4px">Impot sur la PV</div>
    </div>
  </div>
  Adapter le nombre de cartes (2 a 4 par bloc) selon les donnees a presenter.
- PHOTOS : inserer 1 a 2 images maximum dans l'article, uniquement en debut d'article (apres le H1) et eventuellement entre deux grandes sections. Utiliser la syntaxe exacte : [PHOTO:mots-cles tres precis en anglais]. Les mots-cles doivent etre TRES specifiques au sujet immobilier francais. Exemples : [PHOTO:french apartment building facade paris] ou [PHOTO:architect blueprints renovation planning]. Eviter les mots-cles generiques.

Format de sortie : HTML pur (balises h1, h2, h3, p, ul, li, strong, blockquote, div, a uniquement). PAS de balises <table>.`

  const audienceDesc: Record<string, string> = {
    'Débutant complet': 'Debutant complet — pas de jargon, tout expliquer, analogies simples',
    'Investisseur amateur': 'Investisseur amateur — connait les bases, veut comprendre les mecanismes',
    'Profil MDB actif': 'Investisseur actif methode MDB — vocabulaire technique OK, exemples chiffres avances',
    'Professionnel': 'Professionnel immobilier — references juridiques, fiscales, pas de vulgarisation inutile',
  }
  const audienceList = (params.audience || ['Investisseur amateur'])
    .map(a => audienceDesc[a] || a).join('\n- ')

  const userPrompt = `Redige un article de blog pour Mon Petit MDB.

Sujet / Titre : ${params.title}
Type : ${isPilier ? 'ARTICLE PILIER (guide de reference)' : isVille ? 'PAGE VILLE (guide local)' : 'ARTICLE SATELLITE (sous-sujet cible)'}
Categorie : ${params.category || 'Investissement immobilier'}
Longueur cible : ${lengthDesc[effectiveLength] || lengthDesc['moyen']} — RESPECTER cette longueur, ne pas faire plus court.
Ton : ${toneLabels[params.tone || 'pedagogique']}
Mot-cle SEO principal : ${params.keyword || 'marchand de biens'}
Public cible :
- ${audienceList}
${params.angle ? `\nInstructions specifiques / angle :\n${params.angle}` : ''}

Redige l'article complet en HTML (h1, h2, h3, p, ul, li, strong, blockquote, div, a). Insere 1-2 [PHOTO:...] aux endroits pertinents. Commence directement par le <h1> sans preambule.`

  return { systemPrompt, userPrompt }
}
