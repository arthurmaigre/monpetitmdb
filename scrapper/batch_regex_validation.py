"""
batch_regex_validation.py — Validation regex post-ingestion
Filtre les faux positifs par strategie en analysant titre + description.
Les biens non valides sont marques avec statut "Faux positif".
"""

import os, json, re, logging, sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env", override=True)
sys.path.insert(0, str(Path(__file__).parent))
from supabase_client import get_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

# ══════════════════════════════════════════════════════════════════════════════
# REGEX PAR STRATEGIE (valides sur 2500+ annonces)
# ══════════════════════════════════════════════════════════════════════════════

STRATEGIES = {
    "Locataire en place": {
        "valid": [
            r"locataire\s+en\s+place",
            r"vendu\s+lou[eé]",
            r"bail\s+en\s+cours",
            r"loyer\s+en\s+place",
            r"bien\s+occup[eé]\s+lou[eé]",
            r"occup[eé]\s+par\s+(un\s+)?locataire",
            r"lou[eé]\s+et\s+occup[eé]",
            r"vente\s+occup[eé]e?",
            r"lou[eé]\s+en\s+place",
            r"bail\s+(actif|restant|en\s+vigueur)",
            r"locataire\s+(actuel|pr[eé]sent)",
            r"lou[eé]\s+(actuellement|depuis\s+\d+)",
            r"revenus?\s+locatifs?\s+de\s+\d+",
            r"loyer\s+(actuel|en\s+cours|mensuel)\s+.{0,5}\d+",
            r"rendement\s+(locatif|brut|net)\s+.{0,5}\d+",
            r"bien\s+lou[eé]\s+(depuis|[àa]|avec)",
            r"invest\w+\s+locatif\s+(avec|cl[eé]|imm[eé]diat)",
        ],
        "exclude": [
            r"(pas|sans|libre)\s+(de\s+)?locataire",
            r"libre\s+de\s+(toute\s+)?occupation",
            r"non\s+(lou[eé]|occup[eé])",
            r"r[eé]sidence\s+(g[eé]r[eé]e|services?|senior)",
        ],
    },
    "Travaux lourds": {
        "valid": [
            r"[àa]\s+r[eé]nover",
            r"r[eé]novation\s+(compl[eè]te|totale|enti[eè]re|int[eé]grale|lourde)",
            r"gros\s+travaux",
            r"tout\s+[àa]\s+refaire",
            r"enti[eè]rement\s+[àa]\s+r[eé]nover",
            r"[àa]\s+r[eé]habiliter",
            r"travaux\s+importants",
            r"vendu\s+en\s+l.[eé]tat",
            r"toiture\s+[àa]\s+refaire",
            r"mise\s+aux\s+normes",
            r"inhabitable",
            r"r[eé]novation\s+totale",
            r"travaux\s+de\s+r[eé]novation",
            r"[àa]\s+restaurer",
            r"r[eé]nover\s+(enti[eè]rement|totalement|compl[eè]tement)",
        ],
        "exclude": [
            r"(pas|sans|aucun)\s+(de\s+)?(gros\s+)?travaux",
            r"travaux\s+(r[eé]alis[eé]s|effectu[eé]s|termin[eé]s|faits)",
            r"enti[eè]rement\s+r[eé]nov[eé]",
            r"r[eé]cemment\s+r[eé]nov[eé]",
            r"r[eé]novation\s+r[eé]cente",
            r"refait\s+[àa]\s+neuf",
            r"(pas|aucun)\s+(besoin\s+)?de\s+travaux",
        ],
    },
    "Division": {
        "valid": [
            r"divis(ible|ion|er)",
            r"cr[eé]er\s+(des\s+lots|\d+\s+logements|plusieurs\s+logements|deux\s+logements)",
        ],
        "exclude": [
            r"non\s+divisible",
            r"issu\s+d.une\s+division",
            r"divis[eé]e?\s+en\s+deux\s+(espaces?|parties?)",
            r"chambre\s+.{0,10}divisible",
            r"(pi[eè]ce|salon|s[eé]jour)\s+.{0,10}divisible",
            r"(jardin|cour)\s+.{0,15}divisible",
        ],
    },
}

