"""
batch_nuit.py — Lance toutes les etapes de la nuit en sequence
1. Regex validation
2. Score travaux + Extraction donnees en parallele
3. Estimation DVF batch
"""

import subprocess, sys, time, logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

def run_script(name, script_path):
    log.info(f"\n{'#'*60}")
    log.info(f"# {name}")
    log.info(f"# Debut: {datetime.now().strftime('%H:%M:%S')}")
    log.info(f"{'#'*60}")
    result = subprocess.run(
        [sys.executable, script_path],
        cwd="C:/Users/GAMER/monpetitmdb/scrapper",
        capture_output=False,
        timeout=86400  # 24h max
    )
    log.info(f"# {name} termine (code: {result.returncode})")
    return result.returncode

def run_parallel(tasks):
    """Lance plusieurs scripts en parallele et attend qu'ils finissent tous."""
    processes = []
    for name, script_path in tasks:
        log.info(f"  Lancement parallele: {name}")
        p = subprocess.Popen(
            [sys.executable, script_path],
            cwd="C:/Users/GAMER/monpetitmdb/scrapper",
        )
        processes.append((name, p))

    for name, p in processes:
        p.wait()
        log.info(f"  {name} termine (code: {p.returncode})")

if __name__ == "__main__":
    start = datetime.now()
    log.info(f"BATCH NUIT - Debut: {start.strftime('%d/%m/%Y %H:%M')}")

    # Etape 0 : Ingestion Moteur Immo restante (2022-2023)
    log.info(f"\n{'#'*60}")
    log.info(f"# INGESTION MOTEUR IMMO 2022-2023")
    log.info(f"{'#'*60}")
    run_parallel([
        ("Locataire en place 2022-2023", "moteurimmo_2022.py"),
        ("Travaux lourds 2022-2023", "moteurimmo_2022_tl.py"),
    ])

    # Etape 1 : Regex validation
    run_script("REGEX VALIDATION", "batch_regex_validation.py")

    # Etape 2 : Score travaux + Extraction en parallele
    log.info(f"\n{'#'*60}")
    log.info(f"# SCORE TRAVAUX + EXTRACTION (parallele)")
    log.info(f"{'#'*60}")
    run_parallel([
        ("Score travaux (Haiku)", "batch_score_travaux.py"),
        ("Extraction donnees (Haiku)", "batch_extraction.py"),
    ])

    # Etape 3 : Estimation DVF batch
    log.info(f"\n{'#'*60}")
    log.info(f"# ESTIMATION DVF BATCH")
    log.info(f"{'#'*60}")
    # Lancer via curl sur l'API Next.js
    import urllib.request
    try:
        log.info("Lancement estimation DVF batch via API...")
        req = urllib.request.Request("http://localhost:3000/api/estimation/batch", method="POST")
        with urllib.request.urlopen(req, timeout=86400) as resp:
            log.info(f"Estimation DVF: {resp.read().decode()}")
    except Exception as e:
        log.error(f"Estimation DVF erreur: {e}")

    end = datetime.now()
    duree = end - start
    log.info(f"\n{'='*60}")
    log.info(f"BATCH NUIT TERMINE")
    log.info(f"Debut: {start.strftime('%H:%M')} | Fin: {end.strftime('%H:%M')} | Duree: {duree}")
    log.info(f"{'='*60}")
