import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const maxDuration = 300

// GET - Liste des articles
export async function GET() {
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

// POST - Creer un article (draft ou generer via Claude)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, keyword, tone, length_target, angle, audience, generate } = body
  const category = normalizeCategory(body.category || '')

  if (!title) return NextResponse.json({ error: 'Titre requis' }, { status: 400 })

  // Creer le slug
  const slug = title.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 80)

  if (generate) {
    // Generer l'article via Claude API
    const content = await generateArticleContent({ title, category, keyword, tone, length_target, angle, audience })

    const wordCount = content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter((w: string) => w.length > 0).length
    const seoScore = Math.min(95, 55 + (keyword ? 15 : 0) + (wordCount > 800 ? 15 : 5) + Math.floor(Math.random() * 10))

    const { data, error } = await supabaseAdmin
      .from('articles')
      .insert({
        title, slug, category, keyword, tone, length_target, angle,
        audience: audience || [],
        content,
        status: 'review',
        word_count: wordCount,
        seo_score: seoScore,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ article: data })

  } else {
    // Juste creer un draft
    const { data, error } = await supabaseAdmin
      .from('articles')
      .insert({ title, slug, category, keyword, tone, length_target, angle, audience: audience || [], status: 'draft' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ article: data })
  }
}

// DELETE - Supprimer un article
export async function DELETE(request: NextRequest) {
  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

  // Remettre les entrees du calendrier editorial en "planned" avant suppression
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
    // Ping Google pour re-crawler le sitemap apres publication
    fetch('https://www.google.com/ping?sitemap=https://www.monpetitmdb.fr/sitemap.xml').catch(() => {})
  }
  updates.updated_at = new Date().toISOString()

  // Recalculer word_count si content change
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

// ── Generation Claude ────────────────────────────────────────────
async function generateArticleContent(params: {
  title: string, category?: string, keyword?: string,
  tone?: string, length_target?: string, angle?: string, audience?: string[]
}): Promise<string> {
  const toneLabels: Record<string, string> = {
    pedagogique: 'Pedagogique et accessible',
    expert: 'Expert et technique',
    'cas-pratique': 'Cas pratique et chiffre',
    alerte: 'Alerte / Mise en garde',
  }
  const lengthDesc: Record<string, string> = {
    court: '800 mots', moyen: '1500 mots', long: '2500 mots', pilier: '3000 mots'
  }

  // Detecter la longueur cible depuis l'angle du calendrier editorial
  let effectiveLength = params.length_target || 'moyen'
  if (params.angle) {
    const angleLC = params.angle.toLowerCase()
    if (angleLC.includes('pilier') || angleLC.includes('3000')) effectiveLength = 'pilier'
    else if (angleLC.includes('2500') || angleLC.includes('2000')) effectiveLength = 'long'
    else if (angleLC.includes('1500')) effectiveLength = 'moyen'
    else if (angleLC.includes('800') || angleLC.includes('600')) effectiveLength = 'court'
  }

  // Detecter le type d'article depuis l'angle
  const angleLC = (params.angle || '').toLowerCase()
  const isPilier = angleLC.includes('pilier')
  const isVille = angleLC.includes('ville') || angleLC.includes('investir a') || angleLC.includes('investir à')
  const isSatellite = !isPilier && !isVille

  // Adapter les consignes selon le type
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

  const vpsUrl = process.env.VPS_GENERATION_URL
  if (!vpsUrl) throw new Error('VPS_GENERATION_URL non definie')

  let html = await callVpsArticle({
    title: params.title,
    category: params.category || '',
    systemPrompt,
    userPrompt,
    googleSearchKey: process.env.GOOGLE_SEARCH_KEY || '',
    googleSearchCx: process.env.GOOGLE_SEARCH_CX || '',
    reviewBasePrompt: buildReviewBasePrompt(),
  })

  html = await replacePhotosWithUnsplash(html)
  return html
}

async function callVpsArticle(payload: {
  title: string, category: string,
  systemPrompt: string, userPrompt: string,
  googleSearchKey: string, googleSearchCx: string,
  reviewBasePrompt: string,
}): Promise<string> {
  const res = await fetch(`${process.env.VPS_GENERATION_URL}/generate/article`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-generation-secret': process.env.GENERATION_SECRET || '',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(270_000),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`VPS error ${res.status}: ${err}`)
  }
  const data = await res.json()
  return data.html || '<p>Erreur : reponse VPS vide.</p>'
}

