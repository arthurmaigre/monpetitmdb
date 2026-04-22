"""
batch_extraction_biens.py — Extraction IA via Claude Code Max CLI (remplace API Anthropic)

Même logique que les routes Next.js /api/admin/extraction, /extraction-idr, /score-travaux
mais utilise `claude -p --model sonnet` au lieu du SDK Anthropic.
→ Inclus dans l'abo Claude Code Max = 0€ de coût API supplémentaire.

Les biens sont envoyés par batch (N descriptions par appel CLI) pour éviter
le coût du startup CLI (~5s) à chaque bien. Workers parallèles optionnels.

Usage :
  python batch_extraction_biens.py locataire                           # 50 biens, batch 15, 1 worker
  python batch_extraction_biens.py locataire --limit 1000 --workers 3  # 1000 biens, 3 workers parallèles
  python batch_extraction_biens.py idr --batch-size 5                  # IDR, batch de 5
  python batch_extraction_biens.py score                               # Score travaux (pas de batch, photos)
  python batch_extraction_biens.py --dry-run locataire                 # Voir sans modifier la DB
"""
import os, sys, json, logging, argparse, subprocess, time, tempfile, shutil, re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from supabase_client import get_client

log = logging.getLogger("batch_extraction_biens")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# ── Détection quota CLI Max ────────────────────────────────────────────────
QUOTA_HIT = False
QUOTA_KEYWORDS = ["usage limit", "rate limit", "429", "quota", "overloaded", "too many requests", "capacity"]

# ── Détection auth failure (token OAuth expiré) ────────────────────────────
# Séparé de QUOTA_KEYWORDS : les biens ne sont PAS marqués echec_quota
# → ils restent NULL et seront retraités au prochain run
AUTH_FAIL = False
AUTH_FAIL_KEYWORDS = ["invalid api key", "authentication", "unauthorized", "401"]

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

def call_claude(prompt: str, timeout: int = 60) -> dict | None:
    """Appelle claude -p pour UN SEUL bien et retourne le JSON parsé, ou None en cas d'erreur."""
    global QUOTA_HIT
    if QUOTA_HIT:
        return None
    env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_API_KEY"}
    try:
        result = subprocess.run(
            ["claude", "-p", prompt, "--model", "sonnet", "--output-format", "json", "--max-turns", "1"],
            capture_output=True, text=True, timeout=timeout, env=env,
        )
        if result.returncode != 0:
            err_text = (result.stderr + result.stdout).strip()
            log.error(f"Claude CLI exit {result.returncode} — {err_text[:500] or '(vide)'}")
            if any(kw in err_text.lower() for kw in AUTH_FAIL_KEYWORDS):
                log.critical("AUTH CLI ECHOUEE — token OAuth expire, arret immediat (biens non marques echec_quota)")
                global AUTH_FAIL
                AUTH_FAIL = True
                QUOTA_HIT = True
            elif any(kw in err_text.lower() for kw in QUOTA_KEYWORDS):
                log.critical("QUOTA CLI MAX ATTEINT — arret du batch")
                QUOTA_HIT = True
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


BATCH_SIZE = 10  # Nombre de biens par appel CLI


