# Handoff : Fiche Bien — Mon Petit MdB

## Overview

Ce package contient le design d'une **fiche bien immobilier** pour la plateforme **Mon Petit MdB** (outil d'analyse d'investissement immobilier pour marchands de biens et investisseurs). La fiche est multi-stratégie : elle adapte ses calculs, indicateurs, et blocs d'information selon la stratégie d'investissement choisie par l'utilisateur (Locataire en place, Travaux lourds, Immeuble de rapport, Division, Enchères).

L'utilisateur arrive sur une fiche après un scraping d'annonce (LeBonCoin, SeLoger, Licitor pour les enchères, etc.). Les données sont enrichies par IA, complétées manuellement par l'utilisateur, et confrontées à des grilles de calcul fiscales et opérationnelles.

## About the Design Files

Les fichiers de ce bundle sont des **références de design en HTML** — un prototype haute-fidélité montrant l'apparence et les comportements attendus, **pas du code de production à copier tel quel**.

L'objectif est de **recréer ces designs dans l'environnement de la codebase cible** (React, Vue, etc.), en utilisant les patterns et la stack existante. Si la codebase n'existe pas encore, choisir le framework le plus adapté (recommandation : **React + TypeScript** vu la complexité de l'état et la quantité de composants).

Le HTML utilise du JavaScript vanilla pour la démo de logique (toggle de stratégie, modals, validation). Cette logique doit être réimplémentée idiomatiquement dans le framework cible.

## Fidelity

