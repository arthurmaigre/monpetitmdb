# Les 5 Stratégies MDB

Chaque stratégie a sa propre **couleur d'accent**, **schéma de filtres**, **layout de hero**, et **sections de fiche**. Ce document est le contrat qui lie les composants entre eux — si vous ajoutez une 6ème stratégie, suivez cette structure.

---

## Couleurs par stratégie

Chaque stratégie possède **une couleur d'accent** utilisée pour :
- Le mot en italique dans le titre de la page de recherche (`Biens avec <em>locataires en place</em>`)
- La valeur sélectionnée du filtre "Stratégie MDB"
- Les prix cibles (Prix cible, Enchère max, Plus-value estimée)
- Les badges "Stratégie X"
- Les accents dans le bloc d'intro de stratégie sur la fiche

| Stratégie | Token | Hex | Logique |
|---|---|---|---|
| Locataire en place | `--strat-locataire` | `#b4442e` | Bordeaux — décote par l'occupation |
| Travaux lourds | `--strat-travaux` | `#c77f1f` | Ambre — risque et opportunité travaux |
| Immeuble de rapport | `--strat-immeuble` | `#3a5f7d` | Bleu profond — rendement, échelle |
| Division | `--strat-division` | `#2f7d5b` | Vert — création de valeur |
| Enchères | `--strat-encheres` | `#6a2d2d` | Bordeaux sombre — univers judiciaire |

La couleur d'accent générique `--accent` (`#b4442e`) est partagée avec Locataire en place ; elle sert aussi aux CTAs globaux (Watchlist, Créer une alerte, paywall).

---

## Schémas de filtres

Les filtres se décomposent en **3 rangées** dans la barre de recherche. La première rangée est partagée, les rangées 2–3 changent selon la stratégie.

### Rangée commune (toutes stratégies)
`Stratégie MDB` · `Localisation` · `Type` · `Prix min` · `Prix max` · `Surface min` · `Surface max`

### Rangée spécifique — par stratégie

**Locataire en place**
- Rangée 1 finit par : `Rdt brut min`
- Rangée 2 : `Recherche par mots-clés` · `Trier par` · `Créer une alerte` · switcher `Grille / Liste / Carte`

**Travaux lourds**
- Rangée 1 finit par : `Budget travaux min` · `Budget travaux max`
- Rangée 2 : `DPE` (multi-select E/F/G) · `État général` · `Recherche par mots-clés`
- Rangée 3 : `Trier par` (défaut : Décote estimée) · actions + view switcher

**Immeuble de rapport**
- Rangée 1 finit par : `Nb lots min` · `Rdt brut min`
- Rangée 2 : `Monopropriété` (Oui / Non / Tous) · `Nb compteurs min` · `Recherche par mots-clés`
- Rangée 3 : `Trier par` (défaut : Rdt décroissant) · actions + view switcher

**Division**
- Rangée 1 finit par : `Surface min` (généralement ≥ 60m²) · `Prix/m² max`
- Rangée 2 : `Potentiel de division` (2 / 3 / 4+ lots) · `Exposition` · `Recherche par mots-clés`
- Rangée 3 : `Trier par` (défaut : Marge estimée) · actions + view switcher

**Enchères**
- Rangée 1 finit par : `Statut` (Tous / Ouvert / Surenchère / Adjugé / Délocalisée)
- Rangée 2 : `Occupation` (Tous / Libre / Occupé) · `Sources` (LIC / AVO / VEN chips multi) · `Délocalisées` (checkbox) · `Recherche par mots-clés`
- Rangée 3 : `Trier par` (défaut : Date audience ↑) · actions + view switcher

### Tag "Filtres actifs"
Pastille rouge `1 filtre actif` à droite du compteur "N biens affichés". Reste visible quel que soit le schéma.

---

## Hero de la fiche bien

Le hero (photo + titre + prix) suit **la même grille 2 colonnes** mais les éléments de la colonne droite changent.

### Éléments communs
- Fil d'Ariane en haut à gauche (`Biens › {Ville} › Ce bien`)
- Colonne gauche : carousel photo (fallback : placeholder maison), contrôles nav, badge `N/5`, lien "Voir sur" + chips sources
- Colonne droite : titre `{Type} — {Surface} m²` en serif, localisation en gris, badges de statut, prix, bouton Watchlist

### Variantes prix (colonne droite)

| Stratégie | Ligne prix |
|---|---|
| **Locataire en place** | `Prix FAI` (noir) + `Prix cible` blurred derrière paywall (bordeaux) |
| **Travaux lourds** | `Prix FAI` (noir) + `Prix cible après travaux` (ambre) |
| **Immeuble de rapport** | `Prix FAI` (noir) + `Prix cible` (bleu) + ligne `Rdt brut: X %` en-dessous |
| **Division** | `Prix FAI` (noir) + `Prix de sortie estimé` (vert) |
| **Enchères (en cours)** | `Mise à prix` (rouge vif) + bouton Watchlist seul |
| **Enchères (adjugé)** | `Prix Adjugé` (rouge) + `Enchère Max (Objectif 20 % PV)` (vert) côte-à-côte |
| **Enchères (surenchère)** | Mise à prix + **carte crème** surplombant le hero : "Surenchère possible jusqu'au JJ · Nouvelle mise à prix · Consignation" |

