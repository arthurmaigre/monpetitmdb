"""
ingest_stream_estate.py — Ingestion bulk via API Stream Estate

Copie conforme du cron Next.js /api/admin/stream-estate-polling :
- Mêmes expressions SE (groupes inclusion + exclusions via API)
- Même validation Haiku (prompts identiques à lib/stream-estate-ingest.ts)
- Même déduplication 4 niveaux (URL, SE ID, source_urls, géo fallback)
- Même pipeline page par page (Haiku + insert immédiat par page)
- CHUNK_SIZE=5, CONCURRENCY=2 (10 Haiku simultanés)

Usage :
  python3 ingest_stream_estate.py --dry-run
  python3 ingest_stream_estate.py --from-date 2026-04-10 --to-date 2026-04-17
  python3 ingest_stream_estate.py --from-date 2026-04-10 --to-date 2026-04-17 --limit 50
  python3 ingest_stream_estate.py --strategie locataire --limit 50 --dry-run
"""
import os, sys, json, logging, argparse, unicodedata, time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

import subprocess
import requests as http_requests
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from supabase_client import get_client

log = logging.getLogger("ingest_se")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

API_KEY  = os.getenv("STREAM_ESTATE_API_KEY", "646dbf20852d6524745430b553e70802")
API_BASE = "https://api.stream.estate/documents/properties"

CHUNK_SIZE  = 5
CONCURRENCY = 2  # 10 appels CLI max simultanés

SE_PROPERTY_TYPE_MAP = {
    0: "Appartement", 1: "Maison", 2: "Immeuble",
    3: "Parking", 4: "Bureau", 5: "Terrain", 6: "Local commercial",
}

# ══════════════════════════════════════════════════════════════════════════════
# Stratégies — identiques à route.ts
# ══════════════════════════════════════════════════════════════════════════════

LEP_EXCLUSIONS = [
    "bail commercial", "local commercial", "fonds de commerce", "murs commerciaux",
    "ehpad", "residence senior", "residence de tourisme", "residence etudiante",
    "residence hoteliere", "residence de service", "residence geree",
    "maison de retraite", "lmnp",
]

STRATEGIES = {
    "locataire": {
        "strategie_mdb": "Locataire en place",
        "property_types": [0, 1],
        "surface_min": None,
        "keywords": [
            "locataire en place", "vendu loue", "bail en cours",
            "loyer actuel", "location en cours",
        ],
        "exclusions": LEP_EXCLUSIONS,
    },
    "travaux": {
        "strategie_mdb": "Travaux lourds",
        "property_types": [0, 1, 2],
        "surface_min": None,
        "keywords": [
            "entierement a renover", "a renover entierement", "a renover integralement",
            "a rehabiliter", "inhabitable", "tout a refaire", "toiture a refaire",
            "a restaurer", "a remettre aux normes", "a remettre en etat",
            "plateau a amenager", "bien a renover", "maison a renover",
            "appartement a renover", "immeuble a renover",
        ],
        "exclusions": [],
    },
    "division": {
        "strategie_mdb": "Division",
        "property_types": [0, 1, 2],
        "surface_min": 100,
        "keywords": [
            "division possible", "potentiel de division", "bien divisible",
            "maison divisible", "appartement divisible", "a diviser",
        ],
        "exclusions": [],
    },
    "idr": {
        "strategie_mdb": "Immeuble de rapport",
        "property_types": [2, 1],
        "surface_min": None,
        "keywords": [
            "immeuble de rapport", "copropriete a creer", "vente en bloc",
            "vendu en bloc", "immeuble locatif", "immeuble entierement loue",
        ],
        "exclusions": [],
    },
}

# ══════════════════════════════════════════════════════════════════════════════
# Haiku — prompts identiques à lib/stream-estate-ingest.ts
# ══════════════════════════════════════════════════════════════════════════════

