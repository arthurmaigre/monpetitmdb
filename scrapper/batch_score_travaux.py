"""
batch_score_travaux.py — Score travaux IA batch (Haiku)
Traite tous les biens Travaux lourds + Division sans score_travaux.
"""

import os, json, re, logging, sys, time
from pathlib import Path
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

def run():
    c = get_client()
    if not c:
        log.error("Supabase non connecte")
        return

    stats = {"total": 0, "scored": 0, "errors": 0}
    offset = 0
    page_size = 100

    while True:
        r = c.table("biens") \
            .select("id, ville, prix_fai, surface, dpe, annee_construction, moteurimmo_data") \
            .in_("strategie_mdb", ["Travaux lourds", "Division", "Locataire en place", "D\u00e9coupe"]) \
            .eq("statut", "Toujours disponible") \
            .is_("score_travaux", "null") \
            .range(offset, offset + page_size - 1) \
            .execute()

        biens = r.data or []
        if not biens:
            break

        for b in biens:
            stats["total"] += 1
            mi = b.get("moteurimmo_data")
            if mi and isinstance(mi, str):
                try: mi = json.loads(mi)
                except: mi = {}
            elif not mi:
                mi = {}

            desc = (mi.get("description") or "")[:900]
            title = (mi.get("title") or "")
            if not desc:
                offset += 1
                continue

            try:
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
                    c.table("biens").update({"score_travaux": score, "score_commentaire": commentaire}).eq("id", b["id"]).execute()
                    stats["scored"] += 1
                    if stats["scored"] % 50 == 0:
                        log.info(f"  Scores: {stats['scored']} / {stats['total']} traites")
            except Exception as e:
                stats["errors"] += 1
                if "credit balance" in str(e).lower():
                    log.error("Credits API insuffisants")
                    break

            time.sleep(0.1)

        offset += page_size

    log.info(f"\nResultats: {json.dumps(stats)}")

if __name__ == "__main__":
    log.info("Batch score travaux (Haiku)")
    run()
    log.info("Termine.")