def call_claude_batch(system_prompt: str, items: list[dict[str, str]], timeout: int = 120) -> list[dict | None]:
    """Envoie N descriptions dans un seul appel CLI, retourne une liste de JSON parsés.

    items = [{"id": "xxx", "text": "description du bien"}, ...]
    Retourne une liste de même taille avec dict parsé ou None par item.
    """
    global QUOTA_HIT
    if not items:
        return []
    if QUOTA_HIT:
        return [None] * len(items)

    # Construire le prompt batch
    batch_prompt = system_prompt.rstrip()
    batch_prompt += f"\n\n--- Tu recois {len(items)} annonces numerotees. Retourne un tableau JSON avec exactement {len(items)} objets, dans le meme ordre. ---\n"
    for i, item in enumerate(items):
        batch_prompt += f"\n=== ANNONCE {i+1} (id:{item['id']}) ===\n{item['text']}\n"
    batch_prompt += f"\n--- Reponds avec UN SEUL tableau JSON de {len(items)} objets. Pas de texte avant ou apres. ---"

    env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_API_KEY"}
    try:
        result = subprocess.run(
            ["claude", "-p", batch_prompt, "--model", "sonnet", "--output-format", "json", "--max-turns", "1"],
            capture_output=True, text=True, timeout=timeout, env=env,
        )
        if result.returncode != 0:
            err_text = (result.stderr + result.stdout).strip()
            log.error(f"Claude CLI batch exit {result.returncode} — {err_text[:500] or '(vide)'}")
            if any(kw in err_text.lower() for kw in AUTH_FAIL_KEYWORDS):
                log.critical("AUTH CLI ECHOUEE — token OAuth expire, arret immediat (biens non marques echec_quota)")
                global AUTH_FAIL
                AUTH_FAIL = True
                QUOTA_HIT = True
            elif any(kw in err_text.lower() for kw in QUOTA_KEYWORDS):
                log.critical("QUOTA CLI MAX ATTEINT — arret du batch")
                QUOTA_HIT = True
            return [None] * len(items)

        outer = json.loads(result.stdout)
        response_text = outer.get("result", "")

        # Parser le tableau JSON
        parsed_array = parse_json_array_response(response_text)
        if parsed_array and len(parsed_array) == len(items):
            return parsed_array

        # Fallback : si le nombre ne matche pas, essayer de mapper ce qu'on a
        if parsed_array:
            log.warning(f"Batch: attendu {len(items)} résultats, reçu {len(parsed_array)}")
            # Compléter avec None si trop court
            return (parsed_array + [None] * len(items))[:len(items)]

        log.error("Batch: impossible de parser le tableau JSON")
        return [None] * len(items)

    except subprocess.TimeoutExpired:
        log.error(f"Claude CLI batch timeout ({timeout}s)")
        return [None] * len(items)
    except Exception as e:
        log.error(f"Claude CLI batch exception: {e}")
        return [None] * len(items)


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
    """Appelle claude -p avec --allowedTools Read pour lire les photos locales."""
    global QUOTA_HIT
    # Ajouter les instructions de lecture des photos au prompt
    full_prompt = prompt
    if photo_paths:
        full_prompt += "\n\n--- PHOTOS À ANALYSER ---\n"
        for p in photo_paths:
            full_prompt += f"Regarde la photo {p} avec l'outil Read.\n"

    env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_API_KEY"}
    try:
        result = subprocess.run(
            ["claude", "-p", "--model", "sonnet", "--allowedTools", "Read", "--max-turns", str(2 + len(photo_paths))],
            input=full_prompt, capture_output=True, text=True, timeout=timeout, env=env,
        )
        if result.returncode != 0:
            err_text = (result.stderr + result.stdout).strip()
            log.error(f"Claude CLI exit {result.returncode} — {err_text[:500] or '(vide)'}")
            if any(kw in err_text.lower() for kw in QUOTA_KEYWORDS):
                log.critical("QUOTA CLI MAX ATTEINT — arret du batch")
                QUOTA_HIT = True
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


def parse_json_array_response(text: str) -> list[dict] | None:
    """Parse un tableau JSON depuis la réponse Claude."""
    cleaned = re.sub(r'```json\s*', '', text)
    cleaned = re.sub(r'```\s*', '', cleaned).strip()

    start = cleaned.find('[')
    if start == -1:
        # Fallback : peut-être un seul objet sans tableau
        single = parse_json_response(cleaned)
        return [single] if single else None

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
        return None
    try:
        result = json.loads(cleaned[start:end + 1])
        if isinstance(result, list):
            return result
        return None
    except json.JSONDecodeError:
        return None


# ══════════════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════════════

def parse_moteurimmo_data(raw) -> dict:
    """Parse moteurimmo_data (gère le double-stringed JSON)."""
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, str):
                parsed = json.loads(parsed)
            return parsed if isinstance(parsed, dict) else {}
        except:
            return {}
    return raw if isinstance(raw, dict) else {}


