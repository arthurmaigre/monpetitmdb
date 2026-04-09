"""
batch_encheres_extraction.py — Extraction IA (Sonnet) pour les enchères judiciaires

2 modes :
1. Extraction texte : analyse la description brute → données structurées
2. Analyse PDFs : télécharge CCV/PVD → extraction Sonnet (plus coûteux)

Usage :
  python batch_encheres_extraction.py                     # Texte seul
  python batch_encheres_extraction.py --with-pdfs         # Texte + PDFs
  python batch_encheres_extraction.py --limit 10          # Limiter
  python batch_encheres_extraction.py --dry-run           # Afficher le prompt sans appeler l'API
"""
import os, sys, json, logging, time, argparse, re, base64
from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
import requests

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

import anthropic
from supabase_client import get_client

log = logging.getLogger("encheres_extraction")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

TABLE = "encheres"
MODEL = "claude-sonnet-4-20250514"
MAX_TOKENS = 1500
WORKERS = 3

# ══════════════════════════════════════════════════════════════════════════════
# Prompt Sonnet
# ══════════════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """Tu es un expert en ventes aux enchères immobilières judiciaires en France.
On te donne la description brute d'un bien mis aux enchères (et optionnellement le contenu de documents PDF : cahier des conditions de vente, PV descriptif, diagnostics).

Extrais les informations structurées suivantes au format JSON strict.
Retourne UNIQUEMENT le JSON, sans commentaire ni explication.

{
  "type_bien": "Appartement|Maison|Immeuble|Terrain|Local commercial|Parking|Bureau|Mixte|Autre",
  "surface": null,            // float en m², surface du LOT PRINCIPAL uniquement
  "nb_pieces": null,          // int, nombre de pièces principales
  "nb_chambres": null,        // int
  "nb_lots": null,            // int si vente en plusieurs lots
  "etage": null,              // string ex "RDC", "2ème", "R+3"
  "occupation": "libre|occupe|loue|NC",
  "loyer_mensuel": null,      // float HC si loué, en €/mois
  "profil_locataire": null,   // string : "Particulier|Commercial|..." ou null
  "etat_interieur": null,     // string : "bon|correct|travaux légers|travaux lourds|ruine"
  "dpe": null,                // lettre A-G
  "annee_construction": null, // int
  "has_cave": null,           // bool
  "has_parking": null,        // bool
  "has_jardin": null,         // bool
  "has_terrasse": null,       // bool
  "has_piscine": null,        // bool
  "has_ascenseur": null,      // bool
  "tribunal": null,           // string complet "Tribunal Judiciaire de XXX"
  "adresse_complete": null,   // string : "N rue XXX, CP VILLE"
  "code_postal": null,        // string 5 chiffres
  "ville": null,              // string, nom propre avec accents (ex: "Saint-André-d'Huiriat")
  "lots_data": null,          // array de lots SI multi-lots, sinon null
  "description_propre": null  // 2-3 phrases résumant le bien, sans les infos juridiques/DVF
}

Si le bien est vendu en PLUSIEURS LOTS ou est DIVISÉ en plusieurs logements, remplis lots_data :
[{"type": "Appartement", "surface": 52.23, "etage": "1er", "occupation": "occupe", "loyer": 450},
 {"type": "Appartement", "surface": 51.94, "etage": "2ème", "occupation": "libre", "loyer": null}]
Dans ce cas, "surface" = surface TOTALE habitable (somme des lots), et "nb_lots" = nombre de lots.
Pour un lot simple (1 appart + cave + parking), lots_data = null et surface = surface Carrez de l'habitation.

