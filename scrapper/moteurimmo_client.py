"""
moteurimmo_client.py — Module d'integration Moteur Immo pour MDB
Sourcing d'annonces via l'API Moteur Immo (aggregateur multi-plateformes)
Activable/desactivable via MOTEURIMMO_API_KEY dans .env
"""

import os, json, logging, time, datetime, urllib.request, urllib.parse
from pathlib import Path

log = logging.getLogger(__name__)

API_BASE = "https://moteurimmo.fr/api"
API_KEY = os.getenv("MOTEURIMMO_API_KEY", "")

# ══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION STRATEGIES
# ══════════════════════════════════════════════════════════════════════════════

STRATEGIES = {
    "Locataire en place": {
        "keywords": [
            "locataire en place",
            "vendu loué",
            "bail en cours",
        ],
        "keywordsOperator": "or",
        "categories": ["house", "flat", "block"],
        "options": [],
    },
    "Travaux lourds": {
        "keywords": [
            "à rénover",
            "rénovation complète",
            "gros travaux",
            "tout à refaire",
            "entièrement à rénover",
            "à réhabiliter",
            "travaux importants",
            "vendu en l'état",
            "toiture à refaire",
            "mise aux normes",
            "inhabitable",
            "rénovation totale",
        ],
        "keywordsOperator": "or",
        "categories": ["house", "flat", "block"],
        "options": ["hasWorksRequired"],
    },
    "Division": {
        "keywords": [
            "divisible",
            "possibilité de division",
            "division possible",
            "diviser en",
            "créer des lots",
            "créer plusieurs logements",
        ],
        "keywordsOperator": "or",
        "categories": ["house", "flat", "block", "misc"],
        "options": [],
    },
    "Immeuble de rapport": {
        "keywords": [
            "immeuble de rapport",
            "monopropriété",
            "copropriété à créer",
            "vente en bloc",
            "vendu en bloc",
            "plusieurs appartements",
        ],
        "keywordsOperator": "or",
        "categories": ["block", "house"],
        "options": [],
    },
}

# ══════════════════════════════════════════════════════════════════════════════
# API HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _post(endpoint: str, body: dict, timeout: int = 60) -> dict:
    """POST JSON vers l'API Moteur Immo."""
    body["apiKey"] = API_KEY
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{API_BASE}/{endpoint}",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read())


def search_ads(strategie: str, page: int = 1, max_length: int = 100,
               creation_date_after: str = None, creation_date_before: str = None) -> dict:
    """Recherche d'annonces pour une strategie donnee."""
    config = STRATEGIES.get(strategie)
    if not config:
        raise ValueError(f"Strategie inconnue: {strategie}")

    body = {
        "types": ["sale"],
        "categories": config.get("categories", ["house", "flat", "block"]),
        "keywords": config["keywords"],
        "keywordsOperator": config["keywordsOperator"],
        "page": page,
        "maxLength": max_length,
        "sortBy": "creationDate-desc",
    }
    if config["options"]:
        body["options"] = config["options"]
    if creation_date_after:
        body["creationDateAfter"] = creation_date_after
    if creation_date_before:
        body["creationDateBefore"] = creation_date_before

    return _post("ads", body)


def get_ad(unique_id: str) -> dict:
    """Recupere une annonce par son ID unique."""
    url = f"{API_BASE}/ad/{unique_id}?apiKey={urllib.parse.quote(API_KEY)}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def search_deleted_ads(creation_date_after: str = None) -> dict:
    """Recherche d'annonces retirees."""
    body = {"types": ["sale"], "categories": ["house", "flat", "block"]}
    if creation_date_after:
        body["creationDateAfter"] = creation_date_after
    return _post("deletedAds", body)


# ══════════════════════════════════════════════════════════════════════════════
# MAPPING MOTEUR IMMO -> TABLE BIENS
# ══════════════════════════════════════════════════════════════════════════════

def _map_type_bien(category: str) -> str:
    mapping = {
        "house": "Maison",
        "flat": "Appartement",
        "block": "Immeuble",
        "land": "Terrain",
        "parking/garage/box": "Parking",
        "office": "Bureau",
        "premises": "Local",
        "shop": "Commerce",
        "misc": "Autre",
    }
    return mapping.get(category, "Autre")


