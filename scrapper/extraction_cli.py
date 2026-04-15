"""
extraction_cli.py — Extraction IA via Claude Code Max CLI (remplace API Anthropic)

Même logique que les routes Next.js /api/admin/extraction, /extraction-idr, /score-travaux
mais utilise `claude --bare -p` au lieu du SDK Anthropic.
→ Inclus dans l'abo Claude Code Max = 0€ de coût API supplémentaire.

Usage :
  python extraction_cli.py locataire              # Extraction données locatives
  python extraction_cli.py locataire --limit 10   # Limiter à 10 biens
  python extraction_cli.py idr                    # Extraction immeuble de rapport
  python extraction_cli.py score                  # Score travaux
  python extraction_cli.py --dry-run locataire    # Voir sans modifier la DB
"""
import os, sys, json, logging, argparse, subprocess, time, tempfile, shutil, re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from supabase_client import get_client

log = logging.getLogger("extraction_cli")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

MODEL = "sonnet"
BATCH_SIZE = 10
MAX_WORKERS = 3

# ══════════════════════════════════════════════════════════════════════════════
# Prompts — identiques aux routes TypeScript
# ══════════════════════════════════════════════════════════════════════════════

PROMPT_LOCATAIRE = """Extrais les donnees locatives de cette annonce immobiliere. UNE SEULE LIGNE JSON.
{"loyer":number|null,"type_loyer":"HC"|"CC"|null,"charges_recup":number|null,"charges_copro":number|null,"taxe_fonc_ann":number|null,"fin_bail":"YYYY-MM-DD"|"indefini"|null,"type_bail":"nu"|"meuble"|"commercial"|"pre-89"|null,"profil_locataire":"TYPE | depuis YYYY"|"TYPE | X ans"|null,"nb_sdb":number|null,"nb_chambres":number|null}

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
- Anciennete : "depuis YYYY" ou "X ans". Si inconnue = null pour tout le champ profil_locataire.

REGLES PIECES :
- nb_sdb : nombre de salles de bain + salles d eau. Compter chaque salle de bain, salle d eau, salle de douche mentionnee. null si non mentionne.
- nb_chambres : nombre de chambres. null si non mentionne. Ne pas compter le salon ni le sejour.

Annonce :
"""

