# Mon Petit MDB — Audit UI/UX complet

## 1. DESIGN SYSTEM & COHERENCE GLOBALE

### 1.1 Typographie
- [ ] Hierarchie claire : H1 > H2 > H3 > body > caption (jamais plus de 5 niveaux)
- [ ] Tailles cohérentes sur toutes les pages (pas de 13px ici et 14px là pour le meme role)
- [ ] Poids de police standardisés : 400 (body), 500 (label), 600 (semi-bold), 700 (titre), 800 (hero)
- [ ] Line-height cohérent : 1.2 titres, 1.5 body, 1.7 texte long
- [ ] Letter-spacing : négatif sur les gros titres (-0.02em), légèrement positif sur les labels uppercase (0.06em)
- [ ] Pas de texte orphelin (un mot seul sur la dernière ligne d'un paragraphe)
- [ ] Pas de mélange serif/sans-serif incohérent (Fraunces = titres, DM Sans = UI)

### 1.2 Couleurs
- [ ] Toutes les couleurs viennent de theme.ts — zéro couleur hardcodée
- [ ] Contraste WCAG AA minimum (4.5:1 texte, 3:1 grands textes)
- [ ] Palette limitée : primary (rouge), ink (noir), muted (gris), sand (bordure), bg (beige), success (vert), warning (orange)
- [ ] Pas plus de 2 couleurs vives par écran (rouge + vert OK, rouge + vert + orange + bleu = chaos)
- [ ] Couleurs sémantiques : rouge = danger/prix, vert = positif/gain, orange = attention, gris = neutre
- [ ] Texte secondaire toujours en muted (#9a8a80), jamais en gris pur (#999)
- [ ] Hover states cohérents : même delta de luminosité partout

### 1.3 Espacements
- [ ] Grille de 4px ou 8px stricte (pas de 7px, 13px, 17px random)
- [ ] Espacement vertical entre sections : 32px ou 48px (pas de mix)
- [ ] Padding intérieur des cartes : 16px, 20px ou 24px (un seul par type de carte)
- [ ] Marges entre les éléments de formulaire : identiques partout (12px ou 16px)
- [ ] Gap dans les flex/grid : standardisé (8px petit, 16px moyen, 24px grand)
- [ ] Padding horizontal des pages : identique partout (48px desktop, 24px mobile)

### 1.4 Bordures & Ombres
- [ ] Border-radius cohérent : 4px (badges), 8px (boutons), 12px (cartes), 16px (sections)
- [ ] Bordure couleur unique : sand (#e8e2d8) partout, pas de mélanges
- [ ] Ombres limitées : card (subtile), hover (prononcée), dropdown (moyenne)
- [ ] Pas d'ombre + bordure sur le même élément (choisir l'un ou l'autre)

### 1.5 Iconographie
- [ ] Style cohérent (outline OU filled, pas de mélange)
- [ ] Taille cohérente (16px inline, 20px bouton, 24px navigation)
- [ ] Pas d'emojis dans l'UI de production (OK pour les prototypes, pas pour le site final)
- [ ] Icônes alignées verticalement avec le texte adjacent

## 2. HEADER / NAVIGATION

### 2.1 Structure
- [ ] Logo cliquable → retour accueil
- [ ] Navigation principale visible sans hover (pas de hamburger sur desktop)
- [ ] Indicateur de page active (souligné, background, bold)
- [ ] Sticky header avec backdrop-filter blur
- [ ] Hauteur fixe (56px) cohérente sur toutes les pages
- [ ] Pas de CLS (Cumulative Layout Shift) au chargement du header

### 2.2 Responsive
- [ ] Hamburger menu sur mobile (< 768px)
- [ ] Logo réduit sur mobile (texte court ou icône seule)
- [ ] Menu mobile : overlay plein écran ou drawer latéral
- [ ] Bouton connexion accessible sur mobile

### 2.3 Éléments
- [ ] Avatar utilisateur avec initiale (pas juste l'email)
- [ ] Notification badge sur la watchlist (nombre de biens)
- [ ] Transition smooth entre états connecté/déconnecté
- [ ] Dropdown profil propre (déconnexion, profil, admin si admin)

## 3. LANDING PAGE / ACCUEIL

### 3.1 Hero Section
- [ ] Titre accrocheur (proposition de valeur en 1 phrase)
- [ ] Sous-titre explicatif (2 lignes max)
- [ ] CTA principal visible (contraste fort, taille généreuse)
- [ ] CTA secondaire (ex: "Voir une démo")
- [ ] Image/illustration pertinente (pas de stock photo générique)
- [ ] Espacement généreux (80px+ au-dessus et en-dessous)

### 3.2 Social Proof
- [ ] Nombre de biens sourcés ("91 000+ biens analysés")
- [ ] Nombre de plateformes ("60+ plateformes")
- [ ] Logos des plateformes sourcées (LBC, SeLoger, Bienici...)
- [ ] Témoignages utilisateurs (même fictifs au début)

### 3.3 Features
- [ ] 3-4 blocs features max (pas de liste à la Prévert)
- [ ] Icône + titre + description courte par feature
- [ ] Alternance gauche/droite ou grille régulière
- [ ] Captures d'écran de l'app dans les features

### 3.4 Pricing
- [ ] 3 plans max côte à côte
- [ ] Plan recommandé mis en avant (bordure, badge "Populaire")
- [ ] Prix clair (mensuel, HT/TTC)
- [ ] Liste de features par plan avec check/cross
- [ ] CTA par plan

### 3.5 CTA Final
- [ ] Section de conclusion avec CTA fort
- [ ] Rappel de la proposition de valeur
- [ ] Urgence ou rareté si pertinent

## 4. PAGE BIENS (LISTING)

### 4.1 Filtres
- [ ] Barre de filtres sticky ou facilement accessible
- [ ] Filtres visuellement groupés par catégorie
- [ ] Reset des filtres en un clic
- [ ] Compteur de résultats mis à jour en temps réel
- [ ] États actifs des filtres clairement visibles
- [ ] Pas de filtre qui retourne 0 résultat sans avertissement

### 4.2 Cartes biens (grille)
- [ ] Photo de bonne qualité, ratio cohérent (16:9 ou 4:3)
- [ ] Placeholder élégant si pas de photo (pas juste "Pas de photo" en texte)
- [ ] Infos essentielles visibles sans clic : prix, surface, pièces, ville, rendement
- [ ] Badge stratégie visible
- [ ] Badge +/- value visible
- [ ] Bouton watchlist (coeur) accessible sans gêner le clic sur la carte
- [ ] Hover subtil (élévation + ombre, pas de changement brutal)
- [ ] Carrousel photo fluide (pas de lag, pas de flash blanc entre photos)

### 4.3 Liste biens
- [ ] Tableau aligné, colonnes de largeur cohérente
- [ ] En-têtes fixes lors du scroll vertical
- [ ] Lignes hover subtiles
- [ ] Données manquantes affichées en gris italique "NC" (pas vide)
- [ ] Actions (voir, watchlist) toujours visibles sans scroll horizontal

### 4.4 Scroll infini
- [ ] Indicateur de chargement en bas (spinner, pas "Chargement...")
- [ ] Smooth scroll, pas de saut
- [ ] Compteur "X affichés sur Y" toujours visible
- [ ] Retour en haut de page facile

### 4.5 Empty states
- [ ] Message clair quand aucun résultat
- [ ] Suggestion d'action (élargir les filtres, changer de stratégie)
- [ ] Illustration ou icône, pas juste du texte

## 5. FICHE BIEN (DETAIL)

### 5.1 Hero
- [ ] Photo principale grande, qualité maximale
- [ ] Carrousel de photos fluide avec compteur
- [ ] Infos clés visibles immédiatement : prix, surface, pièces, ville, DPE
- [ ] Badges stratégie + statut
- [ ] Bouton watchlist
- [ ] Liens vers les plateformes (logos)

### 5.2 Données du bien
- [ ] Grille de données alignée et cohérente
- [ ] Labels en uppercase léger, valeurs en font plus grande
- [ ] Données manquantes : "NC" avec style dédié (gris, italic)
- [ ] Regroupement logique : Identité, Caractéristiques, Locatif, Travaux
- [ ] Champs enrichissables mis en avant (jaune/vert selon validation)

### 5.3 Estimation DVF
- [ ] Affichage clair du prix estimé vs prix FAI
- [ ] Barre visuelle de la fourchette (prix bas → estimé → prix haut)
- [ ] Confiance (A/B/C/D) avec code couleur
- [ ] Correcteurs listés avec badges colorés
- [ ] Nombre de comparables et rayon
- [ ] Bouton recalculer

### 5.4 Simulateur fiscal
- [ ] Inputs avec labels clairs et unités (€, %, ans)
- [ ] Sliders pour apport et durée (pas juste des inputs)
- [ ] Résultats calculés en temps réel (pas de bouton "calculer")
- [ ] Deux colonnes comparatives bien alignées
- [ ] Chiffres négatifs en rouge, positifs en vert
- [ ] Section revente intégrée avec waterfall clair

### 5.5 Contact vendeur
- [ ] Message pré-rédigé intelligent
- [ ] Bouton copier le message
- [ ] Lien direct vers la plateforme d'origine
- [ ] Statut du contact (envoyé, répondu, etc.)

### 5.6 Navigation
- [ ] Bouton retour qui conserve les filtres et la position scroll
- [ ] Navigation entre biens (précédent/suivant) si possible
- [ ] Breadcrumb : Biens > Locataire en place > Nantes > Ce bien

## 6. WATCHLIST

- [ ] Onglets par stratégie (comme fait)
- [ ] Même qualité visuelle que la page biens
- [ ] Pouvoir retirer un bien facilement (pas de confirmation pour le coeur)
- [ ] Empty state encourageant ("Explorez les biens pour commencer")
- [ ] Export possible (CSV, PDF) — même si payant

## 7. MON PROFIL

- [ ] Formulaire clair avec sections (Fiscal, Financement, Budget travaux)
- [ ] Sauvegarde automatique ou bouton sauvegarder visible
- [ ] Feedback de sauvegarde (toast "Profil mis à jour")
- [ ] Explication de chaque champ (tooltip ou sous-label)
- [ ] Valeurs par défaut intelligentes pour les nouveaux utilisateurs

## 8. EDITORIAL / BLOG

- [ ] Liste d'articles avec image cover, titre, date, catégorie
- [ ] Article en pleine largeur, typographie soignée (Lora)
- [ ] Temps de lecture estimé
- [ ] Partage social (LinkedIn, Twitter, copier le lien)
- [ ] Articles liés en fin d'article ("Vous aimerez aussi")
- [ ] Auteur avec avatar et bio courte
- [ ] Table des matières flottante pour les articles longs

## 9. FOOTER

- [ ] Logo + baseline
- [ ] Liens rapides : Biens, Blog, Tarifs, Contact, CGV, Mentions légales
- [ ] Réseaux sociaux (icônes)
- [ ] Newsletter (email input + bouton)
- [ ] Copyright avec année dynamique
- [ ] Pas trop chargé (max 4 colonnes)
- [ ] Couleur de fond différente du body (légèrement plus sombre ou plus clair)

## 10. RESPONSIVE / MOBILE

### 10.1 Breakpoints
- [ ] Mobile : < 640px
- [ ] Tablette : 640px - 1024px
- [ ] Desktop : > 1024px
- [ ] Pas de scroll horizontal sur aucun device

### 10.2 Mobile spécifique
- [ ] Grille biens en 1 colonne
- [ ] Filtres dans un drawer/modal (pas inline)
- [ ] Simulateur fiscal scrollable (pas de colonnes côte à côte)
- [ ] Photos bien en plein écran
- [ ] Boutons assez grands (min 44px de hauteur)
- [ ] Texte lisible sans zoom (min 16px body)
- [ ] Pas de hover effects sur mobile (utiliser tap)

## 11. PERFORMANCE & TECHNIQUE

- [ ] Images optimisées (WebP, lazy loading)
- [ ] Pas de layout shift au chargement (CLS < 0.1)
- [ ] First Contentful Paint < 1.5s
- [ ] Fonts préchargées (preload)
- [ ] Metadata SEO sur chaque page (title, description, og:image)
- [ ] Favicon correct (toutes tailles)
- [ ] 404 personnalisée
- [ ] Sitemap.xml généré
- [ ] robots.txt configuré

## 12. MICRO-INTERACTIONS & DETAILS

### 12.1 Transitions
- [ ] Toutes les transitions : 150ms ease (rapide) ou 300ms ease (visible)
- [ ] Pas de transition > 500ms (sensation de lenteur)
- [ ] Hover sur boutons : changement de background, pas juste opacité
- [ ] Hover sur cartes : élévation subtile (translateY -2px + ombre)
- [ ] Focus visible sur tous les éléments interactifs (accessibilité clavier)

### 12.2 Loading states
- [ ] Skeleton screens au lieu de spinners (sauf overlay modal)
- [ ] Boutons disabled pendant le chargement avec spinner intégré
- [ ] Progress bar pour les opérations longues
- [ ] Optimistic UI quand possible (watchlist toggle instantané)

### 12.3 Feedback utilisateur
- [ ] Toast notifications pour les actions (sauvegardé, ajouté, erreur)
- [ ] Position : bottom-right, durée 3s, dismissible
- [ ] Couleurs : vert succès, rouge erreur, orange avertissement
- [ ] Pas plus d'un toast à la fois

### 12.4 Formulaires
- [ ] Labels toujours au-dessus de l'input (pas à gauche)
- [ ] Placeholder = exemple, pas explication (l'explication c'est le label)
- [ ] Validation en temps réel (pas juste à la soumission)
- [ ] Messages d'erreur sous le champ, en rouge, texte explicite
- [ ] Champs obligatoires marqués (astérisque ou mention)
- [ ] Tab order logique
- [ ] Autofocus sur le premier champ

### 12.5 Textes & Copies
- [ ] Zéro faute d'orthographe
- [ ] Ton cohérent (vouvoiement OU tutoiement, pas les deux)
- [ ] Boutons avec verbes d'action ("Voir l'analyse" pas "Analyse")
- [ ] Messages d'erreur humains ("Oups, quelque chose a planté" pas "Error 500")
- [ ] Texte vide encourageant, pas juste "Aucun résultat"

## 13. PAGES MANQUANTES

- [ ] Landing page / Accueil
- [ ] Page tarifs
- [ ] Page "Comment ça marche"
- [ ] Page blog publique (articles publiés)
- [ ] Page 404
- [ ] Page CGV / Mentions légales
- [ ] Page contact

## 14. CHECKLIST PRE-LANCEMENT

- [ ] Test sur Chrome, Firefox, Safari, Edge
- [ ] Test sur iPhone (Safari), Android (Chrome)
- [ ] Test avec un compte neuf (first-time user experience)
- [ ] Test avec beaucoup de données (scroll, pagination)
- [ ] Test avec zéro donnée (empty states)
- [ ] Test de vitesse (Lighthouse score > 90)
- [ ] Test accessibilité (Wave, axe)
- [ ] Relecture de tous les textes
- [ ] Vérification de tous les liens
- [ ] Backup base de données