def _map_nb_pieces(rooms) -> str | None:
    if rooms is None:
        return None
    return f"T{rooms}"


def _map_etage(floor) -> str | None:
    if floor is None:
        return None
    if floor == 0:
        return "RDC"
    return str(floor)


def _map_options(options: list) -> dict:
    """Extrait les booleens et types depuis les options Moteur Immo."""
    opts = set(options or [])
    result = {}

    # Ascenseur
    if "hasLift" in opts:
        result["ascenseur"] = True
    elif "hasNoLift" in opts:
        result["ascenseur"] = False

    # Cave
    if "hasCave" in opts:
        result["has_cave"] = True

    # Piscine
    if "hasSwimmingPool" in opts:
        result["has_piscine"] = True

    # Parking
    if "hasGarage" in opts:
        result["parking_type"] = "box_ferme"
    elif "hasParking" in opts:
        result["parking_type"] = "parking_ouvert"
    elif "hasGarageOrParking" in opts:
        result["parking_type"] = "parking_ouvert"

    # Exterieur
    if "hasTerrace" in opts:
        result["acces_exterieur"] = "Terrasse"
    elif "hasBalcony" in opts:
        result["acces_exterieur"] = "Balcon"
    elif "hasTerraceOrBalcony" in opts:
        result["acces_exterieur"] = "Balcon"
    elif "hasGarden" in opts:
        result["acces_exterieur"] = "Jardin"

    # Double vitrage
    if "hasOpticFiber" in opts:
        result["has_double_vitrage"] = True

    # Plain pied
    if "isGroundFloor" in opts:
        result["is_plain_pied"] = True

    # Cuisine equipee
    # Pas d'option directe dans Moteur Immo

    return result


def _detect_metropole(city: str, postal_code: str) -> str | None:
    """Detecte la metropole via ref_communes en base. Fallback None."""
    if not postal_code:
        return None
    try:
        from supabase_client import get_client
        client = get_client()
        if not client:
            return None
        r = client.table("ref_communes").select("metropole").eq("code_postal", postal_code).not_.is_("metropole", "null").limit(1).execute()
        if r.data and r.data[0].get("metropole"):
            return r.data[0]["metropole"]
    except:
        pass
    return None


def ad_to_bien(ad: dict, strategie: str) -> dict:
    """Convertit une annonce Moteur Immo en dict compatible table biens."""
    loc = ad.get("location") or {}
    pos = ad.get("position") or []
    stats = ad.get("priceStats") or {}
    opts = ad.get("options") or []

    prix_fai = ad.get("price")
    surface = ad.get("surface")
    loyer = ad.get("rent") or stats.get("rent")

    bien = {
        "url": ad.get("url"),
        "statut": "Toujours disponible",
        "strategie_mdb": strategie,
        "type_bien": _map_type_bien(ad.get("category", "")),
        "nb_pieces": _map_nb_pieces(ad.get("rooms")),
        "nb_chambres": ad.get("bedrooms"),
        "surface": surface,
        "etage": _map_etage(ad.get("floor")),
        "annee_construction": ad.get("constructionYear"),
        "dpe": ad.get("energyGrade"),
        "dpe_valeur": ad.get("energyValue"),
        "ges": ad.get("gasGrade"),
        "prix_fai": prix_fai,
        "prix_m2": ad.get("pricePerSquareMeter"),
        "loyer": loyer,
        "type_loyer": "HC" if loyer else None,
        "charges_copro": ad.get("propertyCharges"),
        "taxe_fonc_ann": ad.get("propertyTax"),
        "ville": loc.get("city"),
        "code_postal": loc.get("postalCode"),
        "quartier": loc.get("district"),
        "metropole": _detect_metropole(loc.get("city", ""), loc.get("postalCode", "")),
        "photo_url": (ad.get("pictureUrls") or [None])[0],
        "surface_terrain": ad.get("landSurface"),
    }

    # Coordonnees GPS
    if len(pos) == 2:
        bien["longitude"] = pos[0]
        bien["latitude"] = pos[1]

    # Options -> champs booleens
    bien.update(_map_options(opts))

    # Rendement brut
    if prix_fai and loyer and prix_fai > 0:
        bien["rendement_brut"] = round(loyer * 12 / prix_fai, 4)
    elif stats.get("profitability"):
        bien["rendement_brut"] = stats["profitability"]

    # Supprimer les None pour ne pas ecraser les valeurs existantes
    bien = {k: v for k, v in bien.items() if v is not None}

    return bien