PROMPT_IDR = """Tu extrais les donnees d un immeuble de rapport depuis une annonce immobiliere. Reponds avec UNE SEULE LIGNE JSON.

FORMAT :
{"nb_lots":number|null,"loyer_total_mensuel":number|null,"loyer_total_annuel":number|null,"taxe_fonc_ann":number|null,"monopropriete":boolean|null,"compteurs_individuels":boolean|null,"lots":[{"type":"T1"|"T2"|"T3"|"T4"|"T5"|"Studio"|"Local commercial"|"Garage"|null,"surface":number|null,"loyer":number|null,"type_loyer":"HC"|"CC"|null,"etat":"loue"|"vacant"|"a_renover"|null,"dpe":string|null,"etage":"RDC"|"1"|"2"|"3"|"4"|"5"|"sous-sol"|null}]}

REGLES GENERALES :
- nb_lots : nombre total de lots (appartements + locaux commerciaux + garages). Compter chaque lot mentionne.
- loyer_total_mensuel : somme des loyers mensuels de tous les lots (HC de preference). null si non mentionne.
- loyer_total_annuel : revenu locatif annuel total. Si seulement mensuel, multiplier par 12. null si non mentionne.
- taxe_fonc_ann : taxe fonciere ANNUELLE. null si non mentionne.
- monopropriete : true si "monopropriete", "pas de copropriete", "hors copropriete", "pas de syndic". false si copropriete mentionnee. null si non precise.
- compteurs_individuels : true si "compteurs individuels", "compteurs separes". null si non mentionne.
- NE PAS calculer de rendement. Ne retourner que les donnees brutes.

REGLES PAR LOT :
- type : "Studio" pour studio/F1/T1 < 25m2. "T1" pour T1/F1. "T2" pour T2/F2/2 pieces. Etc. "Local commercial" pour commerce/bureau/local. "Garage" pour garage/box/parking. null si inconnu.
- surface : en m2. null si non mentionnee.
- loyer : montant mensuel du lot. null si non mentionne. NE PAS inventer de loyer.
- type_loyer : "HC" ou "CC". null si non precise.
- etat : "loue" si actuellement occupe/loue. "vacant" si libre/non loue. "a_renover" si travaux necessaires. null si non precise.
- dpe : lettre A a G. null si non mentionne.
- etage : "RDC", "1", "2", etc. "sous-sol" pour cave exploitee. null si non precise.

REGLES IMPORTANTES :
- Si l annonce dit "immeuble de 4 appartements" mais ne detaille que 2, creer 4 lots avec les 2 premiers remplis et les 2 autres avec type et surface si mentionnes, le reste a null.
- Si un lot est "a renover" et qu un loyer "potentiel" ou "estime" est mentionne, mettre etat:"a_renover" et NE PAS mettre le loyer potentiel dans loyer (loyer = null). Le loyer est uniquement le loyer reel encaisse.
- Loyer en CC ou HC tel que mentionne. Ne pas deduire les charges.
- Si "loyers annuels 33 240 EUR" et 5 lots, ne PAS diviser. Mettre loyer_total_annuel:33240 et loyer:null sur chaque lot si le detail n est pas donne.
- Maximum 20 lots. Au dela, mettre nb_lots au bon chiffre mais ne detailler que les 20 premiers.

Annonce :
"""

PROMPT_SCORE = """Tu es un expert en renovation immobiliere francaise.
Analyse cette annonce et ses photos pour attribuer un score de travaux de 1 a 5.

REGLE DU CRITERE DOMINANT : le signal le plus grave (texte OU photo) fixe le plancher du score.

Score 1 - Aucun travaux : logement en bon etat, pret a louer, pas de travaux visibles
Score 2 - Rafraichissement : cosmetique (peintures, sols a changer, moquette usee, tapisserie)
Score 3 - Renovation legere : cuisine OU salle de bain a refaire, OU electricite/plomberie partielle
Score 4 - Renovation complete : tous corps d etat (elec, plomberie, isolation), structure saine
Score 5 - Rehabilitation totale : structure a reprendre, inhabitable, toiture/charpente

SIGNAUX TEXTUELS : DPE G=min 3, DPE F=min 2, toiture/charpente=4-5, elec+plomberie=min 3, humidite=min 3, succession/inhabitable=+1

SIGNAUX VISUELS (photos) :
- Murs : fissures structurelles (larges, en escalier)=4-5, microfissures cosmetiques=1-2, traces humidite/moisissure=min 3, papier peint decolle/peinture ecaillee=1-2
- Plafonds : affaissement/taches brunes=min 3, poutres apparentes degradees=4, faux plafond tache=2
- Sols : carrelage casse/souleve=2, parquet gondole=2-3, sol terre battue ou absent=4-5
- Cuisine/SdB : equipements annees 70-80 vieillots=2, absents ou inutilisables=3, pas de salle d eau visible=3
- Electricite : fils apparents/prises anciennes/tableau vetuste=min 3
- Exterieur : toiture affaissee/tuiles manquantes=4-5, facade degradee/enduit tombe=3-4, charpente visible abimee=4-5
- Fenetres : simple vitrage bois pourri=3, fenetres absentes ou condamnees=4
- General : pieces vides sans finition=3-4, gravats/debris=4-5, vegetation interieure=5

REGLE ANNEE DE CONSTRUCTION : l annee seule ne suffit PAS a augmenter le score. Un bien ancien (avant 1950) peut avoir ete renove depuis. N appliquer +1 QUE si l annonce ou les photos contiennent des signaux EXPLICITES de vetuste. L absence de mention de renovation ne signifie PAS absence de renovation.

REGLE PHOTOS : les photos sont le signal le plus fiable. Si le texte dit "a renover" mais les photos montrent un bien correct → score bas. Si le texte est neutre mais les photos montrent des degradations → score haut.

JSON une seule ligne : {"score": <1-5>, "commentaire": "<1-2 phrases mentionnant ce qui est visible sur les photos>"}

Annonce :
"""


