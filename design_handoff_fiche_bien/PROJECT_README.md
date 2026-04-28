# Mon Petit MDB — Design System

**Mon Petit MDB** is a real estate deal analysis platform for French property flippers ("marchands de biens"). It helps professional investors evaluate a property, negotiate a purchase, and project the outcome of a flipping strategy before they commit capital.

The product stack is **Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + TypeScript**, deployed on Vercel, with **Supabase** (database/auth) and **Stripe** (Pro subscription). Map views use **Leaflet**.

## Brand positioning

The product is positioned as **editorial-pro, not SaaS-generic** — "Bloomberg terminal meets a good investment magazine" rather than a startup dashboard. The user is a serious professional doing real deals; the UI has to feel considered and expert, never patronizing.

The visual language is warm, paper-like, and numerically serious. All UI copy is in **French**.

## Products covered

There is one primary product surface:

1. **The App** — the authenticated analysis workspace. Core screens are:
   - **Listing pages** — a grid of `biens` (properties) filtered by strategy.
   - **Property fiche (detail) pages** — the core view. 4–5 tabs: Aperçu, Estimation, Financement, Fiscalité. The **Aperçu** tab adapts by strategy (lot table for immeuble de rapport, travaux diagnostic for rénovation, countdown for enchères, etc.).
   - **Modals** — Compléter les données, Détail des lots, Affiner le budget travaux, Source annonce.
   - **Paywall / Pro modules** — blurred content with an unlock card for non-Pro users.

The five strategies the platform covers:
- **Locataire en place** (tenant in place) — info blue
- **Travaux lourds** (heavy renovation) — mustard
- **Immeuble de rapport** (multi-unit building) — bordeaux accent
- **Division** (split into multiple lots) — forest green
- **Enchères** (auction) — neutral brown

## Sources used to build this system

This design system was built from a **written specification** provided by the team (color tokens, typography scale, component descriptions, language/formatting rules, strategy color coding). No Figma file, live codebase, or screenshots were attached — so components here are a faithful translation of the spec, not a recreation of a shipping UI.

If you have access to any of the following, please share them to tighten the recreation:
- The production Next.js codebase (especially `tailwind.config`, global styles, and the property fiche + listing pages).
- Figma frames for the fiche, the strategy variants, and the paywall.
- Production screenshots of the deal card, strategy bar, and community-validation data fields.

---

## Index

- `README.md` — this file (context, content fundamentals, visual foundations, iconography).
- `colors_and_type.css` — design tokens as CSS custom properties + semantic element defaults. Import this in any prototype to get the brand.
- `fonts/` — reference (both Fraunces and Inter are loaded from Google Fonts; no self-hosted files are required).
- `assets/` — logo mark, icon set (Lucide), strategy glyphs.
- `preview/` — Design System tab cards (colors, type, spacing, components, brand).
- `ui_kits/app/` — the App UI kit: JSX components + a clickable `index.html` showing a property fiche.
- `SKILL.md` — agent skill manifest so this folder can be used as a Claude Skill.

---

## CONTENT FUNDAMENTALS