# ══════════════════════════════════════════════════════════════════════════════
# INGESTION PRINCIPALE
# ══════════════════════════════════════════════════════════════════════════════

def ingest_strategy(strategie: str, max_pages: int = 100,
                    creation_date_after: str = None,
                    dry_run: bool = False) -> dict:
    """
    Ingere toutes les annonces d'une strategie dans Supabase.
    Retourne un dict avec les stats d'ingestion.
    """
    from supabase_client import get_client, get_existing_urls, upload_photo

    client = get_client()
    if not client:
        log.error("Supabase non connecte")
        return {"error": "Supabase non connecte"}

    existing_urls = get_existing_urls()
    log.info(f"URLs existantes en base : {len(existing_urls)}")

    stats = {"total_api": 0, "new": 0, "updated": 0, "skipped": 0, "errors": 0, "pages": 0}

    for page in range(1, max_pages + 1):
        log.info(f"\n{'='*60}")
        log.info(f"[{strategie}] Page {page}")

        try:
            result = search_ads(
                strategie, page=page, max_length=100,
                creation_date_after=creation_date_after
            )
        except Exception as e:
            log.error(f"Erreur API page {page}: {e}")
            stats["errors"] += 1
            break

        ads = result.get("ads", [])
        if not ads:
            log.info("Plus d'annonces, fin de la pagination")
            break

        stats["pages"] = page
        stats["total_api"] += len(ads)

        for ad in ads:
            url = ad.get("url")
            if not url:
                stats["skipped"] += 1
                continue

            bien = ad_to_bien(ad, strategie)
            is_new = url not in existing_urls

            if dry_run:
                action = "NEW" if is_new else "UPDATE"
                log.info(f"  [DRY-RUN] {action} {bien.get('type_bien')} {bien.get('nb_pieces')} - {bien.get('ville')} - {bien.get('prix_fai')} EUR")
                stats["new" if is_new else "updated"] += 1
                continue

            try:
                # Stocker le JSON brut Moteur Immo
                moteurimmo_data = {
                    "uniqueId": ad.get("uniqueId"),
                    "origin": ad.get("origin"),
                    "adId": ad.get("adId"),
                    "title": ad.get("title"),
                    "description": ad.get("description"),
                    "publisher": ad.get("publisher"),
                    "pictureUrls": ad.get("pictureUrls", []),
                    "options": ad.get("options", []),
                    "duplicates": ad.get("duplicates", []),
                    "priceStats": ad.get("priceStats"),
                    "originalPrice": ad.get("originalPrice"),
                    "priceDrop": ad.get("priceDrop"),
                    "creationDate": ad.get("creationDate"),
                    "lastPriceChangeDate": ad.get("lastPriceChangeDate"),
                    "lastPublicationDate": ad.get("lastPublicationDate"),
                    "deletionDate": ad.get("deletionDate"),
                }

                if is_new:
                    row = {**bien, "moteurimmo_data": json.dumps(moteurimmo_data, ensure_ascii=False)}
                    try:
                        client.table("biens").insert(row).execute()
                    except Exception as insert_err:
                        if "23505" in str(insert_err):
                            # URL deja existante, passer en update
                            is_new = False
                        else:
                            raise insert_err

                if is_new:
                    existing_urls.add(url)
                    stats["new"] += 1
                    log.info(f"  + NEW {bien.get('type_bien')} {bien.get('nb_pieces')} - {bien.get('ville')} ({bien.get('code_postal')}) - {bien.get('prix_fai')} EUR")

                    # Upload cover photo desactive pour accelerer l'aspiration initiale
                    # Les photos s'affichent via photo_url (URL externe)
                    # Batch upload dans le bucket Supabase a faire apres

                else:
                    # Update sans ecraser les champs enrichis manuellement
                    update_fields = {
                        "prix_fai": bien.get("prix_fai"),
                        "statut": "Toujours disponible",
                        "moteurimmo_data": json.dumps(moteurimmo_data, ensure_ascii=False),
                    }
                    update_fields = {k: v for k, v in update_fields.items() if v is not None}
                    client.table("biens").update(update_fields).eq("url", url).execute()
                    stats["updated"] += 1

            except Exception as e:
                log.warning(f"  Erreur upsert {url}: {e}")
                stats["errors"] += 1

        # Pause entre pages (respect rate limit 300/min)
        time.sleep(1)

    return stats