# ══════════════════════════════════════════════════════════════════════════════
# Appel Claude CLI
# ══════════════════════════════════════════════════════════════════════════════

def call_claude(prompt: str, timeout: int = 120) -> dict | None:
    """Appelle claude -p avec Sonnet et retourne le JSON parsé, ou None en cas d'erreur."""
    try:
        result = subprocess.run(
            ["claude", "-p", prompt, "--model", MODEL, "--output-format", "json", "--max-turns", "1"],
            capture_output=True, text=True, timeout=timeout,
        )
        if result.returncode != 0:
            log.error(f"Claude CLI erreur (code {result.returncode}): {result.stderr[:200]}")
            return None

        # --output-format json retourne un objet avec "result" contenant la réponse texte
        outer = json.loads(result.stdout)
        response_text = outer.get("result", "")

        # Extraire le JSON de la réponse texte
        return parse_json_response(response_text)
    except subprocess.TimeoutExpired:
        log.error("Claude CLI timeout")
        return None
    except json.JSONDecodeError as e:
        log.error(f"JSON parse error: {e}")
        return None
    except Exception as e:
        log.error(f"Claude CLI exception: {e}")
        return None


def download_photo(url: str, dest_path: str) -> bool:
    """Télécharge une photo vers un fichier local."""
    try:
        r = requests.get(url, timeout=20, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        with open(dest_path, "wb") as f:
            f.write(r.content)
        return True
    except Exception as e:
        log.warning(f"Erreur téléchargement photo {url}: {e}")
        return False


def call_claude_with_photos(prompt: str, photo_paths: list[str], timeout: int = 120) -> dict | None:
    """Appelle claude -p Sonnet avec --allowedTools Read pour lire les photos locales."""
    # Ajouter les instructions de lecture des photos au prompt
    full_prompt = prompt
    if photo_paths:
        full_prompt += "\n\n--- PHOTOS À ANALYSER ---\n"
        for p in photo_paths:
            full_prompt += f"Regarde la photo {p} avec l'outil Read.\n"

    try:
        result = subprocess.run(
            ["claude", "-p", "--model", MODEL, "--allowedTools", "Read", "--max-turns", str(2 + len(photo_paths))],
            input=full_prompt, capture_output=True, text=True, timeout=timeout,
        )
        if result.returncode != 0:
            log.error(f"Claude CLI erreur (code {result.returncode}): {result.stderr[:200]}")
            return None

        return parse_json_response(result.stdout)
    except subprocess.TimeoutExpired:
        log.error(f"Claude CLI timeout ({timeout}s)")
        return None
    except Exception as e:
        log.error(f"Claude CLI exception: {e}")
        return None


def parse_json_response(text: str) -> dict | None:
    """Parse le JSON depuis la réponse Claude (gère les code blocks markdown)."""
    import re
    cleaned = re.sub(r'```json\s*', '', text)
    cleaned = re.sub(r'```\s*', '', cleaned).strip()

    # Trouver l'objet JSON le plus externe
    start = cleaned.find('{')
    if start == -1:
        return None
    depth = 0
    end = -1
    for i in range(start, len(cleaned)):
        if cleaned[i] == '{':
            depth += 1
        elif cleaned[i] == '}':
            depth -= 1
            if depth == 0:
                end = i
                break
    if end == -1:
        return None
    try:
        return json.loads(cleaned[start:end + 1])
    except json.JSONDecodeError:
        return None


def parse_json_array_response(text: str) -> list[dict]:
    """Parse un JSON array depuis la réponse Claude (batch multi-biens)."""
    cleaned = re.sub(r'```json\s*', '', text)
    cleaned = re.sub(r'```\s*', '', cleaned).strip()

    # Chercher un array JSON [...]
    start = cleaned.find('[')
    if start == -1:
        # Fallback : peut-être un seul objet
        single = parse_json_response(text)
        return [single] if single else []
    depth = 0
    end = -1
    for i in range(start, len(cleaned)):
        if cleaned[i] == '[':
            depth += 1
        elif cleaned[i] == ']':
            depth -= 1
            if depth == 0:
                end = i
                break
    if end == -1:
        return []
    try:
        result = json.loads(cleaned[start:end + 1])
        return result if isinstance(result, list) else []
    except json.JSONDecodeError:
        return []


def call_claude_batch(prompt: str, timeout: int = 180) -> list[dict]:
    """Appelle claude -p Sonnet avec un prompt batch, retourne une liste de résultats."""
    try:
        result = subprocess.run(
            ["claude", "-p", prompt, "--model", MODEL, "--output-format", "json", "--max-turns", "1"],
            capture_output=True, text=True, timeout=timeout,
        )
        if result.returncode != 0:
            log.error(f"Claude CLI batch erreur (code {result.returncode}): {result.stderr[:200]}")
            return []

        outer = json.loads(result.stdout)
        response_text = outer.get("result", "")
        return parse_json_array_response(response_text)
    except subprocess.TimeoutExpired:
        log.error("Claude CLI batch timeout")
        return []
    except json.JSONDecodeError as e:
        log.error(f"JSON batch parse error: {e}")
        return []
    except Exception as e:
        log.error(f"Claude CLI batch exception: {e}")
        return []


def extract_moteurimmo_data(bien: dict) -> dict:
    """Extrait et parse le moteurimmo_data d'un bien."""
    md = bien.get("moteurimmo_data")
    if isinstance(md, str):
        try:
            md = json.loads(md)
            if isinstance(md, str):
                md = json.loads(md)
        except Exception:
            md = {}
    return md or {}


# ══════════════════════════════════════════════════════════════════════════════
# Extraction Locataire en place
# ══════════════════════════════════════════════════════════════════════════════

def _apply_locataire_update(bien: dict, parsed: dict, client, dry_run: bool) -> dict:
    """Applique les données extraites d'un bien locataire. Retourne les stats."""
    now = datetime.now(timezone.utc).isoformat()
    stats = {"loyer": 0, "profil": 0}

    if dry_run:
        log.info(f"  [{bien['id']}] DRY RUN → {json.dumps(parsed, ensure_ascii=False)}")
        return stats

    update = {"extraction_statut": "ok", "extraction_date": now}

    if not bien.get("loyer") and parsed.get("loyer") and isinstance(parsed["loyer"], (int, float)):
        update["loyer"] = parsed["loyer"]
        update["type_loyer"] = parsed.get("type_loyer") or "HC"
        stats["loyer"] = 1

    if not bien.get("charges_rec") and parsed.get("charges_recup") is not None:
        update["charges_rec"] = parsed["charges_recup"]
    if not bien.get("charges_copro") and parsed.get("charges_copro") is not None:
        update["charges_copro"] = parsed["charges_copro"]
    if not bien.get("taxe_fonc_ann") and parsed.get("taxe_fonc_ann") is not None:
        update["taxe_fonc_ann"] = parsed["taxe_fonc_ann"]
    if not bien.get("fin_bail") and parsed.get("fin_bail") is not None:
        fb = str(parsed["fin_bail"])
        if re.match(r"^\d{4}-\d{2}-\d{2}$", fb):
            update["fin_bail"] = fb
    if parsed.get("nb_sdb") is not None and isinstance(parsed["nb_sdb"], (int, float)):
        update["nb_sdb"] = int(parsed["nb_sdb"])
    if parsed.get("nb_chambres") is not None and isinstance(parsed["nb_chambres"], (int, float)):
        update["nb_chambres"] = int(parsed["nb_chambres"])

    if parsed.get("profil_locataire") and isinstance(parsed["profil_locataire"], str):
        update["profil_locataire"] = parsed["profil_locataire"]
        stats["profil"] = 1
    else:
        update["profil_locataire"] = "NC"

    final_loyer = update.get("loyer") or bien.get("loyer")
    if final_loyer and bien.get("prix_fai"):
        update["rendement_brut"] = round((final_loyer * 12 / bien["prix_fai"]) * 10000) / 10000

    client.table("biens").update(update).eq("id", bien["id"]).execute()
    log.info(f"  [{bien['id']}] OK — loyer={update.get('loyer')}, profil={update.get('profil_locataire')}")
    return stats


def _process_locataire_batch(chunk: list[dict], client, dry_run: bool) -> dict:
    """Traite un batch de biens locataire (1 appel Claude pour N biens)."""
    stats = {"processed": 0, "loyer": 0, "profil": 0, "errors": 0}
    now = datetime.now(timezone.utc).isoformat()

    # Séparer les biens avec/sans description
    valid_biens = []
    for bien in chunk:
        md = extract_moteurimmo_data(bien)
        desc = (md.get("description", "") or "")[:800]
        if not desc:
            if not dry_run:
                client.table("biens").update({
                    "profil_locataire": "NC",
                    "extraction_statut": "no_data",
                    "extraction_date": now
                }).eq("id", bien["id"]).execute()
            log.info(f"  [{bien['id']}] pas de description → no_data")
            stats["processed"] += 1
        else:
            valid_biens.append((bien, desc))

    if not valid_biens:
        return stats

    # Construire le prompt batch
    prompt = PROMPT_LOCATAIRE + "\n\n--- BATCH : analyse les annonces suivantes et retourne un JSON ARRAY ---\n"
    prompt += "Retourne EXACTEMENT un array JSON : [{\"id\": \"...\", ...données...}, ...]\n\n"
    for bien, desc in valid_biens:
        prompt += f"=== ANNONCE (id: {bien['id']}) ===\n{desc}\n\n"

    log.info(f"  Batch locataire : {len(valid_biens)} biens, appel Claude...")
    results = call_claude_batch(prompt)

    # Mapper les résultats par id
    results_by_id = {}
    for r in results:
        rid = str(r.get("id", ""))
        if rid:
            results_by_id[rid] = r

    for bien, desc in valid_biens:
        bid = str(bien["id"])
        parsed = results_by_id.get(bid)

        if not parsed:
            if not dry_run:
                client.table("biens").update({
                    "profil_locataire": "NC",
                    "extraction_statut": "echec",
                    "extraction_date": now
                }).eq("id", bien["id"]).execute()
            log.warning(f"  [{bien['id']}] pas de résultat dans le batch")
            stats["errors"] += 1
        else:
            s = _apply_locataire_update(bien, parsed, client, dry_run)
            stats["loyer"] += s["loyer"]
            stats["profil"] += s["profil"]
        stats["processed"] += 1

    return stats


def run_locataire(limit: int, dry_run: bool):
    client = get_client()
    if not client:
        log.error("Supabase non connecté")
        return

    query = (client.table("biens")
             .select("id, created_at, prix_fai, loyer, type_loyer, charges_rec, charges_copro, taxe_fonc_ann, fin_bail, profil_locataire, nb_sdb, nb_chambres, moteurimmo_data")
             .eq("strategie_mdb", "Locataire en place")
             .eq("statut", "Toujours disponible")
             .eq("regex_statut", "valide")
             .is_("extraction_statut", "null")
             .order("created_at", desc=False)
             .limit(limit))
    res = query.execute()
    biens = res.data or []
    log.info(f"Locataire en place : {len(biens)} biens à traiter")

    if not biens:
        return

    # Découper en chunks de BATCH_SIZE
    chunks = [biens[i:i + BATCH_SIZE] for i in range(0, len(biens), BATCH_SIZE)]
    totals = {"processed": 0, "loyer": 0, "profil": 0, "errors": 0}

    # Traiter les chunks en parallèle (MAX_WORKERS)
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(_process_locataire_batch, chunk, client, dry_run): i
            for i, chunk in enumerate(chunks)
        }
        for future in as_completed(futures):
            try:
                stats = future.result()
                for k in totals:
                    totals[k] += stats.get(k, 0)
            except Exception as e:
                log.error(f"Erreur batch locataire : {e}")
                totals["errors"] += 1

    log.info(f"\nRésultat locataire : {totals['processed']} traités, {totals['loyer']} loyers trouvés, {totals['profil']} profils trouvés, {totals['errors']} erreurs")