### Badges de statut
- **Locataire** : `Locataire en place` (bleu info) + `Toujours disponible` (vert) | `Retiré` (gris)
- **Travaux** : `DPE E/F/G` (ambre) + `À rénover` (ambre soft)
- **Immeuble** : `{N} lots` (info) + `Monopropriété` (vert) ou `Copro`
- **Division** : `Potentiel {N} lots` (vert) + `PLU compatible` (vert soft)
- **Enchères** : `Adjugé` (navy), `Surenchère J-{N}` (orange), `Audience {date}` (info), `Délocalisée` (rouge)

---

## Sections de la fiche — modulaires

Chaque fiche est une composition **des mêmes briques** (Caractéristiques, Données locatives, Estimation Revente, Estimation Travaux, Analyse Fiscale, Simulateur Financement) + **des briques propres à la stratégie**.

### Briques communes à toutes les stratégies
1. **Bloc d'intro** — prose 2–3 paragraphes expliquant la stratégie (accent sur le mot clé)
2. **Caractéristiques du bien** — grille 4-col (Année, DPE, Surface, Terrain, Pièces, Chambres, SdB, Étage, Chauffage)
3. **Estimation Prix de Revente** — Prix FAI + Prix revente + fourchette + niveau de confiance
4. **Estimation Travaux** — Score IA + estimation manuelle
5. **Simulateur de Financement** — Base de calcul / Montant / Apport / Type de crédit
6. **Analyse Fiscale** — Comparateur de régimes (Nu Réel / LMNP Réel) × Durée (1 à 20 ans)

### Briques spécifiques

**Locataire en place**
- `Données Locatives` : Loyer, Type loyer, Charges récup., Charges copro, Taxe foncière, **Profil locataire**, **Fin de bail**, Rdt brut
- **Simulation prime d'éviction** (4 à 8 mois de loyer) : slider → impact sur PV nette

**Travaux lourds**
- `Estimation Travaux` étendue : Toiture / Électricité / Plomberie / Isolation / Fenêtres / Sols — chacune avec score 0-5
- **Saut de DPE** estimé post-travaux (badge avant → après)

**Immeuble de rapport**
- `Détail des lots` — tableau : lot, surface, type, loyer actuel, loyer marché, écart
- Bouton "Voir le détail des lots" ouvre modal de saisie
- `Copropriété` : Monopropriété, Compteurs individuels, Charges au m²

**Division**
- **Carte "Projet de division"** : plan masse (placeholder) + tableau des lots créés (surface, prix sortie, marge)
- `Urbanisme` : Zone PLU, ERP possible, Autorisations nécessaires

**Enchères**
- `Enchère` : Tribunal, Audience, Prix adjugé/Mise à prix, Statut, **Frais préalables**, **Honoraires d'avocat** (default 1500€ éditable), **Frais de mutation** (avec badge %)
- **Carte Avocat poursuivant** : nom (bordeaux) + SCP + icône légale
- `Immeuble` (si applicable) : Nb lots, Monopropriété, Compteurs individuels, bouton "Voir le détail des lots"
- **Documents Juridiques** : chips PDF (Insertion légale, CCV, PV de description)
- **Info surenchère** (si applicable) : carte crème au-dessus de l'intro

---

## Ordre de lecture d'une fiche (toutes stratégies)

```
Breadcrumb
Hero (photo + titre + badges + prix + Watchlist)
[Compléter les données manquantes →]
Tabs: Données | Estimation | Financement | Fiscalité

=== Onglet Données ===
Bloc intro stratégie
Caractéristiques du bien (+ sections propres à la stratégie)
Données Locatives (ou Enchère, ou Immeuble, selon la stratégie)
[Légende des états de données]

=== Onglet Estimation ===
Estimation Prix de Revente
Estimation Travaux
Documents Juridiques (Enchères seulement)
[Plan masse] (Division seulement)

=== Onglet Financement ===
Simulateur de Financement

=== Onglet Fiscalité ===
Analyse Fiscale (comparateur 2 régimes × durées)
```

---

## Validation communautaire

Partout où une donnée peut être saisie par l'utilisateur, on affiche son état via **couleur du champ** + légende :

| État | Couleur | Usage |
|---|---|---|
| `NC` — donnée manquante | `var(--accent)` | chip bordeaux, éditable au clic |
| Simulation personnelle | `var(--info)` | fond bleu soft, pour soumettre/annuler |
| Soumis par 1 utilisateur | `var(--warning)` | fond ambre, en attente de validation |
| Validé par 2+ utilisateurs | `var(--success)` | fond vert, utilisé dans les calculs |

Légende toujours présente en bas du bloc "Données Locatives" / "Enchère" pour rappel.