Règles STRICTES :
- Surface : surface TOTALE habitable de ce qui est vendu. Pour un lot simple, c'est la surface Carrez. Pour un multi-lots, c'est la somme des surfaces habitables. Ne PAS inclure parking, cave, terrain dans la surface. Ne PAS confondre surface terrain (ares, ha) avec surface habitable (m²). "1.699 m²" en notation française pour un terrain = 1699 m².
- Occupation : "libre" si le texte dit "libre", "vacant", "inoccupé". "occupe" si occupé sans bail. "loue" si bail en cours avec loyer. Ne PAS déduire "occupé" de mots comme "occupation" dans un contexte juridique général.
- Type bien : "Mixte" si le bien combine habitation + commerce. "Autre" uniquement si vraiment inclassable (parts sociales SCI, droits indivis...).
- Loyer : toujours hors charges (HC). Si CC donné, soustrais les charges si connues.
- Ville : nom propre complet avec accents et traits d'union (ex: "Pont-à-Mousson", pas "Pont A Mousson").
- N'invente rien. Si une info n'est pas dans le texte, laisse null.
"""


def build_user_message(item: dict, pdf_texts: list[str] = None) -> str:
    """Construit le message utilisateur pour Sonnet."""
    parts = []

    parts.append(f"Source : {item.get('source', '?')}")
    parts.append(f"URL : {item.get('url', '?')}")

    if item.get("description"):
        parts.append(f"\n--- DESCRIPTION ---\n{item['description']}")

    # Ajouter les données déjà extraites (pour contexte)
    existing = {}
    for key in ["ville", "code_postal", "tribunal", "surface", "nb_pieces",
                 "occupation", "type_bien", "adresse"]:
        if item.get(key):
            existing[key] = item[key]
    if existing:
        parts.append(f"\n--- DONNÉES DÉJÀ EXTRAITES ---\n{json.dumps(existing, ensure_ascii=False)}")

    if pdf_texts:
        for i, pdf_text in enumerate(pdf_texts, 1):
            # Limiter à 3000 chars par PDF pour le coût
            truncated = pdf_text[:3000]
            parts.append(f"\n--- DOCUMENT PDF {i} ---\n{truncated}")

    return "\n".join(parts)


# ══════════════════════════════════════════════════════════════════════════════
# PDF download & extraction
# ══════════════════════════════════════════════════════════════════════════════

def download_pdf_text(url: str) -> str | None:
    """Télécharge un PDF et en extrait le texte."""
    try:
        r = requests.get(url, timeout=30, headers={
            "User-Agent": "Mozilla/5.0"
        })
        r.raise_for_status()

        # Essayer d'extraire le texte avec PyPDF2 ou pdfplumber
        try:
            import pdfplumber
            import io
            with pdfplumber.open(io.BytesIO(r.content)) as pdf:
                text_parts = []
                for page in pdf.pages[:10]:  # Max 10 pages
                    t = page.extract_text()
                    if t:
                        text_parts.append(t)
                return "\n".join(text_parts) if text_parts else None
        except ImportError:
            log.warning("pdfplumber non installé — pip install pdfplumber")
            return None

    except Exception as e:
        log.warning(f"Erreur téléchargement PDF {url}: {e}")
        return None


# ══════════════════════════════════════════════════════════════════════════════
# Extraction Sonnet
# ══════════════════════════════════════════════════════════════════════════════

client_anthropic = None
lock = threading.Lock()
stats = {"total": 0, "enriched": 0, "no_data": 0, "errors": 0}


def get_anthropic_client():
    global client_anthropic
    if client_anthropic is None:
        client_anthropic = anthropic.Anthropic()
    return client_anthropic


def extract_with_sonnet(item: dict, with_pdfs: bool = True, dry_run: bool = False) -> dict | None:
    """Appelle Sonnet pour extraire les données structurées.

    Par défaut, analyse aussi les PDFs PV + CCV quand disponibles.
    """

    # Télécharger les PDFs automatiquement si disponibles
    # Priorité : PV descriptif > CCV. Ignorer DDT (trop lourd), affiche (image), insertion (doublon)
    PDF_TYPES_PRIORITY = ("pv", "ccv")
    pdf_texts = []
    if with_pdfs and item.get("documents"):
        docs = item["documents"]
        if isinstance(docs, str):
            docs = json.loads(docs)
        for doc_type in PDF_TYPES_PRIORITY:
            for doc in docs:
                if doc.get("type") == doc_type:
                    text = download_pdf_text(doc["url"])
                    if text and len(text) > 100:  # Ignorer les PDFs image (0 texte)
                        pdf_texts.append(text)
                        log.info(f"  PDF {doc_type}: {len(text)} chars")
                    break  # 1 seul PDF par type

    user_msg = build_user_message(item, pdf_texts if pdf_texts else None)

    if dry_run:
        log.info(f"[DRY-RUN] Prompt ({len(user_msg)} chars):\n{user_msg[:500]}...")
        return None

    try:
        ai_client = get_anthropic_client()
        response = ai_client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_msg}],
        )

        text = response.content[0].text.strip()

        # Parser le JSON (Sonnet peut wrapper dans ```json```)
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```$", "", text)

        data = json.loads(text)
        return data

    except json.JSONDecodeError as e:
        log.warning(f"JSON invalide: {e}")
        return None
    except Exception as e:
        log.error(f"Erreur Sonnet: {e}")
        return None


def process_enchere(enchere_id: int, with_pdfs: bool = False, dry_run: bool = False):
    """Traite une enchère : extraction Sonnet + mise à jour DB."""
    c = get_client()
    if not c:
        return

    now = datetime.now(timezone.utc).isoformat()

    try:
        r = c.table(TABLE).select("*").eq("id", enchere_id).limit(1).execute()
        if not r.data:
            return
        item = r.data[0]

        data = extract_with_sonnet(item, with_pdfs=with_pdfs, dry_run=dry_run)

        if dry_run:
            with lock:
                stats["total"] += 1
            return

        if not data:
            c.table(TABLE).update({
                "enrichissement_statut": "no_data",
                "enrichissement_date": now,
            }).eq("id", enchere_id).execute()
            with lock:
                stats["no_data"] += 1
            return

        # Construire l'update
        update = {
            "enrichissement_statut": "ok",
            "enrichissement_date": now,
            "enrichissement_data": json.dumps(data, ensure_ascii=False),
        }

        # === Champs que Sonnet CORRIGE toujours (Sonnet est plus fiable que le scraping) ===
        # Ville : Sonnet met les accents corrects ("Pont-à-Mousson" vs "Pont A Mousson")
        if data.get("ville"):
            update["ville"] = data["ville"]

        # Occupation : Sonnet lit la description, le scraping capte parfois le footer
        if data.get("occupation") and data["occupation"] != "NC":
            update["occupation"] = data["occupation"]

        # Type bien : Sonnet corrige les "Autre" en vrai type
        if data.get("type_bien") and data["type_bien"] != "Autre":
            update["type_bien"] = data["type_bien"]

        # Tribunal : Sonnet normalise le nom propre (supprime adresse, salle, etc.)
        if data.get("tribunal"):
            update["tribunal"] = data["tribunal"]

        # Description : toujours remplacer la brute par la version propre
        if data.get("description_propre"):
            update["description"] = data["description_propre"]

        # === Champs que Sonnet COMPLETE uniquement si absents en base ===
        fill_if_null = {
            "surface": "surface",
            "nb_pieces": "nb_pieces",
            "nb_lots": "nb_lots",
            "tribunal": "tribunal",
            "code_postal": "code_postal",
        }
        for ai_key, db_key in fill_if_null.items():
            if data.get(ai_key) is not None and not item.get(db_key):
                update[db_key] = data[ai_key]

        # Adresse : compléter si absente
        if data.get("adresse_complete") and not item.get("adresse"):
            update["adresse"] = data["adresse_complete"]

        # Lots data : compléter si absent
        if data.get("lots_data") and not item.get("lots_data"):
            update["lots_data"] = json.dumps(data["lots_data"], ensure_ascii=False)

        c.table(TABLE).update(update).eq("id", enchere_id).execute()

        with lock:
            stats["enriched"] += 1

    except Exception as e:
        log.error(f"Erreur traitement {enchere_id}: {e}")
        try:
            c.table(TABLE).update({
                "enrichissement_statut": "echec",
                "enrichissement_date": now,
            }).eq("id", enchere_id).execute()
        except Exception:
            pass
        with lock:
            stats["errors"] += 1


# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════

def run(with_pdfs: bool = True, dry_run: bool = False, limit: int = None):
    """Lance l'extraction Sonnet sur les enchères non encore enrichies.
    PDFs (PV + CCV) analysés automatiquement quand disponibles."""
    c = get_client()
    if not c:
        log.error("Supabase non connecté")
        return stats

    # Récupérer les enchères non enrichies
    q = c.table(TABLE).select("id, source, id_source") \
        .is_("enrichissement_statut", "null") \
        .order("created_at")

    if limit:
        q = q.limit(limit)

    r = q.execute()
    ids = [row["id"] for row in (r.data or [])]

    log.info(f"═══ Extraction Sonnet — {len(ids)} enchères à traiter ═══")
    log.info(f"Mode: {'DRY-RUN' if dry_run else 'PRODUCTION'} | PDFs: {'OUI' if with_pdfs else 'NON'}")

    if not ids:
        log.info("Rien à traiter")
        return stats

    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures = {
            executor.submit(process_enchere, eid, with_pdfs, dry_run): eid
            for eid in ids
        }
        for i, future in enumerate(as_completed(futures), 1):
            eid = futures[future]
            try:
                future.result()
            except Exception as e:
                log.error(f"Future error {eid}: {e}")
            if i % 10 == 0:
                log.info(f"Progression: {i}/{len(ids)} — {json.dumps(stats)}")

    log.info(f"Terminé: {json.dumps(stats)}")
    return stats


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extraction Sonnet — enchères judiciaires")
    parser.add_argument("--no-pdfs", action="store_true", help="Désactiver l'analyse PDFs (PV + CCV)")
    parser.add_argument("--dry-run", action="store_true", help="Afficher les prompts sans appeler l'API")
    parser.add_argument("--limit", type=int, help="Limiter le nombre d'enchères")
    args = parser.parse_args()

    run(with_pdfs=not args.no_pdfs, dry_run=args.dry_run, limit=args.limit)
