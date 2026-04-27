// Fonctions partagées entre articles/route.ts et articles/complete/route.ts

export function buildReviewBasePrompt(): string {
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

export async function replacePhotosWithUnsplash(html: string): Promise<string> {
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