HAIKU_PROMPTS = {
    "Locataire en place": (
        "Ce bien immobilier est-il vendu avec un locataire en place "
        "(bail d'habitation en cours, loyer actuel mentionné, occupé par un locataire) ? "
        "Réponds uniquement OUI ou NON."
    ),
    "Travaux lourds": (
        "Ce bien immobilier nécessite-t-il des travaux importants qui décotent significativement le prix "
        "(rénovation complète, gros œuvre, inhabitable, tout à refaire, vétuste, "
        "remise aux normes lourde, ou rénovation énergétique majeure DPE F ou G) "
        "— et non de simples travaux cosmétiques, de peinture ou de finition ? "
        "Réponds uniquement OUI ou NON."
    ),
    "Division": (
        "Ce bien immobilier a-t-il un vrai potentiel de division (en plusieurs logements "
        "résidentiels indépendants, ou division parcellaire/terrain permettant de construire) ? "
        "Inclus les maisons avec grand terrain divisible, les immeubles à convertir, "
        "les plateaux à aménager. Exclus les divisions de bureaux ou locaux commerciaux "
        "sans vocation résidentielle. Réponds uniquement OUI ou NON."
    ),
    "Immeuble de rapport": (
        "Ce bien immobilier est-il un immeuble de rapport destiné à l'investissement locatif "
        "(immeuble avec plusieurs logements ou lots locatifs, vendu en bloc ou en monopropriété, "
        "avec ou sans locataires en place) ? "
        "Inclus les immeubles avec plusieurs lots indépendants même s'ils sont vides. "
        "Exclus les maisons individuelles résidentielles, les villas et les appartements seuls. "
        "Réponds uniquement OUI ou NON."
    ),
}

def validate_with_haiku(title: str, description: str, strategie_mdb: str) -> bool:
    """Validation OUI/NON via claude CLI (Claude Code Max, 0 EUR API)."""
    prompt = HAIKU_PROMPTS.get(strategie_mdb)
    if not prompt:
        return True
    nl = chr(10)
    text = prompt + nl + nl + "Titre : " + title + nl + nl + "Description : " + description
    try:
        env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_API_KEY"}
        result = subprocess.run(
            ["claude", "-p", text, "--model", "haiku", "--output-format", "text", "--max-turns", "1"],
            capture_output=True, text=True, timeout=60, env=env,
        )
        out = result.stdout.strip().upper()
        err = result.stderr.strip().lower()
        # Si quota épuisé ou erreur CLI → fail open (ne pas rejeter à tort)
        quota_keywords = ["usage limit", "rate limit", "quota", "overloaded", "too many", "capacity", "error", "unavailable"]
        if any(k in err for k in quota_keywords) or (not out and result.returncode != 0):
            log.warning(f"[Haiku CLI] quota/erreur détecté, fail open")
            return True
        return out.startswith("OUI")
    except Exception as e:
        log.error(f"[Haiku CLI] erreur: {e}")
        return True  # fail open

def detect_keywords(title: str, description: str, strat_key: str) -> list:
    """Détecte les keywords présents dans le texte (sans accents, lowercase)."""
    raw = (title + " " + description).lower()
    normalized = unicodedata.normalize("NFD", raw)
    text = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    return [kw for kw in STRATEGIES[strat_key]["keywords"] if kw in text]

# ══════════════════════════════════════════════════════════════════════════════
# Appel API Stream Estate — groupes d'expressions (miroir Next.js)
# ══════════════════════════════════════════════════════════════════════════════

def fetch_group(
    keyword: str,
    exclusions: list,
    property_types: list,
    page: int,
    from_date: str = None,
    to_date: str = None,
    surface_min: int = None,
) -> list:
    """Appelle SE API avec 1 inclusion + N exclusions dans le même appel."""
    params = {
        "itemsPerPage": 30,
        "page": page,
        "transactionType": 0,
        "order[createdAt]": "desc",
        "lat": 46.6,
        "lon": 2.2,
        "radius": 600,
        "withCoherentPrice": "true",
    }
    # Inclusion
    params["expressions[0][0][word]"] = keyword
    params["expressions[0][0][options][includes]"] = "true"
    params["expressions[0][0][options][strict]"] = "true"
    # Exclusions
    for i, word in enumerate(exclusions, start=1):
        params[f"expressions[0][{i}][word]"] = word
        params[f"expressions[0][{i}][options][includes]"] = "false"
        params[f"expressions[0][{i}][options][strict]"] = "true"
    # Types de bien
    for j, pt in enumerate(property_types):
        params[f"propertyTypes[{j}]"] = pt
    if surface_min is not None:
        params["surfaceMin"] = surface_min
    if from_date:
        params["fromDate"] = from_date if 'T' in from_date else from_date + 'T00:00:00Z'
    if to_date:
        params["toDate"] = to_date if 'T' in to_date else to_date + 'T23:59:59Z'

    headers = {"X-Api-Key": API_KEY}
    r = http_requests.get(API_BASE, headers=headers, params=params, timeout=30)
    r.raise_for_status()
    return r.json().get("hydra:member", [])

