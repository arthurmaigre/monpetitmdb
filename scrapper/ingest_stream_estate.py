"""
ingest_stream_estate.py — Ingestion bulk via API Stream Estate (notif.immo)

Appelle /documents/properties avec expressions filtrées, stratégie par stratégie,
déduplique, filtre les faux positifs, et insère dans Supabase.

Usage :
  python3 ingest_stream_estate.py --dry-run                    # Voir sans insérer
  python3 ingest_stream_estate.py --strategie locataire        # Une seule stratégie
  python3 ingest_stream_estate.py --from-date 2026-03-25       # Depuis une date
  python3 ingest_stream_estate.py --max-pages 5                # Limiter les pages
"""
import os, sys, json, logging, argparse, re, time
from pathlib import Path
from datetime import datetime, timezone

import requests as http_requests
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from supabase_client import get_client

log = logging.getLogger("ingest_se")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

API_KEY = os.getenv("STREAM_ESTATE_API_KEY", "646dbf20852d6524745430b553e70802")
API_BASE = "https://api.notif.immo/documents/properties"

SE_PROPERTY_TYPE_MAP = {0: "Appartement", 1: "Maison", 2: "Immeuble", 3: "Parking", 4: "Bureau", 5: "Terrain", 6: "Local commercial"}

# ══════════════════════════════════════════════════════════════════════════════
# Stratégies et mots-clés (sans accents, testés et validés)
# ══════════════════════════════════════════════════════════════════════════════

STRATEGIES = {
    "locataire": {
        "strategie_mdb": "Locataire en place",
        "property_types": [0, 1, 2],
        "keywords": [
            "locataire en place",
            "vendu loue",
            "bail en cours",
            "loyer actuel",
            "location en cours",
        ],
    },
    "travaux": {
        "strategie_mdb": "Travaux lourds",
        "property_types": [0, 1, 2],
        "keywords": [
            "entierement a renover",
            "a renover entierement",
            "a renover integralement",
            "a rehabiliter",
            "inhabitable",
            "tout a refaire",
            "toiture a refaire",
            "a restaurer",
            "a rafraichir",
            "a remettre aux normes",
            "a remettre en etat",
            "plateau a amenager",
            "bien a renover",
            "maison a renover",
            "appartement a renover",
            "immeuble a renover",
        ],
    },
    "division": {
        "strategie_mdb": "Division",
        "property_types": [0, 1, 2],
        "keywords": [
            "division possible",
            "potentiel de division",
            "bien divisible",
            "maison divisible",
            "appartement divisible",
            "a diviser",
        ],
    },
    "idr": {
        "strategie_mdb": "Immeuble de rapport",
        "property_types": [1, 2],
        "keywords": [
            "immeuble de rapport",
            "copropriete a creer",
            "vente en bloc",
            "vendu en bloc",
            "immeuble locatif",
            "immeuble entierement loue",
        ],
    },
}

# ══════════════════════════════════════════════════════════════════════════════
# Filtres d'exclusion — faux positifs Locataire en place
# ══════════════════════════════════════════════════════════════════════════════

EXCLUDE_LOCATAIRE = re.compile(
    r"bail commercial|local commercial|murs commerci|fonds de commerce"
    r"|r.sidence.{0,15}tourisme|r.sidence.{0,15}touristi|pierre.{0,3}vacances"
    r"|r.sidence.{0,15}senior|ehpad|maison de retraite"
    r"|r.sidence.{0,15}[eé]tudiante|r.sidence.{0,15}h[oô]teli[eè]re"
    r"|r.sidence.{0,15}service|r.sidence.{0,15}g[eé]r[eé]e"
    r"|lmnp|meubl[eé] non professionnel",
    re.IGNORECASE,
)

# ══════════════════════════════════════════════════════════════════════════════
# Appel API Stream Estate
# ══════════════════════════════════════════════════════════════════════════════

