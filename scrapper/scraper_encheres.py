"""
scraper_encheres.py — CLI unifié pour les scrapers d'enchères judiciaires

Sources actives :
  - Licitor (~390 annonces, gratuit)
  - Avoventes (~209 annonces, gratuit, prix adjugés)
  - Vench (~431 annonces, abo 40€/an)

Source préparée mais écartée pour l'instant :
  - Petites Affiches (~420 annonces, abo 90€/an)

Usage :
  python scraper_encheres.py                          # Les 3 sources actives
  python scraper_encheres.py --source licitor         # Licitor seul
  python scraper_encheres.py --source avoventes       # Avoventes seul
  python scraper_encheres.py --source vench           # Vench seul
  python scraper_encheres.py --source petitesaffiches # Petites Affiches (si abo)
  python scraper_encheres.py --dry-run                # Sans écriture DB
  python scraper_encheres.py --limit 5                # Limiter par source
"""
import sys, json, logging, argparse, time
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)
log = logging.getLogger("encheres")

# Sources actives par défaut (Petites Affiches écarté — abo 90€/an)
ACTIVE_SOURCES = ["licitor", "avoventes", "vench"]
ALL_SOURCES = ACTIVE_SOURCES + ["petitesaffiches"]


def run_source(source: str, dry_run: bool = False, limit: int = None, **kwargs) -> dict:
    """Lance un scraper par nom de source."""
    if source == "licitor":
        from scraper_licitor import run
        return run(dry_run=dry_run, limit=limit)

    elif source == "avoventes":
        from scraper_avoventes import run
        return run(dry_run=dry_run, limit=limit)

    elif source == "vench":
        from scraper_vench import run
        return run(dry_run=dry_run, limit=limit)

    elif source == "petitesaffiches":
        from scraper_petitesaffiches import run
        return run(dry_run=dry_run, limit=limit,
                   include_adjudications=kwargs.get("adjudications", False))

    else:
        log.error(f"Source inconnue: {source}. Sources disponibles: {ALL_SOURCES}")
        return {"error": f"Source inconnue: {source}"}


def main():
    parser = argparse.ArgumentParser(
        description="Scraper enchères judiciaires — Licitor + Avoventes + Vench",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples:
  python scraper_encheres.py                    # 3 sources actives
  python scraper_encheres.py --source licitor   # Licitor seul
  python scraper_encheres.py --dry-run --limit 3
        """
    )
    parser.add_argument("--source", choices=ALL_SOURCES, help="Source unique à scraper")
    parser.add_argument("--dry-run", action="store_true", help="Pas d'écriture DB")
    parser.add_argument("--limit", type=int, help="Limiter le nombre d'annonces par source")
    parser.add_argument("--adjudications", action="store_true",
                        help="Inclure adjudications (Petites Affiches uniquement)")
    args = parser.parse_args()

    sources = [args.source] if args.source else ACTIVE_SOURCES
    all_stats = {}

    log.info(f"╔══════════════════════════════════════════════╗")
    log.info(f"║  Scraping enchères judiciaires               ║")
    log.info(f"║  Sources: {', '.join(sources):<35s} ║")
    log.info(f"║  Mode: {'DRY-RUN' if args.dry_run else 'PRODUCTION':<38s} ║")
    log.info(f"╚══════════════════════════════════════════════╝")

    start = time.time()

    for source in sources:
        log.info(f"\n{'='*60}")
        log.info(f"  Source: {source.upper()}")
        log.info(f"{'='*60}\n")

        try:
            stats = run_source(source, dry_run=args.dry_run, limit=args.limit,
                               adjudications=args.adjudications)
            all_stats[source] = stats
        except Exception as e:
            log.error(f"Erreur {source}: {e}")
            all_stats[source] = {"error": str(e)}

    elapsed = time.time() - start

    # Résumé
    log.info(f"\n{'='*60}")
    log.info(f"  RÉSUMÉ — {elapsed:.0f}s")
    log.info(f"{'='*60}")

    total = {"inserted": 0, "updated": 0, "skipped": 0, "errors": 0}
    for source, stats in all_stats.items():
        if "error" in stats:
            log.info(f"  {source:<20s} ERREUR: {stats['error']}")
        else:
            log.info(f"  {source:<20s} +{stats.get('inserted', 0)} new, "
                     f"~{stats.get('updated', 0)} maj, "
                     f"={stats.get('skipped', 0)} skip, "
                     f"!{stats.get('errors', 0)} err")
            for k in total:
                total[k] += stats.get(k, 0)

    log.info(f"  {'TOTAL':<20s} +{total['inserted']} new, ~{total['updated']} maj, "
             f"={total['skipped']} skip, !{total['errors']} err")

    return all_stats


if __name__ == "__main__":
    main()
