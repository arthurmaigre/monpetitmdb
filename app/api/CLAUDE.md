# API Routes — Conventions & Pipeline

## Conventions obligatoires

```typescript
// Toujours await params (bug Next.js 16)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
}

// Auth Bearer pour routes protégées
const authHeader = req.headers.get('Authorization')
if (!authHeader?.startsWith('Bearer ')) return new Response('Unauthorized', { status: 401 })

// Crons : CRON_SECRET en header
// UI : token user Supabase en header
```

## Routes principales

### Biens (`/api/biens`)
- `GET /api/biens` — liste avec filtres, exige Bearer token
- `POST /api/biens` — création + auto-ajout watchlist
- `GET/PATCH /api/biens/[id]` — fiche + édition

### Enchères (`/api/encheres`)
- `GET /api/encheres` — liste avec filtres (statut, occupation, ville, prix, surface, tribunal, date)
- `GET/PATCH /api/encheres/[id]` — fiche + édition
- `GET /api/estimation/encheres/[id]` — estimation DVF

### Admin pipeline (`/api/admin/`)
- `/regex` — validation regex faux positifs (cron 3h30 + 15h30)
- `/extraction` — extraction données locatives (legacy Haiku — remplacé par VPS Sonnet)
- `/score-travaux` — score travaux (legacy Haiku — remplacé par VPS Sonnet)
- `/extraction-idr` — extraction IDR (legacy Haiku — remplacé par VPS Sonnet)
- `/estimation-batch` — estimation DVF batch (cron toutes les minutes)
- `/statut` — vérification annonces expirées (désactivé — LBC bloque HEAD)
- `/alertes` — envoi alertes email Brevo (cron 9h quotidien)
- `/stats` — stats dashboard (RPC `admin_stats`)

### Sourcing
- `/stream-estate/webhook` — webhook SE (property.ad.create + ad.update.expired + price)
- `/moteurimmo/webhook` — legacy (API coupée 2026-04-06, désactivé)

### Stripe (`/api/stripe/`)
- `/checkout` — création session Stripe Checkout
- `/portal` — Customer Portal
- `/webhook` — events Stripe (checkout.completed, subscription.updated/deleted)

### Auth & Profil
- `/profile` — GET/PUT profil utilisateur
- `/watchlist` — GET/POST/DELETE watchlist

## Affichage frontend — Filtres obligatoires

**Biens** :
```sql
regex_statut = 'valide'
-- Pour Locataire en place et IDR en plus :
AND extraction_statut = 'ok'
```

**Enchères** :
```sql
enrichissement_statut = 'ok'
```

## Pipeline IA post-ingestion

Ordre des étapes (piloté depuis `/admin/sourcing`) :
1. Ingestion Stream Estate → `biens` table (polling VPS 22h30 via `ingest_stream_estate.py`)
2. Regex validation → `regex_statut = 'valide' | 'faux_positif'` (cron-job.org 3h30 + 15h30)
3. Extraction Sonnet VPS (Locataire en place) → loyer, charges, profil_locataire, nb_sdb, nb_chambres
   — cron VPS 4h : `batch_extraction_biens.py locataire --source stream_estate`
4. Score travaux Sonnet VPS (Travaux lourds) → score_travaux 1-5, score_commentaire
   — cron VPS 4h : `batch_extraction_biens.py score --source stream_estate`
5. Extraction IDR Sonnet VPS → nb_lots, lots_data JSONB, monopropriete, compteurs
   — cron VPS 4h : `batch_extraction_biens.py idr --source stream_estate`
6. Estimation DVF batch → estimation_prix_m2, estimation_prix_total, confiance A/B/C/D

**Traçabilité** : chaque étape timestamp `{étape}_statut` + `{étape}_date`.

## Déduplication (webhook Stream Estate — 4 niveaux)

1. URL source directe (`biens.url`)
2. `stream_estate_id` (bien déjà rattaché)
3. Table `biens_source_urls` (360k URLs — remplace `.contains()` JSONB qui timeout)
4. Matching geo fallback (code_postal + type_bien + nb_pieces + surface ±1m² + prix ±2%)

## Stream Estate — Saved searches

- `/searches/d12ba9a4-...` → Locataire en place (3 expressions)
- `/searches/cfe1717e-...` → Travaux lourds (11 expressions)
- `/searches/7019ec35-...` → Division (10 expressions)
- `/searches/dd4125d9-...` → Immeuble de rapport (7 expressions)

**IMPORTANT** : `strict: true` obligatoire (strict: false → 95% faux positifs via stemming).
**IMPORTANT** : `update-search` MCP ne peut PAS modifier les expressions (bug format). Utiliser REST direct.

## Alertes email (Brevo)

- Pro : 1 alerte max, Expert : 5 alertes max
- Fréquence : quotidien (9h) ou hebdomadaire
- Filtres : strategie_mdb, metropole, ville, prix min/max, surface min/max, rendement min, score_travaux min
- Template HTML table-based, max 10 cards par email
- Env vars : `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`
