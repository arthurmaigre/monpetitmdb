"""
batch_extraction_reprocess.py — Re-traite les biens extraits avec l'ancienne logique
Identifie les biens avec profil_locataire rempli (signe qu'ils ont ete traites)
et re-applique la logique correcte HC/CC sans ecraser les montants Moteur Immo.
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

EXTRACT_PROMPT = '''Extrais les donnees locatives de cette annonce immobiliere. UNE SEULE LIGNE JSON.
{"loyer":number|null,"type_loyer":"HC"|"CC"|null,"charges_recup":number|null,"charges_copro":number|null,"taxe_fonc_ann":number|null,"fin_bail":"YYYY-MM-DD"|"indefini"|null,"profil_locataire":"TYPE | depuis YYYY"|"TYPE | X ans"|null}

REGLES LOYER :
- loyer : montant exact mentionne dans l annonce (ne pas modifier)
- type_loyer : "HC" si hors charges, "CC" si charges comprises. null si pas precise.
- NE PAS deduire les charges du loyer.

REGLES PROFIL :
- TYPE parmi : Particulier, Etudiant, Senior, Famille, Colocation, Professionnel, Commercial
- Anciennete : "depuis YYYY" ou "X ans". null si inconnue.'''

def run():
    c = get_client()
    if not c: return

    # Recuperer les IDs des biens deja traites (ont un profil_locataire)
    all_ids = []
    last_date = "2020-01-01T00:00:00Z"
    while True:
        r = c.table("biens") \
            .select("id, created_at") \
            .eq("strategie_mdb", "Locataire en place") \
            .eq("statut", "Toujours disponible") \
            .not_.is_("profil_locataire", "null") \
            .gt("created_at", last_date) \
            .order("created_at") \
            .limit(500) \
            .execute()
        rows = r.data or []
        if not rows: break
        all_ids.extend([b["id"] for b in rows])
        last_date = rows[-1]["created_at"]

    log.info(f"  {len(all_ids)} biens a re-traiter")

    stats = {"total": 0, "updated": 0, "errors": 0}

    for i in range(0, len(all_ids), 10):
        batch_ids = all_ids[i:i+10]
        r = c.table("biens") \
            .select("id, loyer, type_loyer, charges_rec, charges_copro, taxe_fonc_ann, fin_bail, profil_locataire, moteurimmo_data") \
            .in_("id", batch_ids) \
            .execute()

        for b in (r.data or []):
            stats["total"] += 1
            mi = b.get("moteurimmo_data")
            if mi and isinstance(mi, str):
                try: mi = json.loads(mi)
                except: continue
            if not mi: continue

            desc = (mi.get("description") or "")[:800]
            if not desc: continue

            # Recuperer le loyer original Moteur Immo (dans le JSON brut)
            mi_loyer = None
            if mi.get("priceStats", {}).get("rent"):
                mi_loyer = mi["priceStats"]["rent"]

            try:
                msg = client.messages.create(
                    model="claude-haiku-4-5-20251001", max_tokens=300,
                    system=EXTRACT_PROMPT,
                    messages=[{"role": "user", "content": desc}]
                )
                raw = msg.content[0].text.strip()
                raw = re.sub(r"`+json|`+", "", raw).strip()
                if "{" in raw:
                    raw = raw[raw.index("{"):]
                    depth = 0
                    for j, ch in enumerate(raw):
                        if ch == "{": depth += 1
                        elif ch == "}": depth -= 1
                        if depth == 0: raw = raw[:j+1]; break

                result = json.loads(raw)
                update = {}

                # Restaurer le loyer Moteur Immo si il a ete ecrase
                ia_loyer = result.get("loyer") or result.get("loyer_hc")
                ia_type = result.get("type_loyer")
                db_loyer = b.get("loyer")

                if db_loyer and ia_type:
                    if ia_loyer and abs(ia_loyer - db_loyer) < db_loyer * 0.05:
                        update["type_loyer"] = ia_type
                    elif ia_type == "HC" and ia_loyer and ia_loyer < db_loyer:
                        update["type_loyer"] = "CC"
                    elif ia_type == "CC" and ia_loyer and ia_loyer > db_loyer:
                        update["type_loyer"] = "HC"
                    else:
                        update["type_loyer"] = ia_type

                    # Si le loyer a ete ecrase par l'ancienne logique, restaurer le Moteur Immo
                    if mi_loyer and abs(db_loyer - mi_loyer) > mi_loyer * 0.05:
                        # Le loyer en base ne correspond plus au Moteur Immo → restaurer
                        update["loyer"] = mi_loyer

                if update:
                    c.table("biens").update(update).eq("id", b["id"]).execute()
                    stats["updated"] += 1

            except Exception as e:
                stats["errors"] += 1

            time.sleep(0.1)

    log.info(f"Resultats: {json.dumps(stats)}")

if __name__ == "__main__":
    log.info("Re-traitement biens ancienne logique")
    run()
    log.info("Termine.")
