"""
sync_expired_se.py — Mise à jour statut expiration depuis Stream Estate

Pour chaque stratégie, interroge SE avec isExpired=true + fromDate (création)
+ fenêtre fromExpiredAt/toExpiredAt, puis cross-référence avec notre DB
par stream_estate_id et marque les biens trouvés comme expirés.

Pas de Haiku — pas d'insertion. Uniquement UPDATE statut + expired_at.

Usage :
  # Dry run — vérification sans toucher la DB
  python3 sync_expired_se.py --dry-run --limit 50

  # Test réel limité
  python3 sync_expired_se.py --limit 50

  # Backfill depuis début ingest
  python3 sync_expired_se.py --from-expired-at 2026-04-10

  # Cron quotidien (hier)
  python3 sync_expired_se.py --from-expired-at 2026-04-27 --to-expired-at 2026-04-27

  # Une seule stratégie
  python3 sync_expired_se.py --strategie locataire --limit 50 --dry-run
"""
import os, sys, logging, argparse, time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests as http_requests
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from supabase_client import get_client

log = logging.getLogger("sync_expired_se")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

API_KEY  = os.getenv("STREAM_ESTATE_API_KEY", "646dbf20852d6524745430b553e70802")
API_BASE = "https://api.stream.estate/documents/properties"

# Date de création SE à partir de laquelle on cherche les expirés
# (couvre notre stock depuis le backfill janvier 2026)
FROM_DATE_DEFAULT = "2026-01-01T00:00:00Z"

# ══════════════════════════════════════════════════════════════════════════════
# Stratégies — identiques à ingest_stream_estate.py
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
# Appel API Stream Estate — isExpired=true + fromDate + fenêtre expiration
# ══════════════════════════════════════════════════════════════════════════════

def fetch_expired_group(
    keyword: str,
    exclusions: list,
    property_types: list,
    page: int,
    from_date: str,
    from_expired_at: str = None,
    to_expired_at: str = None,
    surface_min: int = None,
) -> tuple[list, int]:
    """Retourne (membres, total_items) pour 1 groupe d'expressions, properties expirées."""
    params = {
        "itemsPerPage": 30,
        "page": page,
        "transactionType": 0,
        "isExpired": "true",
        "fromDate": from_date if 'T' in from_date else from_date + 'T00:00:00Z',
        "lat": 46.6,
        "lon": 2.2,
        "radius": 600,
        "withCoherentPrice": "true",
        "order[expiredAt]": "asc",
    }
    if from_expired_at:
        params["fromExpiredAt"] = from_expired_at if 'T' in from_expired_at else from_expired_at + 'T00:00:00Z'
    if to_expired_at:
        params["toExpiredAt"] = to_expired_at if 'T' in to_expired_at else to_expired_at + 'T23:59:59Z'

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

    headers = {"X-Api-Key": API_KEY}
    r = http_requests.get(API_BASE, headers=headers, params=params, timeout=30)
    r.raise_for_status()
    data = r.json()
    return data.get("hydra:member", []), data.get("hydra:totalItems", 0)

# ══════════════════════════════════════════════════════════════════════════════
# Sync principal
# ══════════════════════════════════════════════════════════════════════════════