# ══════════════════════════════════════════════════════════════════════════════
# Extraction Immeuble de rapport
# ══════════════════════════════════════════════════════════════════════════════

def _apply_idr_update(bien: dict, parsed: dict, client, dry_run: bool) -> dict:
    """Applique les données extraites d'un bien IDR. Retourne les stats."""
    stats = {"lots": 0}

    if dry_run:
        log.info(f"  [{bien['id']}] DRY RUN → {json.dumps(parsed, ensure_ascii=False)[:300]}")
        return stats

    now = datetime.now(timezone.utc).isoformat()
    update = {"extraction_statut": "ok", "extraction_date": now}
    lots = parsed.get("lots", [])

    nb_lots = parsed.get("nb_lots") or (len(lots) if isinstance(lots, list) else None)
    if nb_lots:
        update["nb_lots"] = nb_lots
    if parsed.get("monopropriete") is not None:
        update["monopropriete"] = parsed["monopropriete"]
    if parsed.get("compteurs_individuels") is not None:
        update["compteurs_individuels"] = parsed["compteurs_individuels"]
    if not bien.get("taxe_fonc_ann") and parsed.get("taxe_fonc_ann") is not None:
        update["taxe_fonc_ann"] = parsed["taxe_fonc_ann"]
    if not bien.get("loyer") and parsed.get("loyer_total_mensuel") and isinstance(parsed["loyer_total_mensuel"], (int, float)):
        update["loyer"] = parsed["loyer_total_mensuel"]
        update["type_loyer"] = "HC"
    if isinstance(lots, list) and len(lots) > 0:
        update["lots_data"] = {"lots": lots}
        stats["lots"] = 1

    final_loyer = update.get("loyer") or bien.get("loyer")
    if final_loyer and bien.get("prix_fai"):
        update["rendement_brut"] = round((final_loyer * 12 / bien["prix_fai"]) * 10000) / 10000

    client.table("biens").update(update).eq("id", bien["id"]).execute()
    log.info(f"  [{bien['id']}] OK — nb_lots={update.get('nb_lots')}, lots={'oui' if stats['lots'] else 'non'}")
    return stats