def fetch_properties(keyword: str, property_types: list, page: int = 1, from_date: str = None, to_date: str = None) -> dict:
    """Appelle /documents/properties avec un mot-clé et des filtres."""
    params = {
        "limit": 10,
        "page": page,
        "transactionType": 0,
        "expressions[0][0][word]": keyword,
        "expressions[0][0][options][includes]": "true",
        "expressions[0][0][options][strict]": "true",
    }
    for i, pt in enumerate(property_types):
        params[f"propertyTypes[{i}]"] = pt
    if from_date:
        params["fromDate"] = from_date
    if to_date:
        params["toDate"] = to_date

    headers = {"X-Api-Key": API_KEY}
    r = http_requests.get(API_BASE, headers=headers, params=params, timeout=30)
    r.raise_for_status()
    return r.json()


# ══════════════════════════════════════════════════════════════════════════════
# Construction payload Supabase (même format que webhook)
# ══════════════════════════════════════════════════════════════════════════════

def build_bien(property_doc: dict, advert: dict, strategie: str, metropole_map: dict) -> dict:
    """Construit un dict bien pour insert Supabase — même logique que route.ts."""
    surface = property_doc.get("surface") or advert.get("surface")
    prix = advert.get("price")
    code_postal = (property_doc.get("city") or {}).get("zipcode")
    ptype = property_doc.get("propertyType")
    room = property_doc.get("room") or advert.get("room")
    floor = advert.get("floor")

    bien = {
        "url": advert.get("url"),
        "strategie_mdb": strategie,
        "statut": "Toujours disponible",
        "type_bien": SE_PROPERTY_TYPE_MAP.get(ptype),
        "prix_fai": prix,
        "surface": surface,
        "prix_m2": round(prix / surface * 100) / 100 if prix and surface else None,
        "nb_pieces": f"T{room}" if room else None,
        "nb_chambres": property_doc.get("bedroom") or advert.get("bedroom"),
        "etage": ("RDC" if floor == 0 else str(floor)) if floor is not None else None,
        "annee_construction": advert.get("constructionYear") or property_doc.get("constructionYear"),
        "dpe": (advert.get("energy") or {}).get("category"),
        "dpe_valeur": (advert.get("energy") or {}).get("value"),
        "ges": (advert.get("greenHouseGas") or {}).get("category"),
        "ville": (property_doc.get("city") or {}).get("name"),
        "code_postal": code_postal,
        "metropole": metropole_map.get(code_postal) if code_postal else None,
        "photo_url": (advert.get("pictures") or [None])[0] or (property_doc.get("pictures") or [None])[0],
        "latitude": (property_doc.get("location") or {}).get("lat"),
        "longitude": (property_doc.get("location") or {}).get("lon"),
        "surface_terrain": advert.get("landSurface") or property_doc.get("landSurface"),
        "stream_estate_id": property_doc.get("uuid"),
        "source_provider": "stream_estate",
        "publisher_type": "professionnel" if (advert.get("publisher") or {}).get("type") == 1 else ("particulier" if (advert.get("publisher") or {}).get("type") == 0 else None),
        "price_history": advert.get("events") if advert.get("events") else None,
        "moteurimmo_data": {
            "uniqueId": property_doc.get("uuid"),
            "origin": (advert.get("publisher") or {}).get("name"),
            "title": advert.get("title") or property_doc.get("title"),
            "description": advert.get("description") or property_doc.get("description"),
            "pictureUrls": advert.get("pictures") or property_doc.get("pictures") or [],
            "publisher": {"name": (advert.get("contact") or {}).get("name")},
            "duplicates": [
                {"url": a.get("url"), "origin": (a.get("publisher") or {}).get("name")}
                for a in property_doc.get("adverts", [])
                if a.get("url") != advert.get("url")
            ],
            "category": SE_PROPERTY_TYPE_MAP.get(ptype),
            "creationDate": advert.get("createdAt"),
            "source": "stream_estate",
            "priceHistory": advert.get("events"),
            "stations": property_doc.get("stations"),
            "features": advert.get("features"),
            "departement": ((property_doc.get("city") or {}).get("department") or {}).get("code"),
            "floorQuantity": advert.get("floorQuantity"),
            "furnished": advert.get("furnished"),
        },
    }

    # Charges copro (SE = annuel → /12)
    if advert.get("condominiumFees"):
        bien["charges_copro"] = round(advert["condominiumFees"] / 12)
    # Taxe foncière
    if advert.get("propertyTax"):
        bien["taxe_fonc_ann"] = advert["propertyTax"]
    # Ascenseur
    if advert.get("elevator") is True or property_doc.get("elevator") is True:
        bien["ascenseur"] = True
    elif advert.get("elevator") is False or property_doc.get("elevator") is False:
        bien["ascenseur"] = False

    return bien