def process_batch_worker(system_prompt: str, items: list[dict[str, str]], batch_size: int, timeout: int = 120) -> list[dict | None]:
    """Traite une liste d'items en un seul appel CLI batch."""
    return call_claude_batch(system_prompt, items, timeout=timeout)


# ══════════════════════════════════════════════════════════════════════════════
# Extraction Locataire en place
# ══════════════════════════════════════════════════════════════════════════════

def run_locataire(limit: int, dry_run: bool, batch_size: int = 15, workers: int = 1, source: str | None = None):
    client = get_client()
    if not client:
        log.error("Supabase non connecté")
        return

    processed = 0
    loyer_found = 0
    profil_found = 0
    errors = 0
    t_start = time.time()
    last_id = 9_999_999  # cursor toujours actif dès la 1ère page → index idx_biens_locataire utilisé
    PAGE_SIZE = 1000
    log.info(f"Locataire en place — limit={limit}, batch_size={batch_size}, workers={workers}")

    def process_one_batch(chunk, items):
        t0 = time.time()
        results = call_claude_batch(PROMPT_LOCATAIRE.rstrip().replace("\nAnnonce :\n", ""), items, timeout=180)
        elapsed = time.time() - t0
        log.info(f"  Batch {len(items)} biens en {elapsed:.1f}s ({elapsed/len(items):.1f}s/bien)")
        return chunk, results

    def write_locataire_to_db(chunk, results):
        nonlocal processed, loyer_found, profil_found, errors
        for (bien, desc), parsed in zip(chunk, results):
            now = datetime.now(timezone.utc).isoformat()
            if not parsed:
                if not dry_run:
                    status = "echec" if AUTH_FAIL else ("echec_quota" if QUOTA_HIT else "echec")
                    client.table("biens").update({
                        "profil_locataire": "NC",
                        "extraction_statut": status,
                        "extraction_date": now
                    }).eq("id", bien["id"]).execute()
                log.warning(f"  [{bien['id']}] echec parsing{' (quota)' if QUOTA_HIT else ''}")
                errors += 1
                processed += 1
                continue

            if dry_run:
                log.info(f"  [{bien['id']}] DRY RUN → {json.dumps(parsed, ensure_ascii=False)}")
                processed += 1
                continue

            update = {"extraction_statut": "ok", "extraction_date": now}

            if not bien.get("loyer") and parsed.get("loyer") and isinstance(parsed["loyer"], (int, float)):
                update["loyer"] = parsed["loyer"]
                update["type_loyer"] = parsed.get("type_loyer") or "HC"
                loyer_found += 1

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
                profil_found += 1
            else:
                update["profil_locataire"] = "NC"

            final_loyer = update.get("loyer") or bien.get("loyer")
            if final_loyer and bien.get("prix_fai"):
                update["rendement_brut"] = round((final_loyer * 12 / bien["prix_fai"]) * 10000) / 10000

            client.table("biens").update(update).eq("id", bien["id"]).execute()
            log.info(f"  [{bien['id']}] OK — loyer={update.get('loyer')}, profil={update.get('profil_locataire')}")
            processed += 1

    # Boucle streaming : charger une page → traiter → page suivante
    while processed < limit and not QUOTA_HIT:
        fetch_size = min(PAGE_SIZE, limit - processed)
        q = (client.table("biens")
             .select("id, prix_fai, loyer, type_loyer, charges_rec, charges_copro, taxe_fonc_ann, fin_bail, profil_locataire, nb_sdb, nb_chambres, moteurimmo_data")
             .eq("strategie_mdb", "Locataire en place")
             .eq("statut", "Toujours disponible")
             .eq("regex_statut", "valide")
             .or_("extraction_statut.is.null,extraction_statut.eq.echec,extraction_statut.eq.echec_quota")
             .order("id", desc=True)
             .limit(fetch_size))
        if last_id is not None:
            q = q.lt("id", last_id)
        if source:
            q = q.eq("source_provider", source)
        page = q.execute().data or []
        if not page:
            break
        last_id = page[-1]["id"]
        log.info(f"  Page {len(page)} biens chargés (last_id={last_id}, total traité={processed})")

        biens_with_desc = []
        for bien in page:
            md = parse_moteurimmo_data(bien.get("moteurimmo_data"))
            desc = (md.get("description", "") or "")[:800]
            if not desc:
                now = datetime.now(timezone.utc).isoformat()
                if not dry_run:
                    client.table("biens").update({
                        "profil_locataire": "NC",
                        "extraction_statut": "no_data",
                        "extraction_date": now
                    }).eq("id", bien["id"]).execute()
                log.info(f"  [{bien['id']}] pas de description → no_data")
                processed += 1
            else:
                biens_with_desc.append((bien, desc))

        if not biens_with_desc:
            if len(page) < fetch_size:
                break
            continue

        batches = [(biens_with_desc[i:i + batch_size],
                    [{"id": str(b["id"]), "text": d} for b, d in biens_with_desc[i:i + batch_size]])
                   for i in range(0, len(biens_with_desc), batch_size)]

        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {executor.submit(process_one_batch, chunk, items): (chunk, items)
                       for chunk, items in batches}
            for future in as_completed(futures):
                try:
                    chunk, results = future.result()
                except Exception as e:
                    log.error(f"  Batch exception: {e}")
                    chunk, _ = futures[future]
                    results = [None] * len(chunk)
                write_locataire_to_db(chunk, results)

        if len(page) < fetch_size:
            break

    elapsed_total = time.time() - t_start
    log.info(f"\nRésultat : {processed} traités, {loyer_found} loyers trouvés, {profil_found} profils trouvés, {errors} erreurs — {elapsed_total:.0f}s total ({elapsed_total/max(processed,1):.1f}s/bien)")