# ══════════════════════════════════════════════════════════════════════════════
# Construction payload Supabase — miroir buildBienPayload (stream-estate-ingest.ts)
# ══════════════════════════════════════════════════════════════════════════════

def build_bien(
    prop_doc: dict,
    advert: dict,
    strategie_mdb: str,
    metropole_map: dict,
    source_keywords: list,
    is_valid: bool,
) -> dict:
    surface   = prop_doc.get("surface") or advert.get("surface")
    prix_fai  = advert.get("price")
    code_postal = (prop_doc.get("city") or {}).get("zipcode")
    ptype     = prop_doc.get("propertyType")
    room      = prop_doc.get("room") or advert.get("room")
    floor     = advert.get("floor")
    location  = prop_doc.get("location") or prop_doc.get("locations") or {}

    bien = {
        "url":               advert.get("url"),
        "strategie_mdb":     strategie_mdb,
        "statut":            "Toujours disponible" if is_valid else "Faux positif",
        "regex_statut":      "valide" if is_valid else "faux_positif",
        "source_keywords":   source_keywords if source_keywords else None,
        "type_bien":         SE_PROPERTY_TYPE_MAP.get(ptype),
        "prix_fai":          prix_fai,
        "surface":           surface,
        "prix_m2":           round(prix_fai / surface * 100) / 100 if prix_fai and surface else None,
        "nb_pieces":         f"T{room}" if room else None,
        "nb_chambres":       prop_doc.get("bedroom") or advert.get("bedroom"),
        "etage":             ("RDC" if floor == 0 else str(floor)) if floor is not None else None,
        "annee_construction": advert.get("constructionYear") or prop_doc.get("constructionYear"),
        "dpe":               (advert.get("energy") or {}).get("category"),
        "dpe_valeur":        (advert.get("energy") or {}).get("value"),
        "ges":               (advert.get("greenHouseGas") or {}).get("category"),
        "ville":             (prop_doc.get("city") or {}).get("name"),
        "code_postal":       code_postal,
        "metropole":         metropole_map.get(code_postal) if code_postal else None,
        "photo_url":         (advert.get("pictures") or [None])[0] or (prop_doc.get("pictures") or [None])[0],
        "latitude":          location.get("lat"),
        "longitude":         location.get("lon"),
        "surface_terrain":   advert.get("landSurface") or prop_doc.get("landSurface"),
        "stream_estate_id":  prop_doc.get("uuid"),
        "source_provider":   "stream_estate",
        "publisher_type":    (
            "professionnel" if (advert.get("publisher") or {}).get("type") == 1
            else "particulier" if (advert.get("publisher") or {}).get("type") == 0
            else None
        ),
        "price_history":     advert.get("events") if advert.get("events") else None,
        "moteurimmo_data": {
            "uniqueId":    prop_doc.get("uuid"),
            "origin":      (advert.get("publisher") or {}).get("name"),
            "title":       advert.get("title") or prop_doc.get("title"),
            "description": advert.get("description") or prop_doc.get("description"),
            "pictureUrls": advert.get("pictures") or prop_doc.get("pictures") or [],
            "publisher":   {"name": (advert.get("contact") or {}).get("name")},
            "duplicates": [
                {"url": a.get("url"), "origin": (a.get("publisher") or {}).get("name")}
                for a in prop_doc.get("adverts", [])
                if a.get("url") != advert.get("url")
            ],
            "category":      SE_PROPERTY_TYPE_MAP.get(ptype),
            "creationDate":  advert.get("createdAt"),
            "source":        "stream_estate",
            "priceHistory":  advert.get("events"),
            "stations":      prop_doc.get("stations"),
            "features":      advert.get("features"),
        },
    }

    # Charges copro (SE = annuel → /12)
    if advert.get("condominiumFees"):
        bien["charges_copro"] = round(advert["condominiumFees"] / 12)
    # Taxe foncière
    if advert.get("propertyTax"):
        bien["taxe_fonc_ann"] = advert["propertyTax"]
    # Ascenseur
    elev_advert = advert.get("elevator")
    elev_prop   = prop_doc.get("elevator")
    if elev_advert is True or elev_prop is True:
        bien["ascenseur"] = True
    elif elev_advert is False or elev_prop is False:
        bien["ascenseur"] = False

    return bien