**Haute-fidélité (hifi)**. Le prototype est pixel-perfect avec :
- Couleurs finales (palette beige/crème néo-classique avec accents tribunal/orange/cuivre)
- Typographie finalisée (Söhne sans-serif + Tiempos serif pour les titres)
- Spacings, rayons, ombres définis
- Toutes les interactions principales (toggle stratégie, modals, hover states, drag-pan d'images, comparateur prix m² interactif)

Le développeur doit reproduire le look fidèlement, en utilisant la design system de la codebase si elle existe, ou en extrayant les tokens depuis `colors_and_type.css`.

## Architecture générale de la page

La page est composée de :

1. **Topbar** : breadcrumb (Retour aux résultats / nom du bien / chip stratégie cliquable), actions à droite (favoris, partage, export PDF)
2. **Hero** : galerie photos drag-pannable (3 lignes de hauteur variable, scroll horizontal sans scrollbar visible) + chip stratégie + chip d'occupation
3. **Bloc prix** : 2 cartouches côte-à-côte (libellés et valeurs adaptés à la stratégie : "Prix annoncé / Décote estimée" pour locataire, "Mise à prix / Enchère max objectif" pour enchères, etc.)
4. **Tabs principaux** : Aperçu · Estimation · Diagnostic travaux · Financement · Fiscalité
5. **Onglet Aperçu (le plus dense)** : pile verticale ordonnée
   - Caractéristiques du bien
   - Données locatives (conditionnel — voir règles ci-dessous)
   - Bloc spécifique stratégie (Diagnostic travaux pour Travaux, Informations Enchères pour Enchères, etc.)

## Stratégies (5 stratégies, sélectionnables via tabs en bas du hero)

Voir `STRATEGIES.md` pour la spécification détaillée. Résumé :

| Clé | Label | Cas d'usage |
|---|---|---|
| `locataire` | Locataire en place | Bien occupé avec bail en cours, achat décoté |
| `travaux` | Travaux lourds | Bien à rénover entièrement (régime MdB / TVA sur marge possible) |
| `immeuble` | Immeuble de rapport | Multi-lots (3+ lots), données agrégées |
| `division` | Division | Achat d'un grand bien à diviser en plusieurs lots |
| `encheres` | Enchères | Vente judiciaire (Tribunal Judiciaire) |

Chaque stratégie a ses propres :
- Couleur de chip (variable CSS `--strat-<key>-bg`, `--strat-<key>-fg`)
- Set d'indicateurs clés (KPIs de la carte deal)
- Variations de copy et de logique de calcul
- Bloc spécifique additionnel

## Règles métier importantes

### 1. Caractéristiques du bien (uniformisées)

Sur les 4 stratégies hors Immeuble (locataire, travaux, division, enchères), le set de caractéristiques affichées est **uniforme** :
- DPE, Surface, Pièces, Chambres, Étage, Type, Prix au m²
- + Terrain pour Travaux (maison)
- + Nombre de lots pour Enchères (cliquable → modal détail des lots)

**Règle d'affichage** : seules les caractéristiques **effectivement récupérées** (via scraping, IA ou ingestion document) sont affichées. Les caractéristiques manquantes sont listées dans le footer du bloc ("X caractéristiques manquantes : …") avec un bouton **Compléter** qui ouvre le modal `modal-add-feature`.

Le modal "Compléter les données" propose la saisie de **toutes** les caractéristiques pertinentes pour la stratégie (saisies manuelles auprès du vendeur ou de l'avocat) :
- Communes : Année construction, Terrain, Salles de bain, Chauffage, Exposition, GES, Ascenseur, Cave, Balcon/Terrasse, Parking, Copropriété
- Spécifique Enchères : Nombre de lots + bouton "Détailler chaque lot" → ouvre `modal-lots-detail-encheres` (saisie type, surface, étage, DPE, état d'occupation par lot)

### 2. Données locatives (conditionnel)

- **Locataire en place** + **Immeuble de rapport** : bloc Données locatives **toujours visible** (avec données pré-remplies)
- **Travaux / Division / Enchères** : par défaut le bloc est **masqué** ; à la place s'affiche un bouton CTA **"+ Ajouter des données locatives"**. Quand l'utilisateur saisit un loyer > 0 dans le modal et valide, le bloc apparaît avec le loyer renseigné

État persisté : la saisie doit être stockée par utilisateur + par bien (cf. section Persistance).

### 3. Modals importants

- `modal-add-feature` : "Compléter les données du bien" — section caractéristiques + section données locatives + section conditionnelle "Lots de la vente" pour stratégie enchères
- `modal-lots-detail` : détail des 14 lots de l'immeuble de rapport (tableau éditable)
- `modal-lots-detail-encheres` : détail des 3 lots de la vente aux enchères (lot principal T4 + cave + garage)
- `modal-frais-mutation` : breakdown des frais de mutation (notaire, droits, etc.)
- `modal-avocat-poursuivant` : fiche avocat + coordonnées + historique
- `modal-division-config` : configurer le scénario de division (nombre de lots projetés + budget travaux)
- `modal-travaux-detail` : affiner le budget travaux par poste
- Modals de dropdown contextuels : sélecteur stratégie, sélecteur DPE, etc.

## Persistance par utilisateur (à implémenter côté code)

Le proto utilise `window.__rentSaisi` (mémoire seulement). En prod, **persister** dans `localStorage` (ou backend) avec clé scopée :

```
mpmdb:<userId>:<bienId>:state
```

Champs minimaux à persister :
- `rentSaisi` (bool)
- Toutes les valeurs saisies dans le modal (loyer, charges, fin de bail, profil locataire, type chauffage, etc.)
- Stratégie active sélectionnée par l'utilisateur (pour cette fiche)
- Adresse saisie

## Tokens & Style

Voir `colors_and_type.css` pour la palette complète.

### Palette principale (variables CSS)

```
--bg: #f7f3ed              /* fond global beige clair */
--bg-alt: #efe8dc          /* fond alternatif */
--surface: #ffffff         /* cartes */
--ink: #1a1816             /* texte principal */
--ink-soft: #5a544c        /* texte secondaire */
--ink-mute: #918a7e        /* texte tertiaire */
--line: #e4ddd1            /* bordures */

/* Accents */
--success: #2e7c5d
--success-soft: #d4ebde
--warning: #b8891a
--danger: #9b2f1e
--info: #2d5a8c
--info-soft: #dde8f4

/* Stratégies (chip backgrounds + foregrounds) */
--strat-locataire-bg, --strat-travaux-bg, --strat-immeuble-bg, --strat-division-bg, --strat-encheres-bg
```

### Typographie

- **Sans-serif (corps + UI)** : `Söhne` — fallback `-apple-system, "Helvetica Neue", Arial, sans-serif`
- **Serif (titres de cartes, valeurs prix)** : `Tiempos Headline` ou `Tiempos Text` — fallback `Georgia, "Times New Roman", serif`
- **Variables CSS** : `--sans` et `--serif`

Tailles principales :
- Card title : 17px / 500 / serif
- Big values (prix) : 26-32px / 500 / serif
- Body : 14px
- Meta / labels : 11-12px

### Spacings & rayons

- Card padding : 22px
- Border radius cartes : 14px
- Border radius boutons : 8px
- Border radius chips : 999px (pill)
- Gap stack vertical : 16px

## Composants clés à recréer

### `<StrategyChip strategy="encheres">`
Pill cliquable avec couleur de fond + texte selon la stratégie. Au clic, ouvre un dropdown de sélection.

### `<DealCard>` (la grosse carte du hero)
Galerie photos drag-pannable + bloc prix 2 colonnes + chip d'occupation + tag d'état (Surenchère J-10, Adjugé, Vendu...) + 4 KPIs en bas.

### `<FeatureGrid items={...} missing={...}>`
Grille de caractéristiques en 2 colonnes (label / valeur). Footer avec compteur de manquants + bouton "Compléter".

### `<LocativeBlock state="full" | "empty" | "hidden">`
3 états visuels :
- `full` : grille de loyer + charges + rendement avec valeurs
- `empty` : grille avec tous champs en NC + invitation à saisir (utilisé pour locataire/immeuble par défaut)
- `hidden` (avec CTA) : remplacé par bouton "+ Ajouter des données locatives" (utilisé pour travaux/division/enchères tant que pas de loyer saisi)

### `<Modal id, large?, xlarge?>`
Pattern de modal : header avec titre + subtitle + bouton close, body avec sections, footer avec actions.

### `<ModalField label, type, options?>`
Ligne de formulaire dans modal : label / control / bouton ✓ valider.

### `<LotsTable>` (modal détail des lots)
Tableau éditable inline avec selects et inputs avec unités. Spécifique enchères = 3 lignes (apt principal, cave, garage), spécifique immeuble = 5 lignes affichées + ligne agrégée pour les autres.

### `<DPEBadge level="A"..."G">`
Badge coloré (vert→rouge) avec lettre.

### `<ChipBadge type="bien-libre" | "occupé" | "loué" | "surenchere" | "adjuge" | ...>`
Pill colorée pour statuts.

### `<InfoIcon tooltip="...">`
Petit "i" dans cercle qui affiche un tooltip au hover.

## Interactions principales

1. **Switch de stratégie** : clic sur tab en bas du hero → `applyStrategy(key)` met à jour : breadcrumb, chip, prix, KPIs, caractéristiques, données locatives, bloc spécifique, onglet diagnostic travaux, sections du modal complétion
2. **Drag & pan galerie** : mouse-down + mouse-move pour scroller horizontalement (cf. classe `.gallery-grid`)
3. **Toggle état Décote** : 2 modes (négative à négocier / positive déjà sous-évalué) — bouton qui inverse les couleurs
4. **Toggle état Enchères** : 3 modes (avant-vente / surenchère J-10 / adjugé) — change le tag et les libellés de prix
5. **Modals** : `openModal(id)` / `closeModal(id)` — overlay sombre + animation fade-in
6. **Validation inline** : champs avec bouton ✓ qui passe en mode lecture après validation
7. **Toggle bloc Données locatives** : visible si `rentSaisi=true` ou stratégie locataire/immeuble

## Files

| Fichier | Description |
|---|---|
| `fiche-bien-refonte-v4-finale.html` | Prototype HTML complet (~6700 lignes) |
| `colors_and_type.css` | Tokens design system (couleurs, typo, variables CSS) |
| `STRATEGIES.md` | Spécification métier de chaque stratégie |
| `PROJECT_README.md` | README originel du projet (contexte business) |

## Recommandations pour l'implémentation

1. **Stack suggérée** : React + TypeScript + TailwindCSS (avec config étendue pour les tokens) ou Vanilla CSS modules. Lib UI : shadcn/ui ou Radix pour les modals et selects accessibles.
2. **Structure de dossiers** suggérée :
   ```
   src/
     pages/FicheBien/
       FicheBien.tsx
       components/
         Hero/
         StrategyTabs/
         Tabs/
         Apercu/
           CaracteristiquesCard.tsx
           DonneesLocativesCard.tsx
           StrategySpecificBlock.tsx
         Modals/
           AddFeatureModal.tsx
           LotsDetailModal.tsx
           ...
       hooks/
         useStrategy.ts        # gestion stratégie active
         useBienState.ts       # gestion état bien (loyer, saisies, persistance)
       config/
         strategies.ts         # config par stratégie (KPIs, copy, libellés)
       types/
         Bien.ts
         Strategy.ts
   ```
3. **State management** : un store Zustand ou Context React pour `useBienState`. Persistance via `localStorage` middleware (clé `mpmdb:<userId>:<bienId>:state`).
4. **Reactivity** : tout doit être pur dérivé du state. Quand on toggle stratégie, c'est juste un set de state, pas de DOM manipulation.
5. **Accessibilité** : modals avec focus trap, ESC pour fermer, aria-labels sur les boutons icon-only, gestion clavier sur les chips/dropdowns.
6. **Animations** : framer-motion pour les transitions de modals et de bloc Données locatives apparaissant.

## Questions ouvertes / non-tranché en design

- Format exact de l'API backend (le proto suppose un objet `bien` complet en JSON)
- Logique exacte de calcul des KPIs (Décote, PV nette, Score IA travaux) — à valider avec l'équipe métier
- Multi-utilisateurs en collaboration sur une même fiche (le proto suppose un seul user)