# ══════════════════════════════════════════════════════════════════════════════
# Déduplication
# ══════════════════════════════════════════════════════════════════════════════

def load_existing_urls(client) -> set:
    """Charge les URLs depuis biens_source_urls pour dédup rapide."""
    urls = set()
    try:
        # URLs principales
        res = client.table("biens").select("url").eq("source_provider", "stream_estate").execute()
        for r in (res.data or []):
            if r.get("url"):
                urls.add(r["url"])
    except Exception as e:
        log.warning(f"Erreur chargement URLs existantes: {e}")
    log.info(f"URLs existantes chargées: {len(urls)}")
    return urls


def load_existing_se_ids(client) -> set:
    """Charge les stream_estate_id existants."""
    ids = set()
    try:
        res = client.table("biens").select("stream_estate_id").not_.is_("stream_estate_id", "null").execute()
        for r in (res.data or []):
            if r.get("stream_estate_id"):
                ids.add(r["stream_estate_id"])
    except Exception as e:
        log.warning(f"Erreur chargement SE IDs: {e}")
    log.info(f"SE IDs existants chargés: {len(ids)}")
    return ids


def load_metropole_map(client) -> dict:
    """Charge le mapping code_postal → métropole."""
    m = {}
    try:
        res = client.table("ref_communes").select("code_postal, metropole").not_.is_("metropole", "null").execute()
        for r in (res.data or []):
            if r.get("metropole"):
                m[r["code_postal"]] = r["metropole"]
    except Exception as e:
        log.warning(f"Erreur chargement métropoles: {e}")
    return m


# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════

