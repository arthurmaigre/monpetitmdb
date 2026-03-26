# Mon Petit MDB — Audit UI/UX Professionnel

> Date : 2026-03-26
> Scope : site public (landing, listing, fiche bien, blog, auth, profil)
> Methode : inspection code + design system + heuristiques Nielsen + WCAG 2.1 AA

---

## SYNTHESE EXECUTIVE

| Categorie | Score | Commentaire |
|-----------|-------|-------------|
| Design System | 5/10 | Theme.ts existe mais peu respecte — couleurs hardcodees partout |
| Landing Page | 7/10 | Hero solide, pricing clair, mais screenshot statique et pas de social proof reel |
| Listing Biens | 6/10 | Filtres complets, mais responsive insuffisant et UX mobile degradee |
| Fiche Bien | 6/10 | Contenu riche, mais surcharge visuelle et loading states absents |
| Accessibilite | 3/10 | Aucune strategie ARIA, pas de focus management, contraste limite |
| Responsive | 4/10 | Desktop OK, mobile casse sur plusieurs composants critiques |
| Performance | 6/10 | Lazy loading images OK, mais pas de skeleton screens ni SSR optimise |
| Coherence | 4/10 | 3+ styles de boutons, 3+ styles d'inputs, pas de composants partages |

**Priorite #1** : Composants UI partages (Button, Input, Card, Modal)
**Priorite #2** : Responsive mobile (50%+ du trafic immo est mobile)
**Priorite #3** : Accessibilite minimum (clavier + screen reader basics)

---

## 1. DESIGN SYSTEM — COHERENCE GLOBALE

### 1.1 Couleurs — Derive du theme

**Constat** : `theme.ts` definit une palette propre, mais la majorite du code l'ignore.

| Fichier | Probleme |
|---------|----------|
| `page.tsx` (landing) | CSS vars `var(--red)`, `var(--ink)` — pas liees a `theme.ts` |
| `ChatWidget.tsx` | Hardcode `#1a1210`, `#faf8f5`, `#c0392b` au lieu de `theme.colors` |
| `LandingHeader.tsx` | Utilise `var(--muted)`, `var(--sand)` — non synchronise avec theme |
| `login/page.tsx`, `register/page.tsx` | Hardcode `#9a8a80`, `#fde8e8`, `#faf8f5` |
| `Layout.tsx` | Mix `rgba(0,0,0,0.04)` au lieu de couleurs semantiques |

- [ ] **P1** Unifier toutes les couleurs via `theme.ts` — supprimer tout hardcode hex/rgba
- [ ] **P1** Synchroniser les CSS vars de `page.tsx` avec `theme.colors`
- [ ] **P2** Ajouter des couleurs semantiques manquantes : `buttonPrimary`, `inputBorder`, `inputFocus`
- [ ] **P3** Documenter la palette avec un styleguide minimal (`/admin/styleguide`)

### 1.2 Typographie

**Constat** : 2 familles (Fraunces display, DM Sans body) — bon choix. Mais les tailles derivent.

| Endroit | Taille | Devrait etre |
|---------|--------|-------------|
| ChatWidget messages | `13.5px` | `14px` (theme.fontSizes.base) |
| Nav links Layout | `13px` | `14px` (theme.fontSizes.base) |
| Landing hero h1 | `60px` | OK (hors theme, specifique landing) |
| BienCard prix | inline `fontSize` variable | Standardiser via theme |

- [ ] **P2** Standardiser toutes les tailles texte sur `theme.fontSizes` (xs/sm/base/md/lg/xl)
- [ ] **P2** Line-height : imposer 1.15 titres, 1.5 body, 1.65 texte long — partout
- [ ] **P3** Letter-spacing : negatif sur Fraunces gros (-0.02em), neutre sur DM Sans

### 1.3 Espacements

**Constat** : Grille 4px/8px dans `theme.spacing` — respectee dans BienCard, ignoree ailleurs.

- [ ] **P2** Auditer tous les `padding`/`margin`/`gap` inline et les aligner sur la grille 4px
- [ ] **P2** Standardiser : padding cartes = `20px`, gap grille = `16px`, sections = `48px`/`64px`
- [ ] **P3** Supprimer les valeurs impaires (13px, 17px, 7px) dans les inline styles

### 1.4 Bordures & Ombres

