import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const maxDuration = 300

// GET - Recuperer le calendrier
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('editorial_calendar')
    .select('*, article:articles(id, title, status, slug)')
    .order('week_start', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ calendar: data })
}

// POST - Generer le calendrier 52 semaines via Claude
export async function POST(request: NextRequest) {
  const body = await request.json()
  const startDate = body.startDate || new Date().toISOString().slice(0, 10)

  const vpsUrl = process.env.VPS_GENERATION_URL
  if (!vpsUrl) return NextResponse.json({ error: 'VPS_GENERATION_URL non definie' }, { status: 500 })

  const systemPrompt = `Tu es le directeur editorial de "Mon Petit MDB", une plateforme francaise d'investissement immobilier pour investisseurs amateurs appliquant la methode marchand de biens (MDB).

Tu dois planifier une ligne editoriale coherente sur 52 semaines, avec exactement 1 article par semaine.

## STRATEGIE SEO — 5 CLUSTERS PILIER + SATELLITES

L'architecture de contenu est basee sur 5 piliers avec des articles satellites qui pointent vers le pilier. Les articles sont publies sous /blog/[slug].

### Semaines 1-12 DEJA PLANIFIEES (ne pas modifier) :
S1: [PILIER P0] Encheres judiciaires immobilieres : guide complet 2026 (keyword: encheres judiciaires immobilieres)
S2: [SATELLITE S1] TVA sur marge immobilier : guide complet pour marchands de biens (keyword: TVA marge marchand de biens)
S3: [PILIER P0] Investir comme un marchand de biens : la methode complete (keyword: marchand de biens)
S4: [SATELLITE S1] Mise a prix vs prix adjuge : comment calculer sa decote aux encheres (keyword: vente judiciaire immobilier)
S5: [PILIER P1] Immeuble de rapport : guide complet (keyword: immeuble de rapport)
S6: [SATELLITE P3] Locataire en place : opportunite ou piege ? (keyword: locataire en place achat)
S7: [PAGES VILLES] Lyon, Marseille, Bordeaux, Lille, Nantes — comparatif 2026 (keyword: meilleure ville investissement locatif)
S8: [PILIER P1] Fiscalite immobiliere : les 7 regimes compares (keyword: fiscalite marchand de biens)
S9: [PILIER P2] Division immobiliere : creer de la valeur avec la methode MdB (keyword: division immobiliere)
S10: [PAGES VILLES] Toulouse, Rennes, Strasbourg, Montpellier, Grenoble, Rouen, Nantes, Nice (keyword: investir immobilier metropoles)
S11: [SATELLITE P2] Achat-revente immobilier : fiscalite et strategie (keyword: achat revente immobilier)
S12: [PAGES VILLES] 9 dernieres villes + bilan strategie 2026 (keyword: investir immobilier France)

### Semaines 13-52 : A PLANIFIER selon les priorites ci-dessous.

**SATELLITES OBLIGATOIRES A PLACER EN PRIORITE (semaines 13-30) :**
Ces articles decoulent des piliers etablis en S1-S12. Reprends les titres et keywords exacts :

Cluster Encheres judiciaires (satellites restants) :
- Comment acheter aux encheres judiciaires sans avocat ? (keyword: acheter encheres judiciaires, 150-300/mois) — spoiler impossible mais expliquer pourquoi
- Investir aux encheres judiciaires : risques et opportunites (keyword: investir encheres judiciaires, 150-300/mois)
- Frais encheres judiciaires : le vrai cout total (keyword: frais vente judiciaire, 100-200/mois)

Cluster Marchand de biens (satellites restants) :
- Comment devenir marchand de biens : conditions et demarches (keyword: comment devenir marchand de biens, 200-400/mois)
- Revente a la decoupe : strategie et fiscalite (keyword: revente a la decoupe, 1000-2000/mois)
- Frais de notaire marchand de biens : le vrai cout (keyword: frais notaire marchand de biens, 800-1500/mois)
- BIC vs IS pour marchand de biens : quel regime choisir ? (keyword: fiscalite marchand de biens, 150-300/mois)

Cluster Immeuble de rapport (satellites restants) :
- Immeuble de rapport : rentabilite et risques (keyword: immeuble de rapport rentabilite, 1500-2500/mois)
- Financer un immeuble de rapport (keyword: financer immeuble de rapport, 800-1500/mois)
- Score travaux : evaluer l'etat d'un bien immobilier (keyword: score travaux immobilier, 500-1000/mois)

Cluster Fiscalite (satellites S13-30) :
- LMNP : guide complet micro vs reel (LFI 2025) (keyword: LMNP, 30000-40000/mois) — cible recherches directes
- Deficit foncier : reduire ses impots avec l'immobilier (keyword: deficit foncier, 6000-10000/mois)
- SCI a l'IS : avantages, inconvenients et simulation (keyword: SCI IS, 3000-5000/mois)
- Plus-value immobiliere : calcul, abattements et optimisation (keyword: plus value immobiliere, 4000-6000/mois)
- LMP vs LMNP : comparaison complete (keyword: LMP vs LMNP, 1500-2500/mois)

Cluster Estimation / DVF :
- Estimation immobiliere avec les donnees DVF : guide complet (keyword: estimation prix immobilier, 1500-2500/mois)
- Prix au m2 par ville : les donnees DVF decryptees (keyword: prix m2 par ville, 2000-3000/mois)
- Score DPE et impact sur la valeur d'un bien immobilier (keyword: DPE impact prix immobilier, 500-1000/mois)

**SEMAINES 31-42 : PAGES VILLES INDIVIDUELLES**
Creer des guides par ville ciblant "investir a [ville]" pour les villes non encore couvertes en S7/S10/S12.
Structure : prix moyen DVF, rendement, tension locative, strategies pertinentes, biens et encheres disponibles sur MDB.

**SEMAINES 43-52 : CONTENU AVANCE ET SAISONNIER**
- Sujets avances : simulation complete operation MdB de A a Z, financement MdB sans apport, comment sourcer les bonnes affaires
- Contenu data-driven : barometre trimestriel encheres judiciaires, evolution prix DVF par ville
- Thematiques saisonnieres : fiscalite fin d'annee, declarations revenus fonciers, marche immobilier printemps

## MOTS-CLES PRIORITAIRES (positionnement unique MdB — a integrer naturellement)
"encheres judiciaires immobilieres" (400-700/mois, ⭐⭐⭐⭐⭐), "immeuble de rapport" (600-1200/mois, ⭐⭐⭐⭐), "division immobiliere" (200-400/mois, ⭐⭐⭐⭐), "locataire en place achat" (200-400/mois, ⭐⭐⭐⭐), "achat revente immobilier" (500-900/mois, ⭐⭐⭐), "marchand de biens" (300-500/mois, ⭐⭐⭐)
NE PAS sur-cibler "investissement locatif" — terrain d'Horiz.io et LyBox. L'angle differenciateur MdB est la methode pro pour particuliers.

## CONTRAINTES
- Categories : Strategies, Fiscalite, Travaux, Financement, Marche (utiliser exactement ces noms)
- Pas deux sujets similaires consecutifs
- Alterner les tons : pedagogique, expert, cas-pratique, alerte
- Progression : S13-30 satellites et piliers secondaires, S31-42 villes individuelles, S43-52 avance
- Chaque article satellite doit mentionner dans l'angle le lien vers son article pilier parent
- Le champ "angle" doit contenir : type (PILIER/SATELLITE Px/VILLE), longueur cible en mots, instructions specifiques
- Le champ "audience" doit contenir 1-2 valeurs parmi : "Débutant complet", "Investisseur amateur", "Profil MDB actif", "Professionnel"
  * Articles pedagogiques → ["Débutant complet", "Investisseur amateur"]
  * Articles expert → ["Investisseur amateur", "Profil MDB actif"]
  * Articles cas-pratique → ["Profil MDB actif"]
  * Articles alerte → ["Investisseur amateur", "Profil MDB actif"]
  * Pages villes → ["Investisseur amateur"]

Reponds UNIQUEMENT en JSON valide, sans backticks, sans explication. Format exact :
{"articles":[{"week":13,"category":"Strategies","title":"...","keyword":"...","tone":"pedagogique","angle":"SATELLITE P1. ... 1500 mots. ...","audience":["Investisseur amateur"]},{"week":14,...},...]}

40 objets dans le tableau, semaines 13 a 52. tone parmi : pedagogique, expert, cas-pratique, alerte. Categories parmi : Strategies, Fiscalite, Travaux, Financement, Marche.`

  try {
    const vpsRes = await fetch(`${vpsUrl}/generate/calendar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-generation-secret': process.env.GENERATION_SECRET || '',
      },
      body: JSON.stringify({
        systemPrompt,
        userPrompt: 'Genere le planning editorial des semaines 13 a 52 pour Mon Petit MDB. Les semaines 1-12 sont deja fixees et seront ajoutees automatiquement. Genere EXACTEMENT 40 articles (semaines 13 a 52). Couvre TOUS les satellites obligatoires listes. Reponds uniquement en JSON : {"articles":[{"week":13,...},{"week":14,...},...,{"week":52,...}]}',
        model: 'claude-opus-4-7',
      }),
      signal: AbortSignal.timeout(130_000),  // 130s > 110s timeout Opus VPS + marge réseau
    })

    if (!vpsRes.ok) {
      const errText = await vpsRes.text().catch(() => '')
      return NextResponse.json({ error: `VPS error ${vpsRes.status}: ${errText}` }, { status: 500 })
    }

    const vpsData = await vpsRes.json()
    let raw = vpsData.text || '{}'
    raw = raw.replace(/```json|```/g, '').trim()

    let parsed
    try { parsed = JSON.parse(raw) } catch { return NextResponse.json({ error: 'JSON parse failed' }, { status: 500 }) }

    const generatedArticles = parsed.articles || []

    // Semaines 1-12 hardcodees — audit SEO 2026-04-21
    const FIXED_WEEKS = [
      { week: 1, category: 'Stratégies', title: 'Enchères judiciaires immobilières : guide complet 2026', keyword: 'enchères judiciaires immobilières', tone: 'expert', angle: 'Article PILIER P0 — PRIORITÉ ABSOLUE. Seul outil qui agrège Licitor + Vench + Avoventes et calcule le prix cible. Sections : qu\'est-ce qu\'une enchère judiciaire / comment participer / frais réels (provision 10% + émoluments avocat) / TVA sur marge / comment MdB calcule le prix max à ne pas dépasser. Inclure statistiques des 3 plateformes issues du scraping MdB. 3000 mots. CTA : "Voir toutes les enchères disponibles" → /encheres.' },
      { week: 2, category: 'Fiscalité', title: 'TVA sur marge immobilier : guide complet pour marchands de biens', keyword: 'TVA marge marchand de biens', tone: 'expert', angle: 'SATELLITE S1 (enchères judiciaires). TVA sur marge 20/120 : mécanisme, conditions, calcul détaillé avec exemples. Cas concret enchères judiciaires : TVA = (prix adjugé + frais - prix achat HT) × 20/120. 3 pièges fréquents. 1500 mots. Lien vers article pilier "Enchères judiciaires immobilières".' },
      { week: 3, category: 'Stratégies', title: 'Investir comme un marchand de biens : la méthode complète', keyword: 'marchand de biens', tone: 'expert', angle: 'Article PILIER P0. NE PAS utiliser "investissement locatif" dans le H1. Angle : la méthode pro accessible — analyse DVF, 7 régimes fiscaux, sourcing multi-plateformes (LBC, SeLoger, enchères judiciaires). Comment Mon Petit MDB démocratise la méthode MdB pour les particuliers. Simulation complète d\'une opération achat-travaux-revente. 2500 mots.' },
      { week: 4, category: 'Stratégies', title: 'Mise à prix vs prix adjugé : comment calculer sa décote aux enchères', keyword: 'vente judiciaire immobilier', tone: 'pedagogique', angle: 'SATELLITE S1 (enchères judiciaires). Différence mise à prix / estimation notaire / prix adjugé. Comment calculer le prix maximum à ne pas dépasser. Décote moyenne constatée sur les données MdB. Checklist des frais avant d\'enchérir. 1200 mots. Lien vers article pilier "Enchères judiciaires immobilières".' },
      { week: 5, category: 'Stratégies', title: 'Immeuble de rapport : guide complet pour investir dans un immeuble entier', keyword: 'immeuble de rapport', tone: 'expert', angle: 'Article PILIER P1. Analyse financière complète + stratégie division + calculs MdB. Monopropriété vs création copropriété, coûts, rentabilité locative vs revente à la découpe. Simuler avec Mon Petit MDB. 2500 mots.' },
      { week: 6, category: 'Stratégies', title: 'Locataire en place : opportunité ou piège pour l\'investisseur ?', keyword: 'locataire en place achat', tone: 'alerte', angle: 'SATELLITE P3 (immeuble de rapport). Avantages (cashflow immédiat, décote prix) ET risques (bail pré-89, profil locataire, loyer sous-marché). Checklist de vérification avant achat. 1500 mots. Lien vers article pilier "Immeuble de rapport" et /biens.' },
      { week: 7, category: 'Marché', title: 'Investir à Lyon, Marseille, Bordeaux, Lille, Nantes : comparatif 2026', keyword: 'meilleure ville investissement locatif', tone: 'expert', angle: 'PAGES VILLES — 5 premières métropoles prioritaires. Pour chaque ville : prix moyen DVF au m², rendement locatif moyen constaté, tension locative, stratégies adaptées (IDR, enchères, travaux), biens disponibles sur MdB. Article comparatif de synthèse avec sections individuelles par ville. 3000 mots. Liens vers /biens filtré par ville.' },
      { week: 8, category: 'Fiscalité', title: 'Fiscalité immobilière : les 7 régimes comparés (guide 2026)', keyword: 'fiscalité marchand de biens', tone: 'expert', angle: 'Article PILIER P1. Comparaison des 7 régimes simulés par MdB (unique : interface interactive). Tableau récapitulatif charges déductibles, taux, abattements. Inclure changements 2025-2026 (PS 18.6%, réintégration amortissements LMNP LFI 2025). Focus marchand de biens IS vs LMNP. 2500 mots. Lien vers simulateur MdB.' },
      { week: 9, category: 'Stratégies', title: 'Division immobilière : créer de la valeur avec la méthode marchand de biens', keyword: 'division immobilière', tone: 'expert', angle: 'Article PILIER P2. TVA sur marge + calculs + cas pratiques. Réglementation (PC valant division, déclaration préalable), coûts, exemple chiffré avant/après division. Comment Mon Petit MDB intègre le calcul division dans l\'analyse de rentabilité. 2000 mots.' },
      { week: 10, category: 'Marché', title: 'Investir à Toulouse, Rennes, Strasbourg, Montpellier, Grenoble, Rouen, Nantes, Nice : guide 2026', keyword: 'investir immobilier métropoles françaises', tone: 'expert', angle: 'PAGES VILLES — 8 métropoles secondaires prioritaires. Même structure que S7 : prix DVF, rendement, tension locative, biens MdB disponibles, stratégies adaptées à chaque marché. 3000 mots. Liens croisés vers article S7 et /biens filtré par ville.' },
      { week: 11, category: 'Fiscalité', title: 'Achat-revente immobilier : fiscalité et stratégie pour investisseurs', keyword: 'achat revente immobilier', tone: 'cas-pratique', angle: 'SATELLITE P2 (marchand de biens). Fiscalité achat-revente : MdB IS vs particulier (PV immobilière 19% IR + 17.2% PS). Simulation chiffrée : achat 200k€ + travaux 40k€, revente 290k€ — quel régime optimal. 1500 mots. Lien vers article pilier "Investir comme un marchand de biens".' },
      { week: 12, category: 'Marché', title: 'Guide investissement : les 22 meilleures villes françaises + bilan stratégie 2026', keyword: 'investir immobilier France', tone: 'expert', angle: 'PAGES VILLES — 9 dernières villes (Saint-Étienne, Metz, Clermont-Ferrand, Brest, Dijon, Amiens, Tours, Caen, Perpignan) + article de synthèse final. Tableau comparatif des 22 villes par rendement DVF. Bilan des 2 premiers mois. 3000 mots. Hub de liens vers toutes les pages villes et /biens.' },
    ]

    const articles = [...FIXED_WEEKS, ...generatedArticles]

    // Preserver les entrees liees a un article existant (publie, review, approved)
    const { data: existingEntries } = await supabaseAdmin
      .from('editorial_calendar')
      .select('id, article_id, status, title, keyword, category, tone, angle, week_number')
      .not('article_id', 'is', null)

    const preserved = (existingEntries || []).filter(e => e.article_id)

    // Supprimer uniquement les entrees non liees a un article
    if (preserved.length > 0) {
      const preservedIds = preserved.map(e => e.id)
      await supabaseAdmin.from('editorial_calendar').delete().not('id', 'in', `(${preservedIds.join(',')})`)
    } else {
      await supabaseAdmin.from('editorial_calendar').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    }

    // Filtrer les semaines generees pour ne pas dupliquer les sujets deja lies
    const preservedTitles = new Set(preserved.map(e => e.title?.toLowerCase().trim()))
    const filteredArticles = articles.filter((a: any) => !preservedTitles.has(a.title?.toLowerCase().trim()))

    // Calculer les dates de chaque semaine
    const start = getMonday(new Date(startDate))
    // Les semaines preservees gardent leurs numeros, les nouvelles remplissent les trous
    const usedWeeks = new Set(preserved.map(e => e.week_number))
    let weekIndex = 0

    const rows = filteredArticles.map((a: any) => {
      // Trouver la prochaine semaine libre
      while (usedWeeks.has(weekIndex + 1)) weekIndex++
      weekIndex++
      usedWeeks.add(weekIndex)

      const weekStart = new Date(start)
      weekStart.setDate(weekStart.getDate() + (weekIndex - 1) * 7)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)

      return {
        week_number: weekIndex,
        week_start: weekStart.toISOString().slice(0, 10),
        week_end: weekEnd.toISOString().slice(0, 10),
        category: a.category,
        title: a.title,
        keyword: a.keyword,
        tone: a.tone,
        angle: a.angle,
        status: 'planned',
      }
    })

    const { error: insertError } = await supabaseAdmin.from('editorial_calendar').insert(rows)
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    return NextResponse.json({ success: true, count: rows.length, preserved: preserved.length })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH - Mettre a jour le statut d'une entree du calendrier
export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, status, article_id } = body

  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const updates: Record<string, any> = {}
  if (status) updates.status = status
  if (article_id !== undefined) updates.article_id = article_id

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucune modification' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('editorial_calendar')
    .update(updates)
    .eq('id', id)
    .select('*, article:articles(id, title, status, slug)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  return date
}