def _process_idr_batch(chunk: list[dict], client, dry_run: bool) -> dict:
    """Traite un batch de biens IDR (1 appel Claude pour N biens)."""
    stats = {"processed": 0, "lots": 0, "errors": 0}
    now = datetime.now(timezone.utc).isoformat()

    valid_biens = []
    for bien in chunk:
        md = extract_moteurimmo_data(bien)
        title = (md.get("title", "") or "")[:100]
        desc = (md.get("description", "") or "")[:1200]
        if not desc:
            if not dry_run:
                client.table("biens").update({
                    "extraction_statut": "no_data",
                    "extraction_date": now
                }).eq("id", bien["id"]).execute()
            log.info(f"  [{bien['id']}] pas de description → no_data")
            stats["processed"] += 1
        else:
            valid_biens.append((bien, title, desc))

    if not valid_biens:
        return stats

    prompt = PROMPT_IDR + "\n\n--- BATCH : analyse les annonces suivantes et retourne un JSON ARRAY ---\n"
    prompt += "Retourne EXACTEMENT un array JSON : [{\"id\": \"...\", ...données...}, ...]\n\n"
    for bien, title, desc in valid_biens:
        prompt += f"=== ANNONCE (id: {bien['id']}) ===\n{title}\n\n{desc}\n\n"

    log.info(f"  Batch IDR : {len(valid_biens)} biens, appel Claude...")
    results = call_claude_batch(prompt)

    results_by_id = {}
    for r in results:
        rid = str(r.get("id", ""))
        if rid:
            results_by_id[rid] = r

    for bien, title, desc in valid_biens:
        bid = str(bien["id"])
        parsed = results_by_id.get(bid)

        if not parsed:
            if not dry_run:
                client.table("biens").update({
                    "extraction_statut": "echec",
                    "extraction_date": now
                }).eq("id", bien["id"]).execute()
            log.warning(f"  [{bien['id']}] pas de résultat dans le batch")
            stats["errors"] += 1
        else:
            s = _apply_idr_update(bien, parsed, client, dry_run)
            stats["lots"] += s["lots"]
        stats["processed"] += 1

    return stats


