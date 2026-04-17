"""
scraper_encheres.py — CLI unifié pour les scrapers d'enchères judiciaires

Sources actives :
  - Licitor (~390 annonces, gratuit)
  - Avoventes (~209 annonces, gratuit, prix adjugés, Playwright requis)
  - Vench (~431 annonces, abo 40€/an)

Pipeline complet (cron_encheres.sh) :
  1. scraper_encheres.py         → scraping minimaliste (données fiables + raw_text)
  2. batch_extraction_encheres.py → Sonnet extrait/normalise toutes les colonnes texte
  3. batch_dedup_cross.py         → fusion cross-source sur données propres

Usage :
  python scraper_encheres.py                          # Les 3 sources actives
  python scraper_encheres.py --source licitor         # Licitor seul
  python scraper_encheres.py --dry-run --limit 3
"""
import sys, json, logging, argparse, time
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
log = logging.getLogger("encheres")

ACTIVE_SOURCES = ["licitor", "avoventes", "vench"]


def run_source(source: str, dry_run: bool = False, limit: int = None) -> dict:
    """Lance un scraper par nom de source. Retourne les stats."""
    if source == "licitor":
        from scraper_licitor import run
        return run(dry_run=dry_run, limit=limit)
    elif source == "avoventes":
        from scraper_avoventes import run
        return run(dry_run=dry_run, limit=limit)
    elif source == "vench":
        from scraper_vench import run
        return run(dry_run=dry_run, limit=limit)
    else:
        log.error(f"Source inconnue: {source}")
        return {"error": f"Source inconnue: {source}"}


def mark_expired_for_source(source: str, scraped_ids: set):
    """Marque les enchères disparues du listing comme expirées."""
    from encheres_supabase import mark_expired
    count = mark_expired(source, scraped_ids)
    if count:
        log.info(f"{source}: {count} enchères marquées expirées")


def main():
    parser = argparse.ArgumentParser(description="Scraper enchères — Licitor + Avoventes + Vench")
    parser.add_argument("--source", choices=ACTIVE_SOURCES)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--no-expire", action="store_true", help="Ne pas marquer les disparus comme expirés")
    args = parser.parse_args()

    sources = [args.source] if args.source else ACTIVE_SOURCES
    all_stats = {}

    log.info(f"Scraping enchères — Sources: {', '.join(sources)} — "
             f"Mode: {'DRY-RUN' if args.dry_run else 'PRODUCTION'}")

    start = time.time()

    for source in sources:
        log.info(f"\n{'='*50}  {source.upper()}  {'='*50}\n")
        try:
            stats = run_source(source, dry_run=args.dry_run, limit=args.limit)
            all_stats[source] = stats
        except Exception as e:
            log.error(f"Erreur {source}: {e}")
            all_stats[source] = {"error": str(e)}

    elapsed = time.time() - start

    # Résumé
    log.info(f"\n{'='*50}  RÉSUMÉ ({elapsed:.0f}s)  {'='*50}")
    total = {"inserted": 0, "updated": 0, "skipped": 0, "errors": 0}
    for source, stats in all_stats.items():
        if "error" in stats:
            log.info(f"  {source:<15s} ERREUR: {stats['error']}")
        else:
            log.info(f"  {source:<15s} +{stats.get('inserted', 0)} new, "
                     f"~{stats.get('updated', 0)} maj, "
                     f"!{stats.get('errors', 0)} err")
            for k in total:
                total[k] += stats.get(k, 0)

    log.info(f"  {'TOTAL':<15s} +{total['inserted']} new, ~{total['updated']} maj, !{total['errors']} err")

    return all_stats


if __name__ == "__main__":
    main()