# Decoupe avec accent
STRATEGIES["D\u00e9coupe"] = {
    "valid": [
        r"immeuble\s+de\s+rapport",
        r"monopropri[eé]t[eé]",
        r"copropri[eé]t[eé]\s+[àa]\s+cr[eé]er",
        r"pas\s+(de|en)\s+copropri[eé]t[eé]",
        r"hors\s+copropri[eé]t[eé]",
        r"vent(e|u)\s+en\s+bloc",
        r"plusieurs\s+(lots?|appartements?|logements?)",
        r"division\s+en\s+plusieurs",
        r"cr[eé](er|ation)\s+(de\s+)?plusieurs\s+(appartements?|logements?|lots?)",
    ],
    "exclude": [],
}


def validate_bien(text: str, strategie: str) -> bool:
    """Retourne True si le texte matche la strategie, False si faux positif."""
    config = STRATEGIES.get(strategie)
    if not config:
        return True  # strategie inconnue, on garde

    t = text.lower()
    is_valid = any(re.search(p, t) for p in config["valid"])
    is_excluded = any(re.search(p, t) for p in config["exclude"]) if config["exclude"] else False

    return is_valid and not is_excluded


def run_batch(dry_run: bool = False):
    client = get_client()
    if not client:
        log.error("Supabase non connecte")
        return

    for strategie, config in STRATEGIES.items():
        log.info(f"\n{'='*60}")
        log.info(f"STRATEGIE : {strategie}")
        log.info(f"{'='*60}")

        # Etape 1 : recuperer tous les IDs par pagination sur created_at (evite timeout sur gros offsets)
        all_ids = []
        last_date = "2020-01-01T00:00:00Z"
        while True:
            r = client.table("biens") \
                .select("id, created_at") \
                .eq("strategie_mdb", strategie) \
                .eq("statut", "Toujours disponible") \
                .gt("created_at", last_date) \
                .order("created_at") \
                .limit(500) \
                .execute()
            rows = r.data or []
            if not rows:
                break
            all_ids.extend([b["id"] for b in rows])
            last_date = rows[-1]["created_at"]

        log.info(f"  {len(all_ids)} biens a valider")

        total = 0
        valid_count = 0
        invalid_count = 0

        # Etape 2 : charger moteurimmo_data par batch de 50 IDs
        for i in range(0, len(all_ids), 10):
            batch_ids = all_ids[i:i+10]
            r = client.table("biens") \
                .select("id, moteurimmo_data") \
                .in_("id", batch_ids) \
                .execute()

            for b in (r.data or []):
                total += 1
                mi = b.get("moteurimmo_data")
                if mi:
                    if isinstance(mi, str):
                        try:
                            mi = json.loads(mi)
                        except:
                            mi = {}
                    title = mi.get("title", "")
                    desc = mi.get("description", "")
                    text = f"{title} {desc}"
                else:
                    text = ""

                if not text.strip():
                    valid_count += 1
                    continue

                if validate_bien(text, strategie):
                    valid_count += 1
                else:
                    invalid_count += 1
                    if dry_run:
                        log.info(f"  [FAUX POSITIF] id={b['id']}")
                    else:
                        client.table("biens").update({"statut": "Faux positif"}).eq("id", b["id"]).execute()

        pct_valid = valid_count * 100 // max(1, total)
        pct_invalid = invalid_count * 100 // max(1, total)
        log.info(f"  Total: {total} | Valides: {valid_count} ({pct_valid}%) | Faux positifs: {invalid_count} ({pct_invalid}%)")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Validation regex batch")
    parser.add_argument("--dry-run", action="store_true", help="Simuler sans modifier la base")
    args = parser.parse_args()

    log.info(f"Mode: {'DRY RUN' if args.dry_run else 'PRODUCTION'}")
    run_batch(dry_run=args.dry_run)
    log.info("\nTermine.")