def ingest_strategy_by_date(strategie: str, start_date: str = "2023-01-01",
                           end_date: str = None, dry_run: bool = False) -> dict:
    """
    Ingere les annonces par tranches de mois (evite les timeouts sur pages profondes).
    Pagination par creationDateAfter/creationDateBefore au lieu de page number.
    """
    from supabase_client import get_client, get_existing_urls, upload_photo

    client = get_client()
    if not client:
        log.error("Supabase non connecte")
        return {"error": "Supabase non connecte"}

    existing_urls = get_existing_urls()
    log.info(f"URLs existantes en base : {len(existing_urls)}")

    stats = {"total_api": 0, "new": 0, "updated": 0, "skipped": 0, "errors": 0, "batches": 0}

    # Generer des tranches de 1 mois de start_date a end_date (ou maintenant)
    from datetime import datetime as dt, timedelta
    current = dt.fromisoformat(start_date.replace("Z", ""))
    end = dt.fromisoformat(end_date.replace("Z", "")) if end_date else dt.utcnow()

    while current < end:
        next_month = current + timedelta(days=30)
        if next_month > end:
            next_month = end

        date_after = current.strftime("%Y-%m-%dT00:00:00.000Z")
        date_before = next_month.strftime("%Y-%m-%dT23:59:59.999Z")

        log.info(f"\n{'#'*60}")
        log.info(f"[{strategie}] Tranche {date_after[:10]} -> {date_before[:10]}")

        page = 1
        while page <= 100:
            try:
                result = search_ads(
                    strategie, page=page, max_length=100,
                    creation_date_after=date_after,
                    creation_date_before=date_before,
                )
            except Exception as e:
                log.error(f"Erreur API: {e}")
                stats["errors"] += 1
                break

            ads = result.get("ads", [])
            if not ads:
                break

            stats["total_api"] += len(ads)
            stats["batches"] += 1

            for ad in ads:
                url = ad.get("url")
                if not url:
                    stats["skipped"] += 1
                    continue

                bien = ad_to_bien(ad, strategie)
                is_new = url not in existing_urls

                if dry_run:
                    stats["new" if is_new else "updated"] += 1
                    continue

                try:
                    moteurimmo_data = {
                        "uniqueId": ad.get("uniqueId"),
                        "origin": ad.get("origin"),
                        "adId": ad.get("adId"),
                        "title": ad.get("title"),
                        "description": ad.get("description"),
                        "publisher": ad.get("publisher"),
                        "pictureUrls": ad.get("pictureUrls", []),
                        "options": ad.get("options", []),
                        "duplicates": ad.get("duplicates", []),
                        "priceStats": ad.get("priceStats"),
                        "originalPrice": ad.get("originalPrice"),
                        "priceDrop": ad.get("priceDrop"),
                        "creationDate": ad.get("creationDate"),
                        "lastPriceChangeDate": ad.get("lastPriceChangeDate"),
                        "lastPublicationDate": ad.get("lastPublicationDate"),
                        "deletionDate": ad.get("deletionDate"),
                    }

                    if is_new:
                        row = {**bien, "moteurimmo_data": json.dumps(moteurimmo_data, ensure_ascii=False)}
                        try:
                            client.table("biens").insert(row).execute()
                        except Exception as insert_err:
                            if "23505" in str(insert_err):
                                is_new = False
                            else:
                                raise insert_err

                    if is_new:
                        existing_urls.add(url)
                        stats["new"] += 1
                        log.info(f"  + NEW {bien.get('type_bien')} {bien.get('nb_pieces')} - {bien.get('ville')} ({bien.get('code_postal')}) - {bien.get('prix_fai')} EUR")

                        photo_url = bien.get("photo_url")
                        if photo_url:
                            r = client.table("biens").select("id").eq("url", url).limit(1).execute()
                            if r.data and len(r.data) > 0:
                                bien_id = r.data[0]["id"]
                                storage_path = upload_photo(bien_id, photo_url)
                                if storage_path:
                                    client.table("biens").update({"photo_storage_path": storage_path}).eq("id", bien_id).execute()
                    else:
                        update_fields = {
                            "prix_fai": bien.get("prix_fai"),
                            "statut": "Toujours disponible",
                            "moteurimmo_data": json.dumps(moteurimmo_data, ensure_ascii=False),
                        }
                        update_fields = {k: v for k, v in update_fields.items() if v is not None}
                        client.table("biens").update(update_fields).eq("url", url).execute()
                        stats["updated"] += 1

                except Exception as e:
                    log.warning(f"  Erreur upsert {url}: {e}")
                    stats["errors"] += 1

            page += 1
            time.sleep(0.5)

        current = next_month
        time.sleep(1)

    return stats


