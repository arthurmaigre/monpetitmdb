"""
batch_extraction.py — Extraction donnees locatives IA batch (Haiku)
Traite tous les biens Locataire en place sans loyer extrait.
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

EXTRACT_PROMPT = '''Extrais les donnees locatives. UNE SEULE LIGNE JSON.
{"loyer_hc":number|null,"type_loyer":"HC"|"CC","charges_recup":number|null,"charges_copro":number|null,"taxe_fonc_ann":number|null,"fin_bail":"YYYY-MM-DD"|"indefini"|null,"type_bail":"nu"|"meuble"|"commercial"|"pre-89"|null,"profil_locataire":"TYPE | depuis YYYY"|"TYPE | X ans"|null}

REGLES STRICTES profil_locataire :
- TYPE EXACTEMENT parmi : Particulier, Etudiant, Senior, Famille, Colocation, Professionnel, Commercial
- Anciennete : "depuis YYYY" ou "X ans"
- Si type inconnu = Particulier. Si anciennete inconnue = null pour tout le champ.

REGLES : Si loyer CC et charges connues, deduis pour HC. Taxe fonciere ANNUELLE. Charges copro MENSUELLES. Bail pre-89 = indefini. null si absent.'''

def run():
    c = get_client()
    if not c:
        log.error("Supabase non connecte")
        return

    stats = {"total": 0, "extracted": 0, "loyer_found": 0, "bail_found": 0, "profil_found": 0, "errors": 0}
    offset = 0
    page_size = 100

    while True:
        # Biens Locataire en place avec moteurimmo_data mais sans loyer
        r = c.table("biens") \
            .select("id, ville, prix_fai, loyer, moteurimmo_data") \
            .eq("strategie_mdb", "Locataire en place") \
            .eq("statut", "Toujours disponible") \
            .not_.is_("moteurimmo_data", "null") \
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

            desc = (mi.get("description") or "")[:800]
            if not desc:
                offset += 1
                continue

            try:
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
                    for i, ch in enumerate(raw):
                        if ch == "{": depth += 1
                        elif ch == "}": depth -= 1
                        if depth == 0: raw = raw[:i+1]; break

                result = json.loads(raw)
                stats["extracted"] += 1

                # Preparer l'update
                update = {}
                if result.get("loyer_hc") and not b.get("loyer"):
                    update["loyer"] = result["loyer_hc"]
                    update["type_loyer"] = result.get("type_loyer", "HC")
                    stats["loyer_found"] += 1
                if result.get("charges_recup"):
                    update["charges_rec"] = result["charges_recup"]
                if result.get("charges_copro"):
                    update["charges_copro"] = result["charges_copro"]
                if result.get("taxe_fonc_ann"):
                    update["taxe_fonc_ann"] = result["taxe_fonc_ann"]
                if result.get("fin_bail"):
                    update["fin_bail"] = result["fin_bail"]
                if result.get("type_bail"):
                    pass  # TODO: ajouter colonne type_bail
                if result.get("profil_locataire") and result["profil_locataire"] != "null":
                    update["profil_locataire"] = result["profil_locataire"]
                    stats["profil_found"] += 1
                if result.get("fin_bail"):
                    stats["bail_found"] += 1

                # Calculer rendement_brut si loyer et prix disponibles
                loyer = update.get("loyer") or b.get("loyer")
                prix = b.get("prix_fai")
                if loyer and prix and prix > 0:
                    update["rendement_brut"] = round(loyer * 12 / prix, 4)

                if update:
                    c.table("biens").update(update).eq("id", b["id"]).execute()

                if stats["extracted"] % 50 == 0:
                    log.info(f"  Extraits: {stats['extracted']} / {stats['total']} | Loyers: {stats['loyer_found']} | Bails: {stats['bail_found']} | Profils: {stats['profil_found']}")

            except Exception as e:
                stats["errors"] += 1
                if "credit balance" in str(e).lower():
                    log.error("Credits API insuffisants")
                    break

            time.sleep(0.1)

        offset += page_size

    log.info(f"\nResultats: {json.dumps(stats)}")

if __name__ == "__main__":
    log.info("Batch extraction donnees locatives (Haiku)")
    run()
    log.info("Termine.")