function buildReviewBasePrompt(): string {
  const now = new Date()
  const monthNames = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre']
  const currentDateStr = `${monthNames[now.getMonth()]} ${now.getFullYear()}`

  return `Tu es un relecteur expert en droit immobilier et fiscalite francaise. Ton role est de verifier et corriger un article de blog en t'assurant que TOUTES les informations sont exactes et a jour en ${currentDateStr}.

## REFERENCE FISCALE VERIFIEE (${currentDateStr})

Ces chiffres sont CERTAINS — utilise-les comme reference :
- Prelevements sociaux : 17.2% (CSG 9.2% + CRDS 0.5% + prelevement solidarite 7.5%)
- IR sur plus-value immobiliere : 19% (taux forfaitaire)
- IS : 15% jusqu'a 42 500 EUR de benefice, 25% au-dela
- PFU (flat tax) : 30% (12.8% IR + 17.2% PS)
- Micro-foncier : plafond 15 000 EUR de revenus fonciers, abattement 30%
- Micro-BIC meuble classique : plafond 77 700 EUR, abattement 50%
- Micro-BIC meuble de tourisme non classe : plafond 15 000 EUR, abattement 30%
- LMNP reel : amortissement composants deductible, reintegration dans calcul PV depuis LFI 2025
- LMP : seuil 23 000 EUR de recettes ET plus de 50% des revenus du foyer. Cotisations SSI ~45%.
- Deficit foncier : imputable sur revenu global jusqu'a 10 700 EUR/an (21 400 EUR si Loc'Avantages)
- DPE : interdiction location G depuis 1er janvier 2025, F prevu 2028, E prevu 2034
- Frais notaire ancien : 7-8%, neuf : 2-3%, marchand de biens : ~2.5%
- Abattement PV IR : 6%/an de la 6e a la 21e annee, 4% la 22e = exoneration IR a 22 ans
- Abattement PV PS : 1.65%/an de la 6e a la 21e annee, 1.60% la 22e, 9%/an de la 23e a la 30e = exoneration totale a 30 ans
- TVA sur marge MdB : marge x 20/120 (TVA "en dedans")
- MaPrimeRenov : montant variable selon revenus et type de travaux. Ne pas inventer de pourcentage.
- Taux de credit immobilier : ne pas inventer de fourchette, dire "selon les conditions de marche" si pas de source.

## REGLE ABSOLUE — DONNEES DE MARCHE

Tu n'as PAS le droit d'inventer :
- Un prix au m2 ou un loyer absent des INFORMATIONS WEB RECENTES ci-dessous
- Un rendement locatif chiffre non source
- Un volume de transactions immobilieres
- Un taux de credit absent des INFORMATIONS WEB RECENTES ci-dessous

Si la donnee n'est pas dans INFORMATIONS WEB RECENTES ou dans REFERENCE FISCALE :
formulation qualitative obligatoire : "parmi les plus eleves", "en hausse", jamais de chiffre invente

## REGLES DE VERIFICATION

1. **Chiffres certains** : si le chiffre est dans la reference ci-dessus, verifie qu'il correspond exactement. Corrige si different.

2. **Chiffres incertains** (taux de credit, prix moyens, montants d'aides, pourcentages de marche) :
   - Si INFORMATIONS WEB RECENTES a fourni un chiffre recent → utilise-le avec la source
   - Si tu es SUR du chiffre par tes connaissances → garde-le tel quel
   - Si tu as un DOUTE → reformule de facon qualitative
   - NE JAMAIS remplacer un chiffre par "Variable" ou "N/A" — soit tu corriges, soit tu gardes, soit tu reformules en texte.

3. **Affirmations juridiques** : verifie que les conditions, seuils et regles sont exacts. En cas de doute, ajouter "sous certaines conditions".

4. **Cards HTML (div style="display:flex")** : Ne JAMAIS remplacer leur contenu par "Variable". Si un chiffre est incertain, remplace par un chiffre raisonnable ou supprime la card.

5. **Donnees de marche** : tout chiffre de prix/m2, loyer, rendement ou taux absent des INFORMATIONS WEB RECENTES → remplacer par qualitatif. Si present dans INFORMATIONS WEB → verifier qu'il est source dans l'article.

6. **Exemples chiffres** : les exemples de simulation (loyer, prix, charges) sont illustratifs — ne pas les modifier sauf si les TAUX ou REGLES appliques sont faux.

7. **Sources en fin d'article** : verifier que les URLs pointent vers des domaines reels. Supprimer toute URL inventee.

IMPORTANT : retourne UNIQUEMENT le HTML corrige, sans commentaire, sans explication, sans backticks. Commence directement par la premiere balise HTML.`
}

async function replacePhotosWithUnsplash(html: string): Promise<string> {
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY
  if (!unsplashKey) return html.replace(/\[PHOTO:[^\]]+\]/g, '')

  const photoRegex = /\[PHOTO:([^\]]+)\]/g
  const matches = [...html.matchAll(photoRegex)]

  for (const match of matches) {
    const query = match[1].trim()
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&client_id=${unsplashKey}`
      )
      const data = await res.json()
      const photo = data.results?.[0]

      if (photo) {
        // Recuperer 6 alternatives pour le selecteur
        const allPhotos = data.results?.slice(0, 6) || [photo]
        const photosJson = JSON.stringify(allPhotos.map((p: any) => ({
          url: p.urls.regular,
          credit: p.user.name,
        })))

        const imgHtml = `<figure class="ed-photo-picker" data-photos='${photosJson.replace(/'/g, '&#39;')}' data-index="0" style="margin:28px 0">
  <img src="${photo.urls.regular}" alt="${query}" style="width:100%;border-radius:10px;max-height:280px;object-fit:cover" />
  <figcaption style="font-size:11px;color:#9a8f8b;margin-top:8px;text-align:center">Photo : ${photo.user.name} / Unsplash</figcaption>
</figure>`
        html = html.replace(match[0], imgHtml)
      } else {
        html = html.replace(match[0], '')
      }
    } catch {
      html = html.replace(match[0], '')
    }
  }

  return html
}