def run_sync(
    strategies: list,
    dry_run: bool,
    from_date: str,
    from_expired_at: str = None,
    to_expired_at: str = None,
    limit_total: int = None,
):
    client = get_client()
    if not client:
        log.error("Supabase non connecté")
        return

    total_se_fetched  = 0
    total_in_db       = 0
    total_updated     = 0
    strat_stats: dict = {}

    for strat_key in strategies:
        if limit_total and total_se_fetched >= limit_total:
            break

        strat          = STRATEGIES[strat_key]
        strategie_mdb  = strat["strategie_mdb"]
        keywords       = strat["keywords"]
        exclusions     = strat["exclusions"]
        property_types = strat["property_types"]
        surface_min    = strat["surface_min"]

        strat_fetched  = 0
        strat_in_db    = 0
        strat_updated  = 0
        seen_uuids     = set()

        log.info(f"\n{'='*60}")
        log.info(f"Stratégie: {strategie_mdb} | {len(keywords)} keywords")
        log.info(f"{'='*60}")

        for kw in keywords:
            if limit_total and total_se_fetched >= limit_total:
                break

            page = 1
            while True:
                if limit_total and total_se_fetched >= limit_total:
                    break

                try:
                    members, total_items = fetch_expired_group(
                        kw, exclusions, property_types, page,
                        from_date, from_expired_at, to_expired_at, surface_min,
                    )
                except Exception as e:
                    log.error(f"  API erreur [{kw}] page {page}: {e}")
                    break

                if not members:
                    break

                # Dédupliquer intra-run
                new_members = []
                for prop in members:
                    uuid = prop.get("uuid")
                    if uuid and uuid not in seen_uuids:
                        seen_uuids.add(uuid)
                        new_members.append(prop)

                strat_fetched += len(new_members)
                total_se_fetched += len(new_members)
                log.info(f"  [{kw}] page {page} → {len(members)} SE, {len(new_members)} nouveaux | total SE: {total_items}")

                if not new_members:
                    if len(members) < 30:
                        break
                    page += 1
                    continue

                # Cross-référence DB par batch de UUIDs de cette page
                uuids_page = [p["uuid"] for p in new_members if p.get("uuid")]
                try:
                    res = client.table("biens") \
                        .select("id, stream_estate_id, statut") \
                        .in_("stream_estate_id", uuids_page) \
                        .execute()
                    matched = res.data or []
                except Exception as e:
                    log.error(f"  DB select erreur: {e}")
                    matched = []

                # Filtrer ceux déjà marqués expirés + construire map uuid → expiredAt
                uuid_to_expired_at = {
                    p["uuid"]: (
                        p.get("expiredAt")
                        or (p.get("adverts") or [{}])[0].get("expiredAt")
                    )
                    for p in new_members if p.get("uuid")
                }
                # Ignorer les properties sans expiredAt (annonces brièvement indispo puis republiées)
                a_mettre_a_jour = [
                    b for b in matched
                    if b.get("statut") != "Annonce expirée"
                    and uuid_to_expired_at.get(str(b["stream_estate_id"])) is not None
                ]
                skipped_no_date = len(matched) - len(a_mettre_a_jour) - len([b for b in matched if b.get("statut") == "Annonce expirée"])
                if skipped_no_date > 0:
                    log.info(f"    → {skipped_no_date} ignorés (expiredAt=null, possiblement republiés)")
                strat_in_db += len(matched)

                log.info(f"    → {len(matched)} en base dont {len(a_mettre_a_jour)} à mettre à jour")

                if dry_run:
                    for b in a_mettre_a_jour:
                        expired_at = uuid_to_expired_at.get(str(b["stream_estate_id"]))
                        log.info(f"    [DRY] id={b['id']} statut={b['statut']} → Annonce expirée (expiredAt={expired_at})")
                        strat_updated += 1
                else:
                    for bien in a_mettre_a_jour:
                        se_id = str(bien["stream_estate_id"])
                        expired_at = uuid_to_expired_at.get(se_id)
                        try:
                            client.table("biens").update({
                                "statut": "Annonce expirée",
                                "expired_at": expired_at,
                                "updated_at": datetime.now(timezone.utc).isoformat(),
                            }).eq("id", bien["id"]).execute()
                            strat_updated += 1
                        except Exception as e:
                            log.error(f"  UPDATE erreur id={bien['id']}: {e}")

                if len(members) < 30:
                    break
                page += 1
                time.sleep(0.1)

        label = "seraient mis à jour" if dry_run else "mis à jour"
        log.info(f"  {strategie_mdb} : {strat_fetched} crédits SE | {strat_in_db} en base | {strat_updated} {label}")
        total_in_db      += strat_in_db
        total_updated    += strat_updated
        strat_stats[strat_key] = {
            "credits": strat_fetched,
            "in_db": strat_in_db,
            "updated": strat_updated,
        }

    log.info(f"\n{'='*60}")
    log.info(f"RÉSUMÉ FINAL {'(DRY RUN)' if dry_run else ''}")
    log.info(f"  Crédits SE consommés : {total_se_fetched}")
    log.info(f"  Trouvés en base      : {total_in_db}")
    log.info(f"  {'Seraient mis à jour' if dry_run else 'Mis à jour'} : {total_updated}")
    log.info(f"{'='*60}")

    if not dry_run:
        try:
            client.table("cron_config").upsert({
                "id": "sync_expired_se",
                "enabled": True,
                "schedule": "0 1 * * *",
                "last_run": datetime.now(timezone.utc).isoformat(),
                "last_result": {
                    "credits": total_se_fetched,
                    "in_db": total_in_db,
                    "updated": total_updated,
                    "by_strategie": strat_stats,
                    "status": "success",
                },
            }, on_conflict="id").execute()
            log.info("cron_config sync_expired_se mis à jour")
        except Exception as e:
            log.warning(f"cron_config write failed: {e}")

# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Sync expiration Stream Estate → Supabase")
    parser.add_argument("--strategie", choices=list(STRATEGIES.keys()),
                        help="Une seule stratégie (défaut: toutes)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Simulation sans mise à jour DB")
    parser.add_argument("--from-date", default=FROM_DATE_DEFAULT,
                        help=f"Date création property SE (défaut: {FROM_DATE_DEFAULT})")
    parser.add_argument("--from-expired-at",
                        help="Début fenêtre expiration (ex: 2026-04-10). Défaut: hier")
    parser.add_argument("--to-expired-at",
                        help="Fin fenêtre expiration (ex: 2026-04-27). Défaut: aucun")
    parser.add_argument("--limit", type=int, default=None,
                        help="Max crédits SE au total, toutes stratégies confondues (ex: 50 pour test)")
    args = parser.parse_args()

    # Par défaut : hier (cron quotidien)
    if not args.from_expired_at:
        hier = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
        args.from_expired_at = hier
        log.info(f"--from-expired-at non fourni, défaut: hier ({hier})")

    strategies = [args.strategie] if args.strategie else list(STRATEGIES.keys())
    run_sync(
        strategies=strategies,
        dry_run=args.dry_run,
        from_date=args.from_date,
        from_expired_at=args.from_expired_at,
        to_expired_at=args.to_expired_at,
        limit_total=args.limit,
    )


if __name__ == "__main__":
    main()