# ══════════════════════════════════════════════════════════════════════════════
# Extraction Immeuble de rapport
# ══════════════════════════════════════════════════════════════════════════════

def run_idr(limit: int, dry_run: bool, batch_size: int = 10, workers: int = 1, source: str | None = None):
    client = get_client()
    if not client:
        log.error("Supabase non connecté")
        return

    processed = 0
    lots_found = 0
    errors = 0
    t_start = time.time()
    last_id = 9_999_999  # cursor toujours actif dès la 1ère page → index utilisé
    PAGE_SIZE = 200       # réduit pour éviter timeout Supabase sur grosses tables
    log.info(f"IDR — limit={limit}, batch_size={batch_size}, workers={workers}")

    def process_one_batch(chunk, items):
        t0 = time.time()
        results = call_claude_batch(PROMPT_IDR.rstrip().replace("\nAnnonce :\n", ""), items, timeout=180)
        elapsed = time.time() - t0
        log.info(f"  Batch {len(items)} biens en {elapsed:.1f}s ({elapsed/len(items):.1f}s/bien)")
        return chunk, results

    def write_idr_to_db(chunk, results):
        nonlocal processed, lots_found, errors
        for (bien, text), parsed in zip(chunk, results):
            now = datetime.now(timezone.utc).isoformat()
            if not parsed:
                if not dry_run:
                    status = "echec" if AUTH_FAIL else ("echec_quota" if QUOTA_HIT else "echec")
                    client.table("biens").update({
                        "extraction_statut": status,
                        "extraction_date": now
                    }).eq("id", bien["id"]).execute()
                log.warning(f"  [{bien['id']}] echec parsing{' (quota)' if QUOTA_HIT else ''}")
                errors += 1
                processed += 1
                continue

            if dry_run:
                log.info(f"  [{bien['id']}] DRY RUN → {json.dumps(parsed, ensure_ascii=False)[:300]}")
                processed += 1
                continue

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
                lots_found += 1

            final_loyer = update.get("loyer") or bien.get("loyer")
            if final_loyer and bien.get("prix_fai"):
                update["rendement_brut"] = round((final_loyer * 12 / bien["prix_fai"]) * 10000) / 10000

            client.table("biens").update(update).eq("id", bien["id"]).execute()
            log.info(f"  [{bien['id']}] OK — nb_lots={update.get('nb_lots')}, lots_data={'oui' if lots_found else 'non'}")
            processed += 1

    # Boucle streaming : charger une page → traiter → page suivante (desc = plus récents en premier)
    while processed < limit and not QUOTA_HIT:
        fetch_size = min(PAGE_SIZE, limit - processed)
        q = (client.table("biens")
             .select("id, prix_fai, loyer, taxe_fonc_ann, moteurimmo_data")
             .eq("strategie_mdb", "Immeuble de rapport")
             .eq("statut", "Toujours disponible")
             .eq("regex_statut", "valide")
             .or_("extraction_statut.is.null,extraction_statut.eq.echec,extraction_statut.eq.echec_quota")
             .order("id", desc=True)
             .limit(fetch_size))
        if last_id is not None:
            q = q.lt("id", last_id)
        if source:
            q = q.eq("source_provider", source)
        page = q.execute().data or []
        if not page:
            break
        last_id = page[-1]["id"]
        log.info(f"  Page {len(page)} biens chargés (last_id={last_id}, total traité={processed})")

        biens_with_desc = []
        for bien in page:
            md = parse_moteurimmo_data(bien.get("moteurimmo_data"))
            title = (md.get("title", "") or "")[:100]
            desc = (md.get("description", "") or "")[:1200]
            if not desc:
                now = datetime.now(timezone.utc).isoformat()
                if not dry_run:
                    client.table("biens").update({
                        "extraction_statut": "no_data",
                        "extraction_date": now
                    }).eq("id", bien["id"]).execute()
                log.info(f"  [{bien['id']}] pas de description → no_data")
                processed += 1
            else:
                biens_with_desc.append((bien, f"{title}\n\n{desc}"))

        if not biens_with_desc:
            if len(page) < fetch_size:
                break
            continue

        batches = [(biens_with_desc[i:i + batch_size],
                    [{"id": str(b["id"]), "text": text} for b, text in biens_with_desc[i:i + batch_size]])
                   for i in range(0, len(biens_with_desc), batch_size)]

        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {executor.submit(process_one_batch, chunk, items): (chunk, items)
                       for chunk, items in batches}
            for future in as_completed(futures):
                try:
                    chunk, results = future.result()
                except Exception as e:
                    log.error(f"  Batch exception: {e}")
                    chunk, _ = futures[future]
                    results = [None] * len(chunk)
                write_idr_to_db(chunk, results)

        if len(page) < fetch_size:
            break

    elapsed_total = time.time() - t_start
    log.info(f"\nRésultat : {processed} traités, {lots_found} avec lots, {errors} erreurs — {elapsed_total:.0f}s total ({elapsed_total/max(processed,1):.1f}s/bien)")


