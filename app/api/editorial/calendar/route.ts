import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

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

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY non definie' }, { status: 500 })

  const systemPrompt = `Tu es le directeur editorial de "Mon Petit MDB", une plateforme francaise d'investissement immobilier pour investisseurs amateurs appliquant la methode marchand de biens (MDB).

Tu dois planifier une ligne editoriale coherente sur 52 semaines, avec exactement 1 article par semaine.

## STRATEGIE SEO — 5 CLUSTERS PILIER + SATELLITES

L'architecture de contenu est basee sur 5 piliers avec des articles satellites qui pointent vers le pilier. Les articles sont publies sous /guide/[slug].

### Semaines 1-12 DEJA PLANIFIEES (ne pas modifier) :
S1: [PILIER 1] Investissement locatif : le guide complet 2026 (keyword: investissement locatif)
S2: [SATELLITE P1] Calcul rendement locatif (keyword: calcul rendement locatif)
S3: [SATELLITE P1] Cashflow immobilier (keyword: cashflow immobilier)
S4: [SATELLITE P1] Dans quelle ville investir en 2026 (keyword: meilleure ville investissement locatif)
S5: [PILIER 2] Fiscalite immobiliere : les 7 regimes compares (keyword: fiscalite immobiliere)
S6: [SATELLITE P2] LMNP guide complet (keyword: LMNP)
S7: [PILIER 3] Marchand de biens : la methode pour particuliers (keyword: marchand de biens)
S8: [SATELLITE P2] Deficit foncier (keyword: deficit foncier)
S9: [PILIER 4] Immeuble de rapport : guide complet (keyword: immeuble de rapport)
S10: [SATELLITE P4] Locataire en place (keyword: locataire en place achat)
S11: [SATELLITE P2] SCI a l'IS (keyword: SCI IS)
S12: [SATELLITE P4] Budget travaux renovation au m2 (keyword: budget travaux renovation m2)

### Semaines 13-52 : A PLANIFIER selon les priorites ci-dessous.

**SATELLITES OBLIGATOIRES A PLACER EN PRIORITE (semaines 13-30) :**
Ces articles sont definis dans l'audit SEO et DOIVENT apparaitre. Reprends les titres et keywords exacts :

Pilier 1 — Investissement locatif (satellites restants) :
- Investissement locatif sans apport : comment demarrer (keyword: investissement locatif sans apport, 2000-4000/mois)
- Devenir rentier immobilier : plan d'action realiste (keyword: devenir rentier immobilier, 2000-4000/mois)
- DPE et investissement locatif : impact sur la rentabilite (keyword: DPE investissement locatif, 2000-3000/mois)
- Investissement locatif etudiant : le guide pratique (keyword: investissement locatif etudiant, 1000-2000/mois)

Pilier 2 — Fiscalite (satellites restants) :
- LMP vs LMNP : comparaison complete des statuts (keyword: LMP vs LMNP, 1500-2500/mois)
- Plus-value immobiliere : calcul, abattements et optimisation (keyword: plus value immobiliere, 4000-6000/mois)
- Micro-foncier vs reel : quel regime choisir ? (keyword: micro foncier reel, 1500-2500/mois)
- Amortissement LMNP : composants et durees (keyword: amortissement LMNP composants, 800-1200/mois)
- Loi de finances 2025 : ce qui change pour le LMNP (keyword: loi finances LMNP 2025, 2000-3000/mois)

Pilier 3 — Marchand de biens (satellites restants) :
- Achat revente immobilier : la strategie MdB detaillee (keyword: achat revente immobilier, 2000-3000/mois)
- TVA sur marge marchand de biens : calcul et exemples (keyword: TVA marge marchand de biens, 1000-2000/mois)
- Revente a la decoupe : strategie et fiscalite (keyword: revente a la decoupe, 1000-2000/mois)
- Division immobiliere : creer de la valeur (keyword: division immobiliere, 1500-2500/mois)
- Frais de notaire marchand de biens : le vrai cout (keyword: frais notaire marchand de biens, 800-1500/mois)

Pilier 4 — Immeuble de rapport (satellites restants) :
- Immeuble de rapport : rentabilite et risques (keyword: immeuble de rapport rentabilite, 1500-2500/mois)
- Financer un immeuble de rapport (keyword: financer immeuble de rapport, 800-1500/mois)
- Score travaux : evaluer l'etat d'un bien immobilier (keyword: score travaux immobilier, 500-1000/mois)

Pilier 5 — Estimation + Villes :
- [PILIER 5] Estimation immobiliere : comment estimer un bien avec les donnees DVF (keyword: estimation prix immobilier, 1500-2500/mois)
- Prix au m2 par ville : les donnees DVF decryptees (keyword: prix m2 par ville, 2000-3000/mois)
- Donnees de valeurs foncieres (DVF) : comprendre et utiliser (keyword: donnees valeurs foncieres, 1000-2000/mois)

**PAGES VILLES METROPOLES (semaines 31-42, 2 par semaine regroupees en 1 article comparatif ou 1 ville par semaine) :**
Creer des guides par ville ciblant "investir a [ville]". Les 12 villes prioritaires :
Lyon, Lille, Bordeaux, Nantes, Marseille, Toulouse, Rennes, Strasbourg, Montpellier, Grenoble, Rouen, Saint-Etienne
Chaque article : prix moyen DVF, rendement, tension locative, strategies pertinentes, biens disponibles sur MDB.

**SEMAINES 43-52 : CONTENU AVANCE ET SAISONNIER**
- Sujets avances : simulation complete operation MdB, BIC vs IS pour MdB, comment trouver les bonnes affaires, financement MdB
- Contenu data-driven : barometre trimestriel des prix, bilan annuel du marche
- Thematiques saisonnieres : fiscalite fin d'annee, declarations revenus fonciers, marche immobilier printemps

## MOTS-CLES PRIORITAIRES A VOLUME ELEVE (a repartir dans les articles)
simulateur investissement locatif (8000-12000/mois), rentabilite locative (5000-8000/mois), frais de notaire immobilier (5000-8000/mois), fiscalite LMNP (3000-5000/mois), rendement locatif (15000-25000/mois), travaux immobilier deduction fiscale (1500-2500/mois), score DPE impact prix (500-1000/mois)

## CONTRAINTES
- Categories : Strategies, Fiscalite, Travaux, Financement, Marche (utiliser exactement ces noms)
- Pas deux sujets similaires consecutifs
- Alterner les tons : pedagogique, expert, cas-pratique, alerte
- Progression : S1-12 bases, S13-30 intermediaire, S31-42 villes, S43-52 avance
- Chaque article satellite doit mentionner dans l'angle le lien vers son article pilier parent (ex: "Lien vers article pilier Investissement locatif")
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
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-20250514',
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: 'user', content: 'Genere le planning editorial des semaines 13 a 52 pour Mon Petit MDB. Les semaines 1-12 sont deja fixees et seront ajoutees automatiquement. Genere EXACTEMENT 40 articles (semaines 13 a 52). Couvre TOUS les satellites obligatoires listes. Reponds uniquement en JSON : {"articles":[{"week":13,...},{"week":14,...},...,{"week":52,...}]}' }],
      }),
    })

    const data = await res.json()
    let raw = data.content?.[0]?.text || '{}'
    raw = raw.replace(/```json|```/g, '').trim()

    let parsed
    try { parsed = JSON.parse(raw) } catch { return NextResponse.json({ error: 'JSON parse failed' }, { status: 500 }) }

    const generatedArticles = parsed.articles || []

    // Semaines 1-12 hardcodees (audit SEO) — categories, keywords, tons, longueurs, audiences alignes
    const FIXED_WEEKS = [
      { week: 1, category: 'Stratégies', title: 'Investissement locatif : le guide complet 2026', keyword: 'investissement locatif', tone: 'expert', angle: 'Article PILIER. Guide exhaustif couvrant toutes les stratégies MDB, les 7 régimes fiscaux, le rendement, le cashflow. Exemples chiffrés. 3000 mots min. Liens vers /biens, /strategies, les articles satellites. Public : débutants et amateurs.' },
      { week: 2, category: 'Stratégies', title: 'Calcul rendement locatif : méthode complète + simulateur', keyword: 'calcul rendement locatif', tone: 'pedagogique', angle: 'SATELLITE P1. Rendement brut vs net vs net-net. Formules détaillées avec exemples. Mentionner le simulateur Mon Petit MDB. 1500 mots. Lien vers article pilier "Investissement locatif".' },
      { week: 3, category: 'Stratégies', title: 'Cashflow immobilier : définition, calcul et optimisation', keyword: 'cashflow immobilier', tone: 'cas-pratique', angle: 'SATELLITE P1. Cashflow brut et net. Détailler chaque composant (loyer, charges, crédit, fiscalité). Exemple chiffré complet sur un T2 à 150k€. 1500 mots. Lien vers article pilier "Investissement locatif".' },
      { week: 4, category: 'Marché', title: 'Dans quelle ville investir en 2026 ? Top métropoles rentables', keyword: 'meilleure ville investissement locatif', tone: 'expert', angle: 'SATELLITE P1. Classement des 22 métropoles par rendement moyen DVF. Comparer prix/m², loyers, tension locative. 2000 mots. Liens vers biens par ville sur MDB.' },
      { week: 5, category: 'Fiscalité', title: 'Fiscalité immobilière : les 7 régimes comparés (guide 2026)', keyword: 'fiscalite immobiliere', tone: 'expert', angle: 'Article PILIER fiscal. Comparer les 7 régimes avec tableau récapitulatif des charges déductibles, taux, abattements. Inclure les changements 2025-2026 (PS 18.6%, réintégration amortissements LMNP). 3000 mots. Lien vers simulateur MDB.' },
      { week: 6, category: 'Fiscalité', title: 'LMNP : le guide complet du statut (micro vs réel, LFI 2025)', keyword: 'LMNP', tone: 'expert', angle: 'SATELLITE P2. Conditions, micro vs réel, amortissement composants, réintégration LFI 2025. Impact concret chiffré. 2000 mots. Lien vers article pilier "Fiscalité immobilière".' },
      { week: 7, category: 'Stratégies', title: 'Marchand de biens : la méthode accessible aux particuliers', keyword: 'marchand de biens', tone: 'cas-pratique', angle: 'Article PILIER MdB. TVA sur marge 20/120, frais notaire 2.5%, IS. Comment Mon Petit MDB permet d\'analyser comme un MdB. Simulation complète d\'une opération. Positionnement unique. 2500 mots.' },
      { week: 8, category: 'Fiscalité', title: 'Déficit foncier : comment réduire ses impôts avec l\'immobilier', keyword: 'deficit foncier', tone: 'pedagogique', angle: 'SATELLITE P2. Mécanisme, plafond 10 700€, conditions. Travaux déductibles vs non. Stratégie optimisation. 1500 mots. Lien vers article pilier "Fiscalité immobilière".' },
      { week: 9, category: 'Stratégies', title: 'Immeuble de rapport : guide complet pour investir dans un immeuble entier', keyword: 'immeuble de rapport', tone: 'expert', angle: 'Article PILIER IDR. Monopropriété, création copro, coûts. Rentabilité locative vs revente découpe. 2500 mots. Données Mon Petit MDB.' },
      { week: 10, category: 'Stratégies', title: 'Locataire en place : opportunité ou piège pour l\'investisseur ?', keyword: 'locataire en place achat', tone: 'alerte', angle: 'SATELLITE P4. Avantages (cashflow immédiat, décote prix) ET risques (bail pré-89, profil locataire, loyer sous-marché). Checklist de vérification. 1500 mots. Lien vers article pilier "Immeuble de rapport" et /biens.' },
      { week: 11, category: 'Fiscalité', title: 'SCI à l\'IS : avantages, inconvénients et simulation complète', keyword: 'SCI IS', tone: 'cas-pratique', angle: 'SATELLITE P2. IS 15/25%, amortissement, double imposition IS + PFU 30%. Simulation chiffrée : quand SCI IS bat LMNP et inversement. 1500 mots. Lien vers article pilier "Fiscalité immobilière".' },
      { week: 12, category: 'Travaux', title: 'Budget travaux rénovation au m² : combien prévoir en 2026 ?', keyword: 'budget travaux renovation m2', tone: 'pedagogique', angle: 'SATELLITE P4. Grille de prix par poste (plomberie, élec, sols, cuisine, SDB). Score travaux 1-5. Comment Mon Petit MDB estime le budget. 1500 mots. Liens vers biens travaux lourds.' },
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