def run_idr(limit: int, dry_run: bool):
    client = get_client()
    if not client:
        log.error("Supabase non connecté")
        return

    query = (client.table("biens")
             .select("id, created_at, prix_fai, loyer, taxe_fonc_ann, moteurimmo_data")
             .eq("strategie_mdb", "Immeuble de rapport")
             .eq("statut", "Toujours disponible")
             .eq("regex_statut", "valide")
             .is_("extraction_statut", "null")
             .order("created_at", desc=False)
             .limit(limit))
    res = query.execute()
    biens = res.data or []
    log.info(f"IDR : {len(biens)} biens à traiter")

    if not biens:
        return

    chunks = [biens[i:i + BATCH_SIZE] for i in range(0, len(biens), BATCH_SIZE)]
    totals = {"processed": 0, "lots": 0, "errors": 0}

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(_process_idr_batch, chunk, client, dry_run): i
            for i, chunk in enumerate(chunks)
        }
        for future in as_completed(futures):
            try:
                stats = future.result()
                for k in totals:
                    totals[k] += stats.get(k, 0)
            except Exception as e:
                log.error(f"Erreur batch IDR : {e}")
                totals["errors"] += 1

    log.info(f"\nRésultat IDR : {totals['processed']} traités, {totals['lots']} avec lots, {totals['errors']} erreurs")