def ingest_all(creation_date_after: str = None, dry_run: bool = False) -> dict:
    """Ingere toutes les strategies."""
    all_stats = {}
    for strategie in STRATEGIES:
        log.info(f"\n{'#'*60}")
        log.info(f"# STRATEGIE : {strategie}")
        log.info(f"{'#'*60}")
        all_stats[strategie] = ingest_strategy(
            strategie,
            creation_date_after=creation_date_after,
            dry_run=dry_run
        )
    return all_stats


# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import argparse
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env", override=True)

    # Recharger la cle API apres dotenv
    import moteurimmo_client
    moteurimmo_client.API_KEY = os.getenv("MOTEURIMMO_API_KEY", "")
    API_KEY = moteurimmo_client.API_KEY

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="Moteur Immo -> Supabase ingestion")
    parser.add_argument("--dry-run", action="store_true", help="Simuler sans ecrire en base")
    parser.add_argument("--since", type=str, default="2023-01-01", help="Date ISO de debut (ex: 2023-01-01)")
    parser.add_argument("--until", type=str, default=None, help="Date ISO de fin (ex: 2025-01-01). Defaut: maintenant")
    parser.add_argument("--strategie", type=str, choices=list(STRATEGIES.keys()), help="Une seule strategie")
    parser.add_argument("--max-pages", type=int, default=100, help="Nombre max de pages par strategie (mode page)")
    parser.add_argument("--by-date", action="store_true", help="Paginer par tranches de mois (recommande pour gros volumes)")
    args = parser.parse_args()

    if not API_KEY:
        log.error("MOTEURIMMO_API_KEY non definie dans .env")
        exit(1)

    log.info(f"Moteur Immo API Key: {API_KEY[:10]}...")
    log.info(f"Dry run: {args.dry_run}")
    log.info(f"Since: {args.since}")
    log.info(f"Mode: {'pagination par date' if args.by_date else 'pagination par page'}")

    if args.strategie:
        if args.by_date:
            stats = ingest_strategy_by_date(
                args.strategie,
                start_date=args.since,
                end_date=args.until,
                dry_run=args.dry_run,
            )
        else:
            stats = ingest_strategy(
                args.strategie,
                max_pages=args.max_pages,
                creation_date_after=args.since,
                dry_run=args.dry_run,
            )
        log.info(f"\nResultats {args.strategie}: {json.dumps(stats, indent=2)}")
    else:
        all_stats = {}
        for strategie in STRATEGIES:
            log.info(f"\n{'#'*60}")
            log.info(f"# STRATEGIE : {strategie}")
            log.info(f"{'#'*60}")
            if args.by_date:
                all_stats[strategie] = ingest_strategy_by_date(strategie, start_date=args.since, end_date=args.until, dry_run=args.dry_run)
            else:
                all_stats[strategie] = ingest_strategy(strategie, max_pages=args.max_pages, creation_date_after=args.since, dry_run=args.dry_run)
        for strat, s in all_stats.items():
            log.info(f"\n{strat}: {json.dumps(s, indent=2)}")