- [ ] **P2** Border-radius : `8px` boutons, `12px` cartes, `16px` sections, `20px` hero cards — respecter partout
- [ ] **P3** Bordure unique `sand` (#e8e2d8) — certains composants utilisent `#f0ede8` ou `rgba` a la place
- [ ] **P3** Ne jamais combiner ombre + bordure sur le meme element

### 1.5 Iconographie

**Constat** : SVG inline dans la landing (strategies), pas de librairie d'icones centralisee.

- [ ] **P3** Choisir un style : outline partout (coherent avec les SVG actuels)
- [ ] **P3** Tailles standard : 16px inline, 20px bouton, 24px navigation
- [ ] **P2** Pas d'emojis dans l'UI de production (ChatWidget utilise des emojis pour le bot — acceptable pour Memo uniquement)

---

## 2. COMPOSANTS UI — MANQUE DE LIBRAIRIE PARTAGEE

### 2.1 Boutons — 5+ variantes non standardisees

| Composant | Style | Couleur |
|-----------|-------|---------|
| Landing `.btn-hero` | Rouge bold + shadow | `#c0392b` |
| Landing `.btn-ghost` | Outline sand | transparent |
| Auth `.auth-btn` | Dark solid | `#1a1210` |
| BienCard upgrade modal | Rouge | `#c0392b` |
| ChatWidget send | Rouge conditionnel | `#c0392b` / `#e8e2d8` |
| PricingCta | Herite du parent `.plan-cta` | variable |

- [ ] **P1** Creer `<Button variant="primary|secondary|ghost|danger" size="sm|md|lg" />` dans `components/ui/`
- [ ] **P1** Tous les boutons doivent avoir : `min-height: 44px` (touch target), `cursor: pointer`, transition, focus-visible outline

### 2.2 Inputs — 3+ styles differents

| Endroit | Style |
|---------|-------|
| Auth pages `.auth-input` | Background `#faf8f5`, border sand |
| Biens list `CellEditable` | Inline styles, border conditionnelle |
| Commune search | Input generique, pas de style visible |
| Parametres | Encore different |

- [ ] **P1** Creer `<Input variant="default|search|inline-edit" />` dans `components/ui/`
- [ ] **P2** Labels toujours au-dessus de l'input, jamais a gauche
- [ ] **P2** Placeholder = exemple de valeur, pas une explication
- [ ] **P2** Focus ring visible sur tous les inputs (accessibilite clavier)

### 2.3 Modals — Pas de composant partage

**Constat** : BienCard a un modal inline pour la watchlist, ChatWidget a un drawer/panel. Aucun ne partage de logique.

- [ ] **P2** Creer `<Modal>` avec : overlay, Escape pour fermer, focus trap, click-outside, animation
- [ ] **P2** Variantes : `modal` (centree), `drawer` (laterale), `sheet` (mobile bottom)

### 2.4 Cards

- [ ] **P2** Creer `<Card>` avec : padding, border, radius, hover shadow — standardise depuis theme
- [ ] **P3** Variante `<Card elevated>` pour les hover states

---

## 3. LANDING PAGE (`app/page.tsx`)

### 3.1 Hero — Bon mais ameliorable

**Points forts** : Titre accrocheur, proposition de valeur claire, CTA visible, stats en social proof.

| Check | Statut | Detail |
|-------|--------|--------|
| Titre accrocheur | OK | "Investissez comme un marchand de biens" |
| Sous-titre | OK | Clair, 2 lignes |
| CTA principal | OK | "Voir les biens disponibles" — bon verbe d'action |
| CTA secondaire | OK | "Comment ca marche" — ancre interne |
| Visual hero | MOYEN | Carte fictive animee — correcte mais pas screenshot reel |
| Stats | OK | 90 000+ biens, France entiere, 7 regimes |

- [ ] **P2** Ajouter un vrai screenshot de l'app (pas juste un mockup CSS) pour la credibilite
- [ ] **P3** Hero visual masquee sur tablette (`display: none` a 1024px) — montrer une version simplifiee plutot que rien
- [ ] **P3** Considerer un badge "Gratuit" ou "Sans CB" sur le CTA pour reduire la friction

### 3.2 Social Proof — Insuffisant

**Constat** : Chiffres OK (90 000+ biens, 60+ plateformes) mais pas de temoignages, pas de logos.

- [ ] **P1** Ajouter une barre de logos des plateformes sourcees (LBC, SeLoger, Bienici, PAP, Logic-Immo...)
- [ ] **P2** Ajouter 2-3 temoignages (meme reconstitues au debut) avec photo, nom, metier
- [ ] **P3** Ajouter un badge "Donnees DVF officielles" pour la credibilite data

### 3.3 Section Strategies — Bonne

- [ ] **OK** 4 cartes claires, icones, tags — bien structure
- [ ] **P3** Ajouter un lien "En savoir plus" sur chaque carte vers `/strategies`

### 3.4 Section "Comment ca marche" — Bonne

- [ ] **OK** 3 etapes numerotees, timeline visuelle
- [ ] **P3** Ajouter des micro-illustrations ou screenshots dans chaque etape

### 3.5 Section Screenshot — Ameliorable

**Constat** : Mockup statique en CSS/HTML dans la page. Pas interactif, pas de vraies donnees.

- [ ] **P2** Remplacer par un vrai screenshot de l'app (image statique ou video courte)
- [ ] **P3** Ajouter des annotations (fleches, bulles) pointant les features cles
- [ ] **P3** Animation au scroll (fade-in) pour dynamiser

### 3.6 Pricing — Bon

| Check | Statut |
|-------|--------|
| 3 plans cote a cote | OK |
| Plan Pro mis en avant | OK (fond noir, badge "Le plus populaire") |
| Prix clair | OK (0/19/49 EUR/mois) |
| Features listees check/cross | OK |
| CTA par plan | OK |

- [ ] **P2** Ajouter "14 jours gratuits" de facon plus visible sur le plan Pro (pas juste dans le bouton)
- [ ] **P3** Ajouter un toggle mensuel/annuel si tarif annuel prevu
- [ ] **P3** Feature "Memo — assistant IA" merite un tooltip explicatif pour les nouveaux visiteurs

### 3.7 CTA Final — Manquant

- [ ] **P1** Ajouter une section finale avant le footer : "Pret a investir ?" + CTA + rappel proposition de valeur

### 3.8 Footer — Correct

- [ ] **OK** Logo, liens produit/strategies/legal, copyright
- [ ] **P3** Ajouter lien vers `/blog` (Conseils)
- [ ] **P3** Ajouter lien vers `/privacy` (politique de confidentialite)
- [ ] **P3** Ajouter liens reseaux sociaux si existants

---

## 4. PAGE BIENS (LISTING) — `app/biens/page.tsx`

### 4.1 Filtres

- [ ] **OK** Barre de filtres complete (strategie, localisation, type, prix, rendement, tri)
- [ ] **OK** Compteur de resultats en temps reel
- [ ] **P2** Ajouter un bouton "Reinitialiser les filtres" visible quand des filtres sont actifs
- [ ] **P2** Etats actifs des filtres : badge/chip avec le nombre de filtres actifs
- [ ] **P3** Filtres collapses en drawer sur mobile (actuellement la barre deborde)

### 4.2 Cartes Biens (`BienCard.tsx`)

**Points forts** : Skeleton loading photo, badge strategie, badge rendement/plus-value, watchlist coeur.

| Check | Statut |
|-------|--------|
| Photo avec lazy loading | OK (skeleton shimmer) |
| Photo placeholder si absente | OK ("Photo indisponible" avec icone) |
| Carrousel photo | OK (fleches) |
| Infos essentielles visibles | OK (prix, surface, pieces, ville, rdt) |
| Badge strategie | OK |
| Badge plus-value | OK (vert/rouge) |
| Bouton watchlist | OK (coeur, loading state) |
| Hover subtil | OK (elevation + shadow) |

- [ ] **P1** Responsive : largeur fixe, casse sur mobile — passer en width 100% avec grid auto-fill
- [ ] **P2** Carrousel photo : ajouter support clavier (fleches gauche/droite)
- [ ] **P2** Aria-label sur le bouton coeur ("Ajouter a la watchlist" / "Retirer de la watchlist")
- [ ] **P3** Ajouter DPE badge directement sur la carte

### 4.3 Vue Liste

- [ ] **P2** Colonnes trop serrees sur tablette — rendre certaines colonnes optionnelles
- [ ] **P2** Donnees manquantes affichees en gris italic "NC" — verifier la coherence partout
- [ ] **P3** En-tetes de colonnes fixes au scroll (sticky thead)

### 4.4 Pagination / Scroll

- [ ] **OK** Scroll infini avec indicateur de chargement
- [ ] **P3** Ajouter un compteur "X affiches sur Y total"
- [ ] **P3** Bouton "Retour en haut" visible apres scroll

### 4.5 Empty States

- [ ] **P2** Message "Aucun bien ne correspond" existe mais manque d'illustration
- [ ] **P2** Ajouter une suggestion d'action ("Elargissez vos filtres" / "Essayez une autre strategie")

---

## 5. FICHE BIEN (`app/biens/[id]/page.tsx`)

### 5.1 Hero / Photos

- [ ] **P2** Carrousel fluide avec compteur (ex: "3/12")
- [ ] **P2** Photos en plein ecran sur mobile (tap to fullscreen)
- [ ] **P3** Zoom sur hover desktop (lens effect)

### 5.2 Donnees du bien

- [ ] **OK** Grille de donnees structuree (identite, locatif, travaux, NLP)
- [ ] **P2** Cellules editables : le clic droit pour modifier n'est pas intuitif — ajouter un picto "crayon" visible
- [ ] **P2** Donnees "NC" : style gris italic coherent partout
- [ ] **P3** Regrouper visuellement avec des sous-titres de section

### 5.3 Estimation DVF

- [ ] **P2** Barre visuelle prix FAI vs estimation (representation graphique de l'ecart)
- [ ] **P2** Confiance (A/B/C/D) avec code couleur + tooltip explicatif
- [ ] **P3** Correcteurs listes avec badges colores (DPE, etage, parking...)

### 5.4 Simulateur Fiscal (PnlColonne)

- [ ] **OK** 7 regimes calcules en temps reel
- [ ] **P2** Chiffres negatifs en rouge, positifs en vert — verifier la coherence
- [ ] **P2** Scenario revente avec waterfall clair
- [ ] **P3** Ajouter un mini-graphique (bar chart) pour la comparaison regimes

### 5.5 Navigation

- [ ] **P2** Bouton retour qui conserve les filtres et la position scroll
- [ ] **P3** Breadcrumb : Biens > [Strategie] > [Ville] > Ce bien
- [ ] **P3** Navigation prev/next entre biens si possible

### 5.6 Loading / Error States

- [ ] **P1** MANQUANT : pas de loading state pendant le fetch des donnees du bien
- [ ] **P1** MANQUANT : pas d'error boundary si le fetch echoue — page blanche
- [ ] **P2** Ajouter un skeleton screen pour le chargement initial

---

## 6. WATCHLIST (`app/mes-biens/page.tsx`)

- [ ] **OK** Onglets par strategie
- [ ] **OK** Pipeline MDB avec 13 statuts de suivi
- [ ] **P2** Empty state encourageant ("Explorez les biens pour constituer votre watchlist")
- [ ] **P3** Export CSV/PDF (meme reserve aux plans payants)
- [ ] **P3** Drag & drop pour reordonner les biens dans un statut

---

## 7. AUTH (LOGIN / REGISTER)

### 7.1 Login

- [ ] **OK** Email + password avec OAuth Google/Facebook
- [ ] **P2** Focus automatique sur le champ email au chargement
- [ ] **P2** Afficher/masquer le mot de passe (icone oeil)
- [ ] **P3** "Mot de passe oublie ?" — lien visible

### 7.2 Register

- [ ] **OK** Meme layout que login + message succes post-inscription
- [ ] **P2** Validation en temps reel du format email
- [ ] **P2** Indicateur de force du mot de passe
- [ ] **P3** Mention RGPD + lien vers politique de confidentialite sous le bouton

---

## 8. CHAT IA — MEMO (`ChatWidget.tsx`)

| Check | Statut |
|-------|--------|
| Streaming | OK |
| Historique session | OK (sessionStorage) |
| Limite quotidienne | OK (Free 5, Pro 50, Expert illimite) |
| Mobile responsive | PARTIEL (modal 70vh — clavier masque l'input) |

- [ ] **P2** Mobile : quand le clavier s'ouvre, l'input doit rester visible (ajuster `vh` dynamiquement)
- [ ] **P2** Limite quotidienne : afficher le compteur restant avant d'envoyer, pas apres le refus
- [ ] **P2** Ajouter `role="dialog"` et focus trap quand le panel est ouvert
- [ ] **P3** Indication visuelle "Memo reflechit..." pendant le streaming (pas juste des points)
- [ ] **P3** Historique : avertir que les messages sont perdus a la fermeture de l'onglet

---

## 9. BLOG / EDITORIAL

- [ ] **OK** Listing articles avec cover, titre, date
- [ ] **OK** Article en Lora, pleine largeur
- [ ] **P2** Ajouter le temps de lecture estime (nb mots / 200)
- [ ] **P2** Boutons de partage (LinkedIn, X, copier le lien)
- [ ] **P3** Articles lies en fin d'article ("A lire aussi")
- [ ] **P3** Table des matieres flottante pour les articles longs

---

## 10. HEADER / NAVIGATION (`Layout.tsx`)

### 10.1 Desktop

- [ ] **OK** Sticky header avec backdrop-filter blur
- [ ] **OK** Logo cliquable → accueil
- [ ] **OK** Nav principale visible
- [ ] **OK** Dropdown profil (profil, parametres, watchlist, admin si admin, deconnexion)

- [ ] **P2** Indicateur de page active dans la nav (souligné ou background change)
- [ ] **P2** Dropdown : ajouter `role="menu"` et `role="menuitem"` pour l'accessibilite
- [ ] **P3** Badge notification sur la watchlist (nombre de biens)

### 10.2 Mobile

- [ ] **P1** Navigation `display: none` sur mobile — AUCUN menu hamburger visible. L'utilisateur mobile n'a aucune navigation.
- [ ] **P1** Creer un hamburger menu ou un bottom navigation bar pour mobile
- [ ] **P2** Bouton connexion/inscription accessible sur mobile

---

## 11. FOOTER

- [ ] **OK** Logo + baseline, liens produit/strategies/legal, copyright
- [ ] **P3** Ajouter lien Blog (Conseils), Privacy, Contact
- [ ] **P3** Icones reseaux sociaux si pertinent
- [ ] **P3** Couleur de fond differente du body — deja OK (ink/dark)

---

## 12. RESPONSIVE / MOBILE

### 12.1 Breakpoints actuels

```
@media (max-width: 1024px)  → tablette (hero visual masque, grille 2 cols)
@media (max-width: 768px)   → mobile (nav masquee, grille 1 col, padding reduit)
```

### 12.2 Problemes critiques mobile

| Page | Probleme | Severite |
|------|----------|----------|
| Toutes | Pas de menu hamburger, navigation inaccessible | CRITIQUE |
| Biens listing | Barre de filtres deborde horizontalement | HAUTE |
| BienCard | Largeur fixe, ne s'adapte pas au viewport | HAUTE |
| Fiche bien | Simulateur fiscal 2 colonnes non scrollable | MOYENNE |
| ChatWidget | Input masque par le clavier iOS/Android | MOYENNE |
| Landing | Hero visual disparait completement sur tablette | BASSE |

- [ ] **P1** Menu hamburger fonctionnel sur mobile (< 768px)
- [ ] **P1** Filtres dans un drawer/bottom-sheet sur mobile
- [ ] **P1** BienCard en `width: 100%` sur mobile (1 colonne)
- [ ] **P2** Simulateur fiscal : colonnes en stack vertical sur mobile
- [ ] **P2** Touch targets : tous les boutons min `44px` de hauteur (iOS HIG)
- [ ] **P2** Texte lisible sans zoom : body min `16px` sur mobile
- [ ] **P3** Pas d'effets hover sur mobile (remplacer par tap/active states)

---

## 13. ACCESSIBILITE (WCAG 2.1 AA)

### 13.1 Audit

| Critere | Statut | Detail |
|---------|--------|--------|
| Contraste texte | PARTIEL | `muted` (#9a8a80) sur `bg` (#faf8f5) = ratio 3.0:1 — insuffisant pour texte normal (besoin 4.5:1) |
| Focus visible | ABSENT | Aucun `outline` visible au focus clavier sur boutons et liens |
| ARIA landmarks | ABSENT | Pas de `role="main"`, `role="navigation"`, `role="banner"` |
| ARIA labels | ABSENT | Boutons icones (coeur, fleches carrousel) sans label textuel |
| Alt text images | PARTIEL | Landing = alt vides (`alt=""`), BienCard = alt dynamique OK |
| Keyboard nav | PARTIEL | Tab fonctionne mais pas de focus trap dans modals/dropdowns |
| Skip to content | ABSENT | Pas de lien "Aller au contenu" pour les lecteurs d'ecran |

- [ ] **P1** Focus visible : ajouter `outline: 2px solid var(--red); outline-offset: 2px` sur `:focus-visible`
- [ ] **P1** Contraste : assombrir `muted` a #7a6a60 pour atteindre 4.5:1 minimum
- [ ] **P1** ARIA labels sur tous les boutons icones (coeur, carrousel, fermer, menu)
- [ ] **P2** Landmarks : `<main>`, `<nav>`, `<header>`, `<footer>` semantiques
- [ ] **P2** Skip-to-content link en haut de page
- [ ] **P2** Focus trap dans les modals et dropdowns
- [ ] **P3** `prefers-reduced-motion` : desactiver les animations CSS pour les utilisateurs sensibles

---

## 14. PERFORMANCE & TECHNIQUE

| Metrique | Cible | Statut |
|----------|-------|--------|
| LCP (Largest Contentful Paint) | < 2.5s | A mesurer |
| FID (First Input Delay) | < 100ms | A mesurer |
| CLS (Cumulative Layout Shift) | < 0.1 | RISQUE — pas de dimensions fixes sur les images |
| FCP (First Contentful Paint) | < 1.8s | A mesurer |

- [ ] **P2** Images : ajouter `width`/`height` ou `aspect-ratio` pour eviter le CLS
- [ ] **P2** Fonts : `<link rel="preload">` pour Fraunces et DM Sans (critique pour LCP)
- [ ] **P2** Metadata SEO : verifier `title`, `description`, `og:image` sur chaque page
- [ ] **P3** `next/image` au lieu de `<img>` natif pour l'optimisation automatique (WebP, lazy, srcset)
- [ ] **P3** Bundle splitting : verifier que ChatWidget est lazy-loaded (pas charge si pas visible)

---

## 15. MICRO-INTERACTIONS & DETAILS

### 15.1 Transitions

- [ ] **OK** Hover boutons : changement de background avec transition 150ms
- [ ] **OK** Hover cartes : elevation translateY(-2px) + shadow
- [ ] **P3** Ajouter une micro-animation au toggle watchlist (scale bounce du coeur)
- [ ] **P3** Smooth scroll sur les ancres internes (#strats, #how, #pricing) — actuellement saut instantane

### 15.2 Loading States

| Composant | Skeleton | Spinner | Optimistic UI |
|-----------|----------|---------|---------------|
| BienCard photo | OK | - | - |
| Biens listing | OK | OK | - |
| Watchlist toggle | - | OK (opacity) | Non |
| Fiche bien | ABSENT | ABSENT | - |
| Chat envoi msg | - | OK (dots) | - |

- [ ] **P1** Fiche bien : ajouter skeleton screen au chargement
- [ ] **P2** Watchlist toggle : optimistic UI (coeur change immediatement, rollback si erreur)
- [ ] **P3** Toast notifications pour actions (ajoute/retire de la watchlist, profil sauvegarde)

### 15.3 Feedback Utilisateur

- [ ] **P2** Toast system : bottom-right, 3s, vert succes / rouge erreur / orange warning
- [ ] **P2** Messages d'erreur humains ("Impossible de charger ce bien" plutot que ecran blanc)
- [ ] **P3** Confirmation de copie du lien (share) avec toast

### 15.4 Formulaires

- [ ] **P2** Validation temps reel (email format, mot de passe force)
- [ ] **P2** Messages d'erreur sous le champ concerne, en rouge, texte explicite
- [ ] **P2** Champs obligatoires marques (asterisque rouge)
- [ ] **P3** Tab order logique (tester avec Tab sur toutes les pages)

### 15.5 Textes & Copies

- [ ] **P2** Verifier le ton : vouvoiement coherent partout (pas de melange tu/vous)
- [ ] **P2** Boutons avec verbes d'action ("Voir l'analyse" pas "Analyse")
- [ ] **P3** Relecture orthographe complete (aria-label "precedente" mal accentue dans BienCard)
- [ ] **P3** Messages d'erreur empathiques ("Oups, ce bien n'est plus disponible" pas "Error 404")

---

## 16. PAGES MANQUANTES OU INCOMPLETES

| Page | Statut | Priorite |
|------|--------|----------|
| Landing page | OK | - |
| Listing biens | OK | - |
| Fiche bien | OK | - |
| Blog listing + article | OK | - |
| Strategies | OK | - |
| Auth (login/register) | OK | - |
| Watchlist (mes-biens) | OK | - |
| Profil + parametres | OK | - |
| CGU + Mentions legales | OK | - |
| Privacy (RGPD) | OK | - |
| 404 personnalisee | OK | - |
| Page "Tarifs" standalone | MANQUANTE | P3 (integree dans la landing) |
| Page "Contact" | MANQUANTE | P2 |
| Page "FAQ" | MANQUANTE | P3 |
| Sitemap.xml | OK | - |
| Robots.txt | OK | - |

---

## 17. PAYWALL & CONVERSION

### 17.1 Experience Free User

| Point de friction | Statut | Amelioration |
|-------------------|--------|-------------|
| Fiches biens : chiffres floutes | OK (`.val-blur`) | - |
| Bandeau CTA "Passez Pro" par bloc | OK | Rendre plus engageant avec un argument par bloc |
| 2 analyses completes offertes | OK | Afficher le compteur ("1/2 analyses restantes") |
| Watchlist limitee a 10 | OK + modal si depassement | - |
| Chat limite 5 msg/jour | OK mais pas de compteur visible | Afficher "3/5 messages restants" |

- [ ] **P1** Afficher les compteurs de limites (analyses, messages, watchlist) de facon proactive
- [ ] **P2** CTA de conversion contextuels : "Debloquez l'estimation DVF" plutot que generique "Passez Pro"
- [ ] **P3** Page de resultat apres inscription : guider le nouveau user ("Voici vos prochaines etapes")

### 17.2 Onboarding First-Time User

- [ ] **P1** Apres inscription : rediriger vers les biens avec un message de bienvenue
- [ ] **P2** Tutoriel leger (3 tooltips) au premier login : filtres, fiche bien, watchlist
- [ ] **P3** Email de bienvenue avec guide rapide

---

## 18. CHECKLIST PRE-LANCEMENT

### Tests navigateurs
- [ ] Chrome (desktop + Android)
- [ ] Safari (macOS + iPhone)
- [ ] Firefox (desktop)
- [ ] Edge (desktop)

### Tests UX
- [ ] Parcours complet : inscription → filtres → fiche bien → watchlist → profil
- [ ] Test avec un compte neuf (first-time user experience)
- [ ] Test avec beaucoup de donnees (10 000+ biens, scroll, pagination)
- [ ] Test avec zero donnee (empty states sur toutes les pages)
- [ ] Test paywall : experience Free vs Pro vs Expert

### Tests performance
- [ ] Lighthouse score > 80 (Performance, Accessibility, Best Practices, SEO)
- [ ] Pas de layout shift visible au chargement
- [ ] Images toutes lazy-loaded sauf hero

### Tests accessibilite
- [ ] Navigation complete au clavier (Tab + Enter + Escape)
- [ ] Screen reader (NVDA ou VoiceOver) : parcours principal lisible
- [ ] Zoom 200% : rien ne deborde

### Verification finale
- [ ] Tous les liens fonctionnent (pas de 404)
- [ ] Tous les textes relus (0 faute)
- [ ] Variables d'environnement en production OK
- [ ] Stripe en mode Live (pas Test)
- [ ] Analytics et Pixel charges correctement (avec consent cookie)

---

## PLAN D'ACTION RECOMMANDE

### Sprint 1 — Fondations (1 semaine)
1. Composants `<Button>`, `<Input>`, `<Modal>` partages
2. Menu hamburger mobile
3. Focus visible + ARIA labels de base
4. Loading state / error boundary sur fiche bien

### Sprint 2 — Conversion (1 semaine)
1. CTA final landing page
2. Barre logos plateformes (social proof)
3. Compteurs de limites visibles (analyses, messages, watchlist)
4. Onboarding premier login

### Sprint 3 — Polish (1 semaine)
1. Responsive mobile complet (filtres drawer, cartes pleine largeur)
2. Toast notifications
3. Contraste WCAG AA (assombrir muted)
4. Performance (next/image, font preload, skeleton screens)

### Sprint 4 — Extras (1 semaine)
1. Temoignages landing page
2. Page Contact
3. Partage social blog
4. Smooth scroll + micro-animations
