"""
batch_extraction.py — Extraction donnees locatives IA batch (Haiku)
Traite tous les biens Locataire en place sans loyer extrait.
"""

import os, json, re, logging, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
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
{"loyer":number|null,"type_loyer":"HC"|"CC"|null,"charges_recup":number|null,"charges_copro":number|null,"taxe_fonc_ann":number|null,"fin_bail":"YYYY-MM-DD"|"indefini"|null,"type_bail":"nu"|"meuble"|"commercial"|"pre-89"|null,"profil_locataire":"TYPE | depuis YYYY"|"TYPE | X ans"|null}

REGLES LOYER :
- loyer : le montant du loyer mensuel tel que mentionne dans l annonce (ne pas le modifier)
- type_loyer : "HC" si l annonce dit "hors charges", "hc", "charges en sus", "+ charges". "CC" si l annonce dit "charges comprises", "cc", "dont charges". null si pas precise.
- NE PAS deduire les charges du loyer. Stocker le montant exact mentionne.
- Si l annonce dit "loue 800 euros + 50 de charges" → loyer:800, type_loyer:"HC", charges_recup:50
- Si l annonce dit "loue 850 charges comprises dont 50 de charges" → loyer:850, type_loyer:"CC", charges_recup:50

REGLES CHARGES :
- charges_recup : charges recuperables/locatives mensuelles. null si non mentionne.
- charges_copro : charges de copropriete mensuelles. Si annuel, diviser par 12. null si non mentionne.
- taxe_fonc_ann : taxe fonciere ANNUELLE. Si mensuelle, multiplier par 12. null si non mentionne.

REGLES BAIL :
- fin_bail : date de fin au format YYYY-MM-DD. Si seulement mois+annee, mettre le 1er. "indefini" si bail pre-89 ou loi 48. null si non mentionne.
- type_bail : "nu"=location vide, "meuble"=meublee, "commercial"=bail commercial, "pre-89"=bail ancien. null si non mentionne.

REGLES PROFIL :
- TYPE EXACTEMENT parmi : Particulier, Etudiant, Senior, Famille, Colocation, Professionnel, Commercial
- Anciennete : "depuis YYYY" ou "X ans". Si inconnue = null pour tout le champ profil_locataire.'''

def run():
    c = get_client()
    if not c:
        log.error("Supabase non connecte")
        return

    stats = {"total": 0, "extracted": 0, "loyer_found": 0, "bail_found": 0, "profil_found": 0, "errors": 0}

    # Recuperer les IDs NON TRAITES par pagination sur created_at
    all_ids = []
    last_date = "2020-01-01T00:00:00Z"
    while True:
        r = c.table("biens") \
            .select("id, created_at") \
            .eq("strategie_mdb", "Locataire en place") \
            .eq("statut", "Toujours disponible") \
            .not_.is_("moteurimmo_data", "null") \
            .is_("profil_locataire", "null") \
            .is_("fin_bail", "null") \
            .gt("created_at", last_date) \
            .order("created_at") \
            .limit(500) \
            .execute()
        rows = r.data or []
        if not rows: break
        all_ids.extend([b["id"] for b in rows])
        last_date = rows[-1]["created_at"]

    log.info(f"  {len(all_ids)} biens restants a extraire")

    lock = threading.Lock()

    def process_bien(bien_id):
        """Traite un seul bien : charge data, appelle Haiku, update DB."""
        try:
            r = c.table("biens") \
                .select("id, ville, prix_fai, loyer, charges_rec, charges_copro, taxe_fonc_ann, fin_bail, profil_locataire, moteurimmo_data") \
                .eq("id", bien_id) \
                .limit(1) \
                .execute()
            rows = r.data or []
            if not rows:
                return
            b = rows[0]
            if b.get("profil_locataire") or b.get("fin_bail"):
                return

            mi = b.get("moteurimmo_data")
            if mi and isinstance(mi, str):
                try: mi = json.loads(mi)
                except: mi = {}
            elif not mi:
                mi = {}

            desc = (mi.get("description") or "")[:800]
            if not desc:
                return

            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=300,
                system=EXTRACT_PROMPT,
                messages=[{"role": "user", "content": desc}]
            )
            raw = msg.content[0].text.strip()
            raw = re.sub(r"`+json|`+", "", raw).strip()
            if "{" in raw:
                raw = raw[raw.index("{"):]
                depth = 0
                for idx, ch in enumerate(raw):
                    if ch == "{": depth += 1
                    elif ch == "}": depth -= 1
                    if depth == 0: raw = raw[:idx+1]; break

            result = json.loads(raw)

            update = {}
            ia_loyer = result.get("loyer") or result.get("loyer_hc")
            ia_type = result.get("type_loyer")
            ia_charges = result.get("charges_recup")
            db_loyer = b.get("loyer")

            if not db_loyer and ia_loyer:
                update["loyer"] = ia_loyer
                update["type_loyer"] = ia_type or "HC"
                with lock: stats["loyer_found"] += 1
            elif db_loyer and ia_loyer and ia_type:
                if abs(ia_loyer - db_loyer) < db_loyer * 0.05:
                    update["type_loyer"] = ia_type
                elif ia_type == "HC" and ia_loyer < db_loyer:
                    update["type_loyer"] = "CC"
                elif ia_type == "CC" and ia_loyer > db_loyer:
                    update["type_loyer"] = "HC"
                else:
                    update["type_loyer"] = ia_type

            if ia_charges and not b.get("charges_rec"):
                update["charges_rec"] = ia_charges
            if result.get("charges_copro") and not b.get("charges_copro"):
                update["charges_copro"] = result["charges_copro"]
            if result.get("taxe_fonc_ann") and not b.get("taxe_fonc_ann"):
                update["taxe_fonc_ann"] = result["taxe_fonc_ann"]
            if result.get("fin_bail") and not b.get("fin_bail"):
                update["fin_bail"] = result["fin_bail"]
                with lock: stats["bail_found"] += 1
            if result.get("profil_locataire") and result["profil_locataire"] != "null" and not b.get("profil_locataire"):
                update["profil_locataire"] = result["profil_locataire"]
                with lock: stats["profil_found"] += 1

            # Marquer comme traite
            if "profil_locataire" not in update:
                update["profil_locataire"] = result.get("profil_locataire") or "NC"

            loyer_final = update.get("loyer") or b.get("loyer")
            prix = b.get("prix_fai")
            if loyer_final and prix and prix > 0:
                update["rendement_brut"] = round(loyer_final * 12 / prix, 4)

            if update:
                c.table("biens").update(update).eq("id", b["id"]).execute()

            with lock:
                stats["extracted"] += 1
                if stats["extracted"] % 50 == 0:
                    log.info(f"  Extraits: {stats['extracted']} | Loyers: {stats['loyer_found']} | Bails: {stats['bail_found']} | Profils: {stats['profil_found']}")

        except Exception as e:
            with lock: stats["errors"] += 1
            if "credit balance" in str(e).lower():
                log.error("Credits API insuffisants")
                raise

    # Traitement parallele avec 5 workers
    WORKERS = 5
    log.info(f"  Lancement avec {WORKERS} workers paralleles")
    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {executor.submit(process_bien, bid): bid for bid in all_ids}
        for future in as_completed(futures):
            try:
                future.result()
            except Exception:
                pass

    log.info(f"\nResultats: {json.dumps(stats)}")

if __name__ == "__main__":
    log.info("Batch extraction donnees locatives (Haiku)")
    run()
    log.info("Termine.")