### Language
All UI copy is in **French**. Never mix English UI labels into the product surface. Technical abbreviations that are standard in French real estate stay as-is: **FAI** (Frais d'Agence Inclus), **DPE**, **NC** (Non Communiqué), **MDB** (Marchand De Biens).

### Tone
- **Expert, not chatty.** The reader is a pro doing real deals. Short declarative labels, no marketing fluff, no "Let's do this!" energy.
- **Editorial, not corporate.** Think business-section of *Le Monde* or *Les Échos* — precise, slightly serious, with a trace of warmth from the paper-beige palette. Never patronizing.
- **Tu/vous:** use **vous** in user-facing copy ("Complétez les données manquantes", "Votre watchlist"). Never tutoyer.
- **No emoji.** At all. Data integrity signals are checkmarks and colored pills, not 🎉 or 🔥.
- **No exclamation marks** outside rare celebratory moments (e.g. "Bienvenue sur Mon Petit MDB !" on first login). Analysis and data states are stated, not exclaimed.

### Casing
- **Sentence case** for titles, buttons, and menu items: "Ajouter à ma watchlist", "Source annonce", "Compléter les données".
- **UPPERCASE** reserved for data-field labels only: `PRIX FAI`, `DÉCOTE À NÉGOCIER`, `RENDEMENT BRUT`. Letter-spacing 0.06–0.08em, weight 600, color `ink-mute`.
- **TitleCase** for proper product nouns: Pro, Watchlist, Aperçu.
- Strategy names follow French convention — "Locataire en place", "Travaux lourds", "Immeuble de rapport", "Division", "Enchères".

### Numbers and formatting
- **Thousand separator is a non-breaking space:** `160 000 €`.
- **Currency after the amount** with a non-breaking space.
- **Space before %:** `−32,6 %`.
- **Decimal separator is a comma:** `3,75 %`, `1 245,50 €`.
- **Minus sign is U+2212** (`−`), never a hyphen. Gains stay unsigned when the colour communicates direction (green = gain). Losses and decotes carry the minus.
- **Old-style figures** (`font-variant-numeric: oldstyle-nums`) on prices and big figures — this is what gives the editorial feel.

### Example copy

**Card titles** — short, noun-first:
> "Prix cible"
> "Décote à négocier"
> "Rendement brut"
> "Simulation de crédit"
> "Travaux estimés"

**Empty / missing states** — factual, actionable, never cute:
> "Donnée non communiquée." + a link: "Compléter"
> Not: "Oops, no data yet! 🙈"

**CTAs** — verb-first, imperative, short:
> "Ajouter à ma watchlist"
> "Voir la source"
> "Compléter les données"
> "Débloquer le module Pro"

**Validated-community signal** — quiet and precise:
> "Validé par 12 utilisateurs"
> "1 utilisateur a contribué"

**Paywall heading** — never FOMO:
> "Module Pro — Simulation fiscale complète"
> "Accédez au détail des lots, au budget travaux ligne à ligne et aux simulations fiscales multi-régimes."

---

## VISUAL FOUNDATIONS

### Palette
The defining move of the system is that **background is never pure white**. The page sits on a warm cream beige (`#f5ede2`), cards are white, and borders are a low-contrast bone (`#e6dccb`). That single choice pulls the whole product toward "printed investment magazine" and away from "SaaS dashboard."

Primary text is a warm brown-black (`#1f1b16`) — again, **never `#000`**. This lets the serif figures breathe against the cream.

Accents are muted, editorial, and **monochromatic per strategy**. Each of the five strategies owns one hue (bordeaux, mustard, green, info blue, neutral brown). A strategy's color appears in the hero chip background, the left border of its strategy bar, and its icon tint — but never in large flat fills. Color is a signal, not decoration.

- **Bordeaux** `#b4442e` is the single "brand" red. It is used for target prices, decote values, primary CTAs, negotiation levers, and paywall highlights. If one color has to carry the brand it's this one.
- **Forest green** `#2f7d5b` is for gains, validated data, positive financial figures.
- **Mustard** `#c77f1f` is for the Travaux strategy and warning/partial states (DPE badges, "1 user submitted").
- **Info blue** `#3a5f7d` is muted; used only for informational statuses and the Locataire strategy.
- **Neutral brown** `#8a5a3c` is the Enchères strategy.

Every accent has a `-soft` background counterpart (e.g. `accent-soft #f2d9d1`) used for pill backgrounds behind the strong color. Soft variants are roughly 10–12% L-tint of the accent on the cream.

### Type
Two families only:
- **Fraunces** (variable serif, Google) — titles, prices, **all numeric figures**, and card titles. Weight 400–500; titles lean 500. Old-style numerals on by default.
- **Inter** (Google) — all UI chrome: body, labels, buttons, tables, inputs.

Scale:
| Use | Font | Size | Weight |
|---|---|---|---|
| H1 | Fraunces | 32px | 500 |
| H2 | Fraunces | 26px | 500 |
| Card title | Fraunces | 18px | 500 |
| Price (hero) | Fraunces | 26px | 500 |
| Price (row) | Fraunces | 22px | 500 |
| Body | Inter | 14px | 400 |
| Button | Inter | 13px | 500 |
| Hint | Inter | 12px | 400 |
| Meta | Inter | 11px | 400 |
| Uppercase label | Inter | 10–11px | 600, tracking 0.06–0.08em |

### Spacing, radii, shadows
- **Radii:** 8 (chips/inputs) · 14 (cards/blocks) · 20 (hero containers). Never sharp 90° corners, never fully rounded pills on large surfaces.
- **Shadows:** subtle, layered, never dramatic. See `colors_and_type.css` for the three stops. Drop shadows stay under ~10% alpha.
- **Card padding:** 22–28px internal.
- **Grid gaps:** 20–28px between cards.
- **Borders:** 1px `#e6dccb`. Soft borders `#efe7d7` on nested surfaces.

### Backgrounds
- Page background is always `paper` (`#f5ede2`).
- Alternating sections use `paper-alt` (`#ede3d4`) to break rhythm — e.g. a full-bleed section between two white card stacks.
- **No gradient SaaS backgrounds.** The one place gradient appears is the **decote banner** inside the deal card (a soft bordeaux radial), and even there it's restrained.
- **No imagery flourishes.** No hero photography, no patterns, no hand-drawn illustration. Property photos only, never decorative art.

### Motion
Motion is **functional, never performative**.
- Transitions: 150ms for hover/press state changes, 200ms for reveal (modals, drawers), 280ms for tab-content swap.
- Easing: `cubic-bezier(.2, .7, .2, 1)` — a soft ease-out. No bouncy springs.
- Fades over slides. Opacity + small 4–8px translate on modal entry. Never slide-in from off-screen for inline UI.
- No looping or attention-grabbing animation on static UI. Skeletons shimmer at 1.2s cycle only while loading.

### Hover and press states
- **Hover on white cards:** border shifts from `line` to `ink-mute`, shadow moves from `sm` to `base`. No background color change.
- **Hover on buttons:** primary (bordeaux / ink) darkens by ~6% L. Outlined buttons gain a `paper-alt` fill.
- **Press:** all interactive surfaces scale to `0.985` for 120ms. No additional color shift.
- **Focus-visible:** 2px outline in `accent` with 2px offset. Never a default blue browser ring.
- **Disabled:** 50% opacity, `cursor: not-allowed`, no hover reaction.

### Borders, dividers, separation
Prefer **border + space** over **shadow**. A card is typically `1px solid var(--line)` + `shadow-sm`. Only the hero deal card and modals use `shadow-lg`. Internal sections of a card are separated by 1px `line-soft` dividers, never by background color change.

### Transparency and blur
Used **only** for the paywall: locked modules display their real content at 55% opacity with a 5px blur, and the unlock card sits on top with `backdrop-filter: blur(8px)` + a slightly translucent paper fill. Blur is never used for decoration.

### Iconography colour
Icons inherit `currentColor` and are tinted by context:
- Strategy icons: strategy accent color, placed on strategy-`-soft` background.
- Action icons in buttons: match the button text color.
- Standalone inline icons (inside data fields): `ink-soft` at 18px, 1.5px stroke.

### Imagery
When property photos appear, they are cropped 4:3 or 3:2 with a 14px radius and a 1px `rgba(31,27,22,.08)` inner-border to soften the edge against the cream. No filters, no duotone, no grain.

---

## ICONOGRAPHY

Mon Petit MDB uses **Lucide** icons throughout (1.5px stroke, round line caps). Lucide matches the calm, editorial tone — no filled iconography, no cartoonish bubble shapes. Icons are monochrome and inherit color from their context.

- **No emoji anywhere in the UI.** This is non-negotiable for the editorial tone.
- **No unicode icons** except for two characters:
  - `→` (U+2192) in "En savoir plus →" links and strategy bars.
  - `✓` (U+2713) inside validation buttons and success chips.
- **Strategy icons** are the Lucide glyphs:
  - Locataire en place → `users-round`
  - Travaux lourds → `hammer`
  - Immeuble de rapport → `building-2`
  - Division → `split-square-vertical`
  - Enchères → `gavel`
- **Common UI icons**: `search`, `sliders-horizontal`, `map-pin`, `bookmark`, `external-link`, `lock`, `check`, `x`, `chevron-right`, `info`, `plus`, `pencil`.

Icons are loaded via the Lucide CDN (`https://unpkg.com/lucide@latest`) in prototypes. In production, the Next.js app should use `lucide-react` and import only the glyphs it uses.

A small set of pre-rendered SVGs for the most-used icons is mirrored in `assets/icons/` so this system works offline.

### Logo
The product mark is a serif "M." wordmark in bordeaux set on cream — see `assets/logo.svg`. Minimum size 20px high. Clearspace = cap-height on all sides. Never display on pure white; always on paper or a photo with sufficient contrast.

---

## Font substitution notice

Both brand fonts (**Fraunces** and **Inter**) are loaded from Google Fonts — no self-hosted files required and no substitution applied. If the team wants to pin specific axes or self-host for performance, drop the `.woff2` files into `fonts/` and update `colors_and_type.css` accordingly.