# ══════════════════════════════════════════════════════════════════════════════
# Score Travaux
# ══════════════════════════════════════════════════════════════════════════════

def _process_score_single(bien: dict, client, dry_run: bool) -> dict:
    """Traite un seul bien pour le score travaux (photos non batchables)."""
    stats = {"processed": 1, "scored": 0, "errors": 0}
    now = datetime.now(timezone.utc).isoformat()

    md = extract_moteurimmo_data(bien)
    title = (md.get("title", "") or "")
    desc = (md.get("description", "") or "")[:900]
    photo_urls = md.get("pictureUrls") or []

    if not desc and not title:
        if not dry_run:
            client.table("biens").update({
                "score_travaux": 1,
                "score_commentaire": "Pas de description disponible",
                "score_analyse_statut": "no_data",
                "score_analyse_date": now
            }).eq("id", bien["id"]).execute()
        return stats

    annonce = f"Titre: {title}\nDescription: {desc}\nDPE: {bien.get('dpe') or 'NC'}\nAnnee: {bien.get('annee_construction') or 'NC'}\nPrix: {bien.get('prix_fai')} | Surface: {bien.get('surface')}m2"

    tmp_dir = None
    photo_paths = []
    if photo_urls:
        tmp_dir = tempfile.mkdtemp(prefix="score_photos_")
        for i, url in enumerate(photo_urls[:5]):
            ext = url.rsplit(".", 1)[-1][:4] if "." in url else "jpg"
            dest = os.path.join(tmp_dir, f"photo_{i+1}.{ext}")
            if download_photo(url, dest):
                photo_paths.append(dest)

    nb_photos = len(photo_paths)
    log.info(f"  [{bien['id']}] scoring en cours... ({nb_photos} photos)")

    if photo_paths:
        parsed = call_claude_with_photos(PROMPT_SCORE + annonce, photo_paths, timeout=120)
    else:
        parsed = call_claude(PROMPT_SCORE + annonce)

    if tmp_dir:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    if not parsed:
        if not dry_run:
            client.table("biens").update({
                "score_analyse_statut": "erreur",
                "score_analyse_date": now
            }).eq("id", bien["id"]).execute()
        log.warning(f"  [{bien['id']}] échec parsing")
        stats["errors"] = 1
        return stats

    score = parsed.get("score")
    if not isinstance(score, (int, float)) or not (1 <= score <= 5):
        log.warning(f"  [{bien['id']}] score invalide: {score}")
        stats["errors"] = 1
        return stats

    if dry_run:
        log.info(f"  [{bien['id']}] DRY RUN → score={int(score)}, {parsed.get('commentaire', '')[:80]}")
        return stats

    client.table("biens").update({
        "score_travaux": int(score),
        "score_commentaire": str(parsed.get("commentaire", ""))[:800],
        "score_analyse_statut": "ok",
        "score_analyse_date": now
    }).eq("id", bien["id"]).execute()
    log.info(f"  [{bien['id']}] OK — score={int(score)}")
    stats["scored"] = 1
    return stats