# ══════════════════════════════════════════════════════════════════════════════
# Déduplication — 4 niveaux (miroir findExistingBien + sets en mémoire)
# ══════════════════════════════════════════════════════════════════════════════

def load_existing_sets(client):
    """Charge URLs et SE IDs depuis biens en mémoire (avec pagination).
    biens_source_urls (~360k lignes) N'est PAS pré-chargé — vérification par requête DB (niveau 3).
    """
    urls, se_ids = set(), set()
    try:
        PAGE = 1000
        offset = 0
        while True:
            res = (client.table("biens")
                   .select("url, stream_estate_id")
                   .range(offset, offset + PAGE - 1)
                   .execute())
            rows = res.data or []
            for r in rows:
                if r.get("url"):              urls.add(r["url"])
                if r.get("stream_estate_id"): se_ids.add(r["stream_estate_id"])
            if len(rows) < PAGE:
                break
            offset += PAGE
    except Exception as e:
        log.warning(f"Erreur chargement sets dédup: {e}")
    log.info(f"Dédup sets : {len(urls)} URLs biens, {len(se_ids)} SE IDs")
    return urls, se_ids



def insert_bien_with_urls(client, bien: dict, prop_doc: dict, advert: dict) -> str:
    """Insère le bien + toutes ses URLs dans biens_source_urls. Retourne 'inserted' ou 'duplicate'."""
    try:
        res = client.table("biens").insert(bien).execute()
        inserted = (res.data or [None])[0]
        if not inserted:
            return "duplicate"
        bien_id = inserted["id"]

        url_rows = []
        if advert.get("url"):
            url_rows.append({"bien_id": bien_id, "url": advert["url"]})
        for a in prop_doc.get("adverts", []):
            if a.get("url") and a["url"] != advert.get("url"):
                url_rows.append({"bien_id": bien_id, "url": a["url"]})
        if url_rows:
            client.table("biens_source_urls").upsert(
                url_rows, on_conflict="url", ignore_duplicates=True
            ).execute()
        return "inserted"
    except Exception as e:
        if "23505" in str(e):
            return "duplicate"
        log.error(f"Insert error: {e}")
        return "error"

# ══════════════════════════════════════════════════════════════════════════════
# Traitement d'un bien : dédup DB + Haiku + build_bien
# ══════════════════════════════════════════════════════════════════════════════

def process_property(
    prop_doc: dict,
    advert: dict,
    strat_key: str,
    strategie_mdb: str,
    metropole_map: dict,
    client,
    existing_urls: set,
    existing_se_ids: set,
    dry_run: bool,
) -> str:
    """Traite 1 bien : Haiku + build + insert. Retourne action.
    Dédup niveaux 1-2 (URL + SE ID) déjà fait en amont dans la boucle principale.
    """
    url  = advert.get("url")
    uuid = prop_doc.get("uuid")

    title = advert.get("title") or prop_doc.get("title") or ""
    desc  = advert.get("description") or prop_doc.get("description") or ""

    keywords = detect_keywords(title, desc, strat_key)
    is_valid = validate_with_haiku(title, desc, strategie_mdb)

    log.info(f"  [{strategie_mdb}] {'✅' if is_valid else '❌'} {title[:60]!r} ({', '.join(keywords) or '—'})")

    if dry_run:
        return "valide" if is_valid else "faux_positif"

    bien = build_bien(prop_doc, advert, strategie_mdb, metropole_map, keywords, is_valid)
    action = insert_bien_with_urls(client, bien, prop_doc, advert)

    # Mettre à jour le set en mémoire pour dédup intra-run
    if action == "inserted":
        if url:  existing_urls.add(url)
        if uuid: existing_se_ids.add(uuid)
        for a in prop_doc.get("adverts", []):
            if a.get("url"): existing_urls.add(a["url"])
        return "inserted_fp" if not is_valid else "inserted"

    return action

