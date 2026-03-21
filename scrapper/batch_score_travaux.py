"""
batch_score_travaux.py — Score travaux IA batch (Haiku)
Traite tous les biens Travaux lourds + Locataire en place sans analyse.
Timestamp chaque analyse avec statut (ok / echec / no_data).
5 workers paralleles.
"""

import os, json, re, logging, sys, time
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env", override=True)
sys.path.insert(0, str(Path(__file__).parent))
from supabase_client import get_client
import anthropic

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger(__name__)

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SCORE_PROMPT = '''Tu es un expert en renovation immobiliere francaise.
Analyse cette annonce et attribue un score de travaux de 1 a 5.

REGLE DU CRITERE DOMINANT : le signal le plus grave fixe le plancher du score.

Score 1 - Rafraichissement : logement habitable, cosmetique (peintures, sols)
Score 2 - Renovation legere : cuisine OU salle de bain a refaire
Score 3 - Renovation complete : tous corps d etat (elec, plomberie, isolation), structure saine
Score 4 - Renovation lourde : structure partielle + tous corps d etat
Score 5 - Rehabilitation totale : structure entiere a reprendre, inhabitable

SIGNAUX : DPE G=min 3, DPE F=min 2, toiture/charpente=4-5, elec+plomberie=min 3, humidite=min 3, succession/inhabitable=+1, avant 1950 sans renov=+1

JSON une seule ligne : {"score": <1-5>, "commentaire": "<1-2 phrases>"}'''

WORKERS = 5

def run():
    c = get_client()
    if not c:
        log.error("Supabase non connecte")
        return

    stats = {"total": 0, "scored": 0, "no_data": 0, "errors": 0}
    lock = threading.Lock()

    # Recuperer les IDs NON ANALYSES par pagination sur created_at
    all_ids = []
    for strat in ["Travaux lourds", "Locataire en place"]:
        last_date = "2020-01-01T00:00:00Z"
        while True:
            r = c.table("biens") \
                .select("id, created_at") \
                .eq("strategie_mdb", strat) \
                .eq("statut", "Toujours disponible") \
                .is_("score_analyse_statut", "null") \
                .gt("created_at", last_date) \
                .order("created_at") \
                .limit(500) \
                .execute()
            rows = r.data or []
            if not rows: break
            all_ids.extend([b["id"] for b in rows])
            last_date = rows[-1]["created_at"]

    log.info(f"  {len(all_ids)} biens a analyser")

    def process_bien(bien_id):
        now = datetime.now(timezone.utc).isoformat()
        try:
            r = c.table("biens") \
                .select("id, ville, prix_fai, surface, dpe, annee_construction, moteurimmo_data") \
                .eq("id", bien_id) \
                .limit(1) \
                .execute()
            rows = r.data or []
            if not rows:
                return
            b = rows[0]

            mi = b.get("moteurimmo_data")
            if mi and isinstance(mi, str):
                try: mi = json.loads(mi)
                except: mi = {}
            elif not mi:
                mi = {}

            desc = (mi.get("description") or "")[:900]
            title = (mi.get("title") or "")

            if not desc:
                # Pas de description → marquer no_data
                c.table("biens").update({
                    "score_analyse_date": now,
                    "score_analyse_statut": "no_data"
                }).eq("id", b["id"]).execute()
                with lock: stats["no_data"] += 1
                return

            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=150,
                messages=[{"role": "user", "content": f"{SCORE_PROMPT}\n\nTitre: {title}\nDescription: {desc}\nDPE: {b.get('dpe') or 'NC'}\nAnnee: {b.get('annee_construction') or 'NC'}\nPrix: {b.get('prix_fai')} | Surface: {b.get('surface')}m2"}]
            )
            raw = re.sub(r"`+json|`+", "", msg.content[0].text.strip())
            result = json.loads(raw)
            score = int(result.get("score", 0))
            commentaire = str(result.get("commentaire", ""))[:200]

            if 1 <= score <= 5:
                c.table("biens").update({
                    "score_travaux": score,
                    "score_commentaire": commentaire,
                    "score_analyse_date": now,
                    "score_analyse_statut": "ok"
                }).eq("id", b["id"]).execute()
                with lock:
                    stats["scored"] += 1
                    if stats["scored"] % 100 == 0:
                        log.info(f"  Scores: {stats['scored']} ok | {stats['errors']} echecs | {stats['no_data']} no_data")
            else:
                c.table("biens").update({
                    "score_analyse_date": now,
                    "score_analyse_statut": "echec"
                }).eq("id", b["id"]).execute()
                with lock: stats["errors"] += 1

        except Exception as e:
            # Marquer comme echec avec timestamp
            try:
                c.table("biens").update({
                    "score_analyse_date": now,
                    "score_analyse_statut": "echec"
                }).eq("id", bien_id).execute()
            except:
                pass
            with lock: stats["errors"] += 1
            if "credit balance" in str(e).lower():
                log.error("Credits API insuffisants")
                raise

    log.info(f"  Lancement avec {WORKERS} workers paralleles")
    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {executor.submit(process_bien, bid): bid for bid in all_ids}
        for future in as_completed(futures):
            try:
                future.result()
            except Exception:
                pass

    with lock:
        stats["total"] = stats["scored"] + stats["errors"] + stats["no_data"]
    log.info(f"\nResultats: {json.dumps(stats)}")

if __name__ == "__main__":
    log.info("Batch score travaux (Haiku) — 5 workers")
    run()
    log.info("Termine.")