def run_score(limit: int, dry_run: bool):
    client = get_client()
    if not client:
        log.error("Supabase non connecté")
        return

    query = (client.table("biens")
             .select("id, created_at, dpe, annee_construction, prix_fai, surface, moteurimmo_data")
             .eq("strategie_mdb", "Travaux lourds")
             .eq("statut", "Toujours disponible")
             .eq("regex_statut", "valide")
             .is_("score_travaux", "null")
             .order("created_at", desc=False)
             .limit(limit))
    res = query.execute()
    biens = res.data or []
    log.info(f"Score travaux : {len(biens)} biens à traiter")

    if not biens:
        return

    totals = {"processed": 0, "scored": 0, "errors": 0}

    # Score avec photos = pas de batch, mais parallélisme sur les appels individuels
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(_process_score_single, bien, client, dry_run): bien["id"]
            for bien in biens
        }
        for future in as_completed(futures):
            try:
                stats = future.result()
                for k in totals:
                    totals[k] += stats.get(k, 0)
            except Exception as e:
                log.error(f"Erreur score : {e}")
                totals["errors"] += 1
                totals["processed"] += 1

    log.info(f"\nRésultat score : {totals['processed']} traités, {totals['scored']} scorés, {totals['errors']} erreurs")


# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Extraction IA via Claude Code Max CLI")
    parser.add_argument("type", choices=["locataire", "idr", "score"], help="Type d'extraction")
    parser.add_argument("--limit", type=int, default=50, help="Nombre max de biens (défaut: 50)")
    parser.add_argument("--dry-run", action="store_true", help="Afficher sans modifier la DB")
    args = parser.parse_args()

    log.info(f"=== Extraction CLI — {args.type} — limit={args.limit} — dry_run={args.dry_run} ===")

    if args.type == "locataire":
        run_locataire(args.limit, args.dry_run)
    elif args.type == "idr":
        run_idr(args.limit, args.dry_run)
    elif args.type == "score":
        run_score(args.limit, args.dry_run)


if __name__ == "__main__":
    main()