# ══════════════════════════════════════════════════════════════════════════════
# Score Travaux
# ══════════════════════════════════════════════════════════════════════════════

def run_score(limit: int, dry_run: bool, source: str | None = None):
    client = get_client()
    if not client:
        log.error("Supabase non connecté")
        return

    processed = 0
    scored = 0
    errors = 0
    last_id = 9_999_999  # cursor toujours actif dès la 1ère page → index utilisé
    PAGE_SIZE = 200       # réduit pour éviter timeout Supabase sur grosses tables
    log.info(f"Score travaux — limit={limit}")

    # Boucle streaming : charger une page → traiter → page suivante (desc = plus récents en premier)
    while processed < limit and not QUOTA_HIT:
        fetch_size = min(PAGE_SIZE, limit - processed)
        q = (client.table("biens")
             .select("id, dpe, annee_construction, prix_fai, surface, moteurimmo_data")
             .eq("strategie_mdb", "Travaux lourds")
             .eq("statut", "Toujours disponible")
             .eq("regex_statut", "valide")
             .is_("score_travaux", "null")
             .order("id", desc=True)
             .limit(fetch_size))
        if last_id is not None:
            q = q.lt("id", last_id)
        if source:
            q = q.eq("source_provider", source)
        page = q.execute().data or []
        if not page:
            break
        last_id = page[-1]["id"]
        log.info(f"  Page {len(page)} biens chargés (last_id={last_id}, total traité={processed})")

        for bien in page:
            if processed >= limit or QUOTA_HIT:
                break
            now = datetime.now(timezone.utc).isoformat()
            md = bien.get("moteurimmo_data")
            if isinstance(md, str):
                try:
                    md = json.loads(md)
                    if isinstance(md, str):
                        md = json.loads(md)
                except:
                    md = {}

            title = (md.get("title", "") or "") if md else ""
            desc = (md.get("description", "") or "")[:900] if md else ""
            photo_urls = (md.get("pictureUrls") or []) if md else []
            if not desc and not title:
                if not dry_run:
                    client.table("biens").update({
                        "score_travaux": 1,
                        "score_commentaire": "Pas de description disponible",
                        "score_analyse_statut": "no_data",
                        "score_analyse_date": now
                    }).eq("id", bien["id"]).execute()
                processed += 1
                continue

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
                    status = "erreur" if AUTH_FAIL else ("echec_quota" if QUOTA_HIT else "erreur")
                    client.table("biens").update({
                        "score_analyse_statut": status,
                        "score_analyse_date": now
                    }).eq("id", bien["id"]).execute()
                log.warning(f"  [{bien['id']}] echec parsing{' (quota)' if QUOTA_HIT else ''}")
                errors += 1
                processed += 1
                continue

            score = parsed.get("score")
            if not isinstance(score, (int, float)) or not (1 <= score <= 5):
                log.warning(f"  [{bien['id']}] score invalide: {score}")
                errors += 1
                processed += 1
                continue

            if dry_run:
                log.info(f"  [{bien['id']}] DRY RUN → score={int(score)}, {parsed.get('commentaire', '')[:80]}")
                processed += 1
                continue

            client.table("biens").update({
                "score_travaux": int(score),
                "score_commentaire": str(parsed.get("commentaire", ""))[:800],
                "score_analyse_statut": "ok",
                "score_analyse_date": now
            }).eq("id", bien["id"]).execute()
            log.info(f"  [{bien['id']}] OK — score={int(score)}")
            scored += 1
            processed += 1

        if len(page) < fetch_size:
            break

    log.info(f"\nRésultat : {processed} traités, {scored} scorés, {errors} erreurs")


# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="Extraction IA via Claude Code Max CLI")
    parser.add_argument("type", choices=["locataire", "idr", "score"], help="Type d'extraction")
    parser.add_argument("--limit", type=int, default=50, help="Nombre max de biens (défaut: 50)")
    parser.add_argument("--batch-size", type=int, default=None, help="Biens par appel CLI (défaut: 15 locataire, 10 IDR)")
    parser.add_argument("--workers", type=int, default=1, help="Workers parallèles (défaut: 1)")
    parser.add_argument("--dry-run", action="store_true", help="Afficher sans modifier la DB")
    parser.add_argument("--source", type=str, default=None, help="Filtrer par source_provider (ex: stream_estate)")
    args = parser.parse_args()

    log.info(f"=== Extraction CLI — {args.type} — limit={args.limit} — workers={args.workers} — source={args.source} — dry_run={args.dry_run} ===")

    if args.type == "locataire":
        bs = args.batch_size or 15
        run_locataire(args.limit, args.dry_run, batch_size=bs, workers=args.workers, source=args.source)
    elif args.type == "idr":
        bs = args.batch_size or 10
        run_idr(args.limit, args.dry_run, batch_size=bs, workers=args.workers, source=args.source)
    elif args.type == "score":
        run_score(args.limit, args.dry_run, source=args.source)


if __name__ == "__main__":
    main()