# ══════════════════════════════════════════════════════════════════════════════
# Ingestion principale — page par page, Haiku immédiat (miroir Next.js)
# ══════════════════════════════════════════════════════════════════════════════

def load_metropole_map(client) -> dict:
    m = {}
    try:
        res = client.table("ref_communes").select("code_postal, metropole") \
            .not_.is_("metropole", "null").execute()
        for r in (res.data or []):
            if r.get("metropole"):
                m[r["code_postal"]] = r["metropole"]
    except Exception as e:
        log.warning(f"Erreur chargement métropoles: {e}")
    return m


def run_ingestion(
    strategies: list,
    dry_run: bool,
    max_pages: int,
    from_date: str = None,
    to_date: str = None,
    limit_per_strat: int = None,
):
    client = get_client()
    if not client:
        log.error("Supabase non connecté")
        return

    metropole_map  = load_metropole_map(client)
    existing_urls, existing_se_ids = load_existing_sets(client)

    total_inserted = 0
    total_faux_pos = 0
    total_skipped  = 0
    total_fetched  = 0
    strat_stats: dict = {}

    for strat_key in strategies:
        strat        = STRATEGIES[strat_key]
        strategie_mdb = strat["strategie_mdb"]
        keywords     = strat["keywords"]
        exclusions   = strat["exclusions"]
        property_types = strat["property_types"]
        surface_min  = strat["surface_min"]

        strat_inserted  = 0
        strat_faux_pos  = 0
        strat_fetched   = 0   # items reçus de SE (= crédits consommés)
        skip_url        = 0   # niveau 1 : URL déjà en base
        skip_seid       = 0   # niveau 2 : SE ID déjà en base
        seen_uuids      = set()

        log.info(f"\n{'='*60}")
        log.info(f"Stratégie: {strategie_mdb} | {len(keywords)} keywords | surfaceMin={surface_min}")
        log.info(f"{'='*60}")

        for kw in keywords:
            if limit_per_strat and strat_fetched >= limit_per_strat:
                break

            page = 1
            while page <= max_pages:
                if limit_per_strat and strat_fetched >= limit_per_strat:
                    break

                try:
                    members = fetch_group(kw, exclusions, property_types, page,
                                          from_date, to_date, surface_min)
                except Exception as e:
                    log.error(f"  API erreur [{kw}] page {page}: {e}")
                    break

                if not members:
                    break

                strat_fetched += len(members)  # compte les crédits SE consommés

                # Filtrer UUIDs déjà vus intra-run + dédup mémoire niveaux 1-2
                new_props = []
                for prop_doc in members:
                    uuid = prop_doc.get("uuid")
                    adverts = prop_doc.get("adverts") or []
                    if not adverts or not uuid:
                        continue
                    if uuid in seen_uuids:
                        continue
                    advert = adverts[0]
                    url = advert.get("url")
                    if not url:
                        continue
                    # Niveau 1 : URL
                    if url in existing_urls:
                        skip_url += 1
                        continue
                    # Niveau 2 : SE ID
                    if uuid in existing_se_ids:
                        skip_seid += 1
                        continue
                    seen_uuids.add(uuid)
                    new_props.append((prop_doc, advert))

                log.info(f"  [{kw}] page {page} → {len(members)} SE, {len(new_props)} nouveaux")

                # Traitement Haiku en parallèle — CHUNK_SIZE=10, CONCURRENCY=8
                chunks = [new_props[i:i+CHUNK_SIZE] for i in range(0, len(new_props), CHUNK_SIZE)]

                for i in range(0, len(chunks), CONCURRENCY):
                    batch_chunks = chunks[i:i+CONCURRENCY]
                    flat = [(p, a) for chunk in batch_chunks for p, a in chunk]

                    with ThreadPoolExecutor(max_workers=len(flat)) as ex:
                        future_to_prop = {
                            ex.submit(
                                process_property,
                                p, a, strat_key, strategie_mdb,
                                metropole_map, client,
                                existing_urls, existing_se_ids, dry_run,
                            ): (p, a)
                            for p, a in flat
                        }
                        for future in as_completed(future_to_prop):
                            try:
                                action = future.result()
                            except Exception as e:
                                log.error(f"  process_property error: {e}")
                                action = "error"

                            if action == "inserted":
                                strat_inserted += 1
                                total_inserted += 1
                            elif action == "inserted_fp":
                                strat_inserted += 1
                                strat_faux_pos += 1
                                total_inserted += 1
                            elif action == "valide":  # dry_run
                                strat_inserted += 1
                            elif action == "faux_positif":  # dry_run
                                strat_faux_pos += 1

                if len(members) < 30:
                    break  # dernière page

                page += 1
                time.sleep(0.1)  # rate limiting SE

        strat_skipped = skip_url + skip_seid
        label = "seraient insérés" if dry_run else "insérés"
        log.info(f"  {strategie_mdb} : {strat_inserted} {label} dont {strat_faux_pos} FP, "
                 f"{strat_skipped} skippés (url={skip_url} seid={skip_seid}) "
                 f"| {strat_fetched} crédits SE")
        total_faux_pos += strat_faux_pos
        total_skipped  += strat_skipped
        total_fetched  += strat_fetched
        strat_stats[strat_key] = {'inserted': strat_inserted, 'fp': strat_faux_pos, 'credits': strat_fetched}

    log.info(f"\n{'='*60}")
    log.info(f"RÉSUMÉ FINAL {'(DRY RUN)' if dry_run else ''}")
    log.info(f"  Crédits SE consommés : {total_fetched}")
    log.info(f"  {'Seraient insérés' if dry_run else 'Insérés'} : {total_inserted}")
    log.info(f"  Faux pos             : {total_faux_pos}")
    log.info(f"  Skippés              : {total_skipped}")
    log.info(f"{'='*60}")

    if not dry_run:
        from datetime import datetime, timezone
        try:
            client.table('cron_config').upsert({
                'id': 'poll_se',
                'enabled': True,
                'schedule': '0 23 * * *',
                'last_run': datetime.now(timezone.utc).isoformat(),
                'last_result': {
                    'new': total_inserted,
                    'fp': total_faux_pos,
                    'credits': total_fetched,
                    'by_strategie': strat_stats,
                    'status': 'success',
                },
            }, on_conflict='id').execute()
            log.info("cron_config poll_se mis à jour")
        except Exception as e:
            log.warning(f"cron_config write failed: {e}")

# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Ingestion Stream Estate → Supabase (conforme Next.js)")
    parser.add_argument("--strategie", choices=list(STRATEGIES.keys()),
                        help="Une seule stratégie (défaut: toutes)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Simulation sans insertion en base")
    parser.add_argument("--max-pages", type=int, default=100,
                        help="Max pages SE par mot-clé (défaut: 100)")
    parser.add_argument("--from-date", help="Date début ISO (ex: 2026-04-10 ou 2026-04-10T20:30:00Z)")
    parser.add_argument("--to-date",   help="Date fin ISO (ex: 2026-04-17 ou 2026-04-17T20:30:00Z)")
    parser.add_argument("--limit",     type=int, default=None,
                        help="Max biens insérés par stratégie (ex: 50 pour test)")
    args = parser.parse_args()

    if not args.from_date:
        from datetime import datetime, timedelta, timezone
        args.from_date = (datetime.now(timezone.utc) - timedelta(hours=24)).strftime('%Y-%m-%dT%H:%M:%SZ')
        log.info(f'--from-date non fourni, défaut: dernières 24h ({args.from_date})')

    strategies = [args.strategie] if args.strategie else list(STRATEGIES.keys())
    run_ingestion(
        strategies,
        dry_run=args.dry_run,
        max_pages=args.max_pages,
        from_date=args.from_date,
        to_date=args.to_date,
        limit_per_strat=args.limit,
    )


if __name__ == "__main__":
    main()