def run_ingestion(strategies: list, dry_run: bool, max_pages: int, from_date: str = None, to_date: str = None):
    client = get_client()
    if not client:
        log.error("Supabase non connecté")
        return

    metropole_map = load_metropole_map(client)
    existing_urls = load_existing_urls(client)
    existing_se_ids = load_existing_se_ids(client)

    # Collecter tous les biens par stratégie, dédupliquer par UUID
    seen_uuids = set()
    total_fetched = 0
    total_new = 0
    total_excluded = 0
    total_duplicate = 0
    total_inserted = 0

    for strat_key in strategies:
        strat = STRATEGIES[strat_key]
        strategie_mdb = strat["strategie_mdb"]
        property_types = strat["property_types"]
        keywords = strat["keywords"]

        log.info(f"\n{'='*60}")
        log.info(f"Stratégie: {strategie_mdb} ({len(keywords)} mots-clés)")
        log.info(f"{'='*60}")

        strat_new = 0
        strat_dup = 0
        strat_excl = 0
        biens_to_insert = []

        for kw in keywords:
            kw_count = 0
            for page in range(1, max_pages + 1):
                try:
                    data = fetch_properties(kw, property_types, page, from_date, to_date)
                except Exception as e:
                    log.error(f"  API erreur [{kw}] page {page}: {e}")
                    break

                members = data.get("hydra:member", [])
                if not members:
                    break

                total_api = data.get("hydra:totalItems", "?")

                for prop_doc in members:
                    total_fetched += 1
                    uuid = prop_doc.get("uuid")
                    adverts = prop_doc.get("adverts", [])
                    if not adverts:
                        continue
                    advert = adverts[0]
                    url = advert.get("url")

                    # Dédup intra-run (même bien matché par plusieurs mots-clés)
                    if uuid in seen_uuids:
                        continue
                    seen_uuids.add(uuid)

                    # Dédup vs base existante
                    if url and url in existing_urls:
                        strat_dup += 1
                        total_duplicate += 1
                        continue
                    if uuid and uuid in existing_se_ids:
                        strat_dup += 1
                        total_duplicate += 1
                        continue

                    # Vérifier aussi les URLs des autres adverts
                    dup_found = False
                    for a in adverts:
                        if a.get("url") and a["url"] in existing_urls:
                            dup_found = True
                            break
                    if dup_found:
                        strat_dup += 1
                        total_duplicate += 1
                        continue

                    # Filtre faux positifs Locataire en place
                    if strat_key == "locataire":
                        all_text = " ".join(
                            (a.get("title") or "") + " " + (a.get("description") or "")
                            for a in adverts
                        )
                        if EXCLUDE_LOCATAIRE.search(all_text):
                            strat_excl += 1
                            total_excluded += 1
                            continue

                    bien = build_bien(prop_doc, advert, strategie_mdb, metropole_map)
                    biens_to_insert.append(bien)
                    strat_new += 1
                    total_new += 1
                    kw_count += 1

                # Pagination : si moins de 10 résultats, c'est la dernière page
                if len(members) < 10:
                    break

                time.sleep(0.2)  # Rate limiting

            if kw_count > 0:
                log.info(f"  \"{kw}\" → {kw_count} nouveaux")

        log.info(f"  {strategie_mdb}: {strat_new} nouveaux, {strat_dup} doublons, {strat_excl} exclus")

        # Insertion batch
        if biens_to_insert and not dry_run:
            batch_size = 50
            for i in range(0, len(biens_to_insert), batch_size):
                batch = biens_to_insert[i:i + batch_size]
                try:
                    result = client.table("biens").insert(batch).execute()
                    inserted_ids = [r["id"] for r in (result.data or [])]
                    total_inserted += len(inserted_ids)

                    # Ajouter les URLs dans biens_source_urls
                    url_rows = []
                    for bien, inserted_id in zip(batch, inserted_ids):
                        if bien.get("url"):
                            url_rows.append({"bien_id": inserted_id, "url": bien["url"]})
                        # URLs des duplicates
                        for dup in (bien.get("moteurimmo_data") or {}).get("duplicates", []):
                            if dup.get("url"):
                                url_rows.append({"bien_id": inserted_id, "url": dup["url"]})
                    if url_rows:
                        client.table("biens_source_urls").upsert(
                            url_rows, on_conflict="url", ignore_duplicates=True
                        ).execute()

                    log.info(f"  Inséré batch {i//batch_size + 1}: {len(inserted_ids)} biens")
                except Exception as e:
                    log.error(f"  Erreur insertion batch: {e}")
        elif biens_to_insert and dry_run:
            log.info(f"  DRY RUN — {len(biens_to_insert)} biens auraient été insérés")
            for b in biens_to_insert[:3]:
                log.info(f"    → {b.get('type_bien')} {b.get('ville')} {b.get('prix_fai')}€ {b.get('surface')}m2")

    log.info(f"\n{'='*60}")
    log.info(f"RÉSUMÉ")
    log.info(f"  Biens fetchés API:  {total_fetched}")
    log.info(f"  Doublons existants: {total_duplicate}")
    log.info(f"  Exclus (FP):        {total_excluded}")
    log.info(f"  Nouveaux:           {total_new}")
    log.info(f"  Insérés en base:    {total_inserted}")
    log.info(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(description="Ingestion Stream Estate → Supabase")
    parser.add_argument("--strategie", choices=list(STRATEGIES.keys()), help="Une seule stratégie")
    parser.add_argument("--dry-run", action="store_true", help="Voir sans insérer")
    parser.add_argument("--max-pages", type=int, default=100, help="Max pages par mot-clé (défaut: 100)")
    parser.add_argument("--from-date", help="Date début (YYYY-MM-DD)")
    parser.add_argument("--to-date", help="Date fin (YYYY-MM-DD)")
    args = parser.parse_args()

    strategies = [args.strategie] if args.strategie else list(STRATEGIES.keys())
    run_ingestion(strategies, args.dry_run, args.max_pages, args.from_date, args.to_date)


if __name__ == "__main__":
    main()
