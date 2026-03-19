import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET - Liste des articles
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ articles: data })
}

// POST - Creer un article (draft ou generer via Claude)
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, category, keyword, tone, length_target, angle, audience, generate } = body

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
    court: '600 mots', moyen: '1000 mots', long: '1800 mots'
  }

  const systemPrompt = `Tu es le redacteur expert de "Mon Petit MDB" (monpetitmdb.io), LA plateforme francaise de sourcing immobilier pour investisseurs particuliers qui appliquent la methodologie marchand de biens (MDB).

Ce que fait Mon Petit MDB :
- Source automatiquement les meilleures opportunites immobilieres sur toute la France (locataire en place, travaux lourds, division, decoupe)
- Estime le prix de marche de chaque bien via les donnees DVF (transactions notariales reelles)
- Calcule la plus-value potentielle, le cashflow net et la fiscalite selon 5 regimes (micro-foncier, reel, LMNP, SCI IS, marchand de biens)
- Compare les scenarios de revente sur 1 a 5 ans avec tous les frais (notaire, agence, travaux, impots)
- Agrege les annonces de 60+ plateformes (Leboncoin, SeLoger, Bienici, PAP, etc.)

Ta mission : rediger des articles de blog de haute qualite qui eduquent les lecteurs sur l'investissement immobilier tout en demontrant naturellement la valeur ajoutee de Mon Petit MDB.

Regles editoriales :
- Public : investisseurs debutants a intermediaires souhaitant comprendre et appliquer les techniques MDB
- Ton selon la demande (pedagogique / expert / cas pratique / alerte)
- Toujours ancrer dans la realite francaise (droit francais, fiscalite francaise, marche francais)
- Utiliser des exemples chiffres concrets quand c'est pertinent
- Structure claire : titre H1, sous-titres H2/H3, paragraphes, listes si pertinent
- Integrer naturellement le mot-cle SEO demande
- Faire reference a Mon Petit MDB 2 a 3 fois dans l'article de maniere naturelle (pas de spam), en montrant comment l'outil aide concretement sur le point aborde (ex: "Avec Mon Petit MDB, vous pouvez simuler cette operation en quelques clics" ou "Mon Petit MDB calcule automatiquement la fiscalite selon votre regime")
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

  const userPrompt = `Redige un article de blog pour Mon Petit MDB.

Sujet / Titre : ${params.title}
Categorie : ${params.category || 'Investissement immobilier'}
Longueur cible : ${lengthDesc[params.length_target || 'moyen']}
Ton : ${toneLabels[params.tone || 'pedagogique']}
Mot-cle SEO : ${params.keyword || 'marchand de biens'}
Public cible : ${(params.audience || ['Investisseur amateur']).join(', ')}
${params.angle ? `\nInstructions specifiques / angle :\n${params.angle}` : ''}

Redige l'article complet en HTML (h1, h2, h3, p, ul, li, strong, blockquote, table, a). Insere 2-3 [PHOTO:...] aux endroits pertinents. Commence directement par le <h1> sans preambule.`

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY non definie')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  const data = await res.json()
  let html = data.content?.[0]?.text || '<p>Erreur lors de la generation.</p>'

  // Etape 2 : relecture IA (verification des faits + corrections)
  html = await reviewAndCorrect(html, apiKey!)

  // Etape 3 : remplacer les [PHOTO:...] par des images Unsplash
  html = await replacePhotosWithUnsplash(html)

  return html
}

async function reviewAndCorrect(html: string, apiKey: string): Promise<string> {
  // Etape 1 : extraire les affirmations factuelles a verifier
  const extractRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: `Extrais les 3-5 affirmations factuelles les plus importantes a verifier dans cet article (taux, seuils, lois, dates, regles). Reponds en JSON : {"queries": ["taux prelevements sociaux immobilier 2026", "seuil micro foncier 2026", ...]}\n\n${html.substring(0, 3000)}` }],
    }),
  })

  let webContext = ''
  try {
    const extractData = await extractRes.json()
    let raw = extractData.content?.[0]?.text || '{}'
    raw = raw.replace(/```json|```/g, '').trim()
    const { queries } = JSON.parse(raw)

    // Etape 2 : rechercher chaque affirmation sur le web
    if (queries && queries.length > 0) {
      for (const query of queries.slice(0, 4)) {
        try {
          const searchRes = await fetch(`https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_SEARCH_KEY || ''}&cx=${process.env.GOOGLE_SEARCH_CX || ''}&q=${encodeURIComponent(query + ' france 2026')}&num=2`)
          if (searchRes.ok) {
            const searchData = await searchRes.json()
            const snippets = (searchData.items || []).map((item: any) => `[${item.title}] ${item.snippet}`).join('\n')
            if (snippets) webContext += `\nRecherche "${query}" :\n${snippets}\n`
          }
        } catch {}
      }
    }
  } catch {}

  // Etape 3 : relecture avec le contexte web
  const reviewPrompt = `Tu es un relecteur expert en droit immobilier et fiscalite francaise. Ton role est de verifier et corriger un article de blog en t'assurant que TOUTES les informations sont a jour en mars 2026.

REFERENCE FISCALE A JOUR (mars 2026) :
- Prelevements sociaux : 18.6% depuis le 1er janvier 2026 (CSG passee de 9.2% a 10.6%)
- IR sur plus-value immobiliere : 19% (inchange)
- IS : 15% jusqu'a 42 500 EUR, 25% au-dela
- PFU : 30% (12.8% IR + 17.2% PS, mais PS = 18.6% depuis 2026 donc PFU effectif = 31.4% si recalcule)
- Micro-foncier : plafond 15 000 EUR, abattement 30%
- Micro-BIC meuble classique : plafond 77 700 EUR, abattement 50%
- Micro-BIC meuble non classe : plafond 15 000 EUR, abattement 30%
- LMNP : reintegration des amortissements dans le calcul de la PV depuis 2025
- DPE : interdiction location G depuis 2025, F depuis 2028, E depuis 2034
- Frais notaire ancien : 7-8%, neuf : 2-3%, marchand de biens : ~2.5%
- Abattement PV IR : 0% les 5 premieres annees, 6%/an de la 6e a 21e, 4% la 22e = exoneration a 22 ans
- Abattement PV PS : 0% les 5 premieres annees, 1.65%/an de la 6e a 21e, 1.60% la 22e, 9%/an de la 23e a 30e = exoneration a 30 ans
${webContext ? `\nINFORMATIONS WEB RECENTES :\n${webContext}` : ''}

Verifie CHAQUE chiffre, taux, seuil, date et regle mentionne dans l'article. Si une information est obsolete ou incorrecte, corrige-la. Si un taux a change en 2025 ou 2026, mets a jour.

IMPORTANT : retourne UNIQUEMENT le HTML corrige, sans commentaire, sans explication, sans backticks. Commence directement par la premiere balise HTML.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: reviewPrompt,
        messages: [{ role: 'user', content: `Voici l'article a relire et corriger :\n\n${html}` }],
      }),
    })

    const data = await res.json()
    const corrected = data.content?.[0]?.text
    if (corrected && corrected.includes('<')) {
      return corrected
    }
  } catch {}

  return html
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
          url: p.urls.small,
          credit: p.user.name,
        })))

        const imgHtml = `<figure class="ed-photo-picker" data-photos='${photosJson.replace(/'/g, '&#39;')}' data-index="0" style="margin:28px 0">
  <img src="${photo.urls.small}" alt="${query}" style="width:100%;border-radius:10px;max-height:280px;object-fit:cover" />
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
