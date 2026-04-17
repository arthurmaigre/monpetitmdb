"""
batch_extraction_encheres.py — Extraction IA (Opus via CLI Claude Max) pour les enchères judiciaires

Opus est la SOURCE AUTORITAIRE pour toutes les colonnes texte.
Le scraping ne fournit que les données fiables (prix, dates, GPS, URLs).
Opus lit le raw_text + PDFs et peuple proprement toutes les colonnes structurées.

Utilise le CLI claude (abonnement Max) au lieu de l'API Anthropic.
Pré-requis : claude CLI connecté (claude login), poppler-utils installé.

Usage :
  python batch_extraction_encheres.py                     # Texte + PDFs
  python batch_extraction_encheres.py --no-pdfs            # Texte seul
  python batch_extraction_encheres.py --limit 10
  python batch_extraction_encheres.py --reprocess          # Re-traiter les "ok" existants
  python batch_extraction_encheres.py --dry-run
"""
import os, sys, json, logging, time, argparse, re, subprocess, tempfile, shutil
from pathlib import Path
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from supabase_client import get_client

log = logging.getLogger("encheres_extraction")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

TABLE = "encheres"
MODEL = "sonnet"

# ── Détection quota CLI Max ────────────────────────────────────────────────
QUOTA_HIT = False
QUOTA_KEYWORDS = ["usage limit", "rate limit", "429", "quota", "overloaded", "too many requests", "capacity"]

# ══════════════════════════════════════════════════════════════════════════════
# Prompt — SOURCE AUTORITAIRE pour toutes les colonnes texte
# ══════════════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """Tu es un expert en ventes aux enchères immobilières judiciaires en France.
On te donne le texte brut scrapé d'une annonce d'enchère judiciaire (et optionnellement le contenu de documents PDF : cahier des conditions de vente, PV descriptif).

Tu dois extraire TOUTES les informations structurées au format JSON strict.
Retourne UNIQUEMENT le JSON, sans commentaire ni explication.

{
  "type_bien": "Appartement|Maison|Immeuble|Terrain|Local commercial|Parking|Bureau|Mixte|Autre",
  "surface": null,
  "nb_pieces": null,
  "nb_chambres": null,
  "nb_lots": null,
  "etage": null,
  "occupation": "libre|occupe|loue|NC",
  "loyer_mensuel": null,
  "profil_locataire": null,
  "etat_interieur": null,
  "dpe": null,
  "annee_construction": null,
  "has_cave": null,
  "has_parking": null,
  "has_jardin": null,
  "has_terrasse": null,
  "has_piscine": null,
  "has_ascenseur": null,
  "tribunal": null,
  "adresse_complete": null,
  "code_postal": null,
  "ville": null,
  "departement": null,
  "avocat_nom": null,
  "avocat_cabinet": null,
  "avocat_tel": null,
  "avocat_email": null,
  "frais_prealables": null,
  "date_visite": null,
  "heure_audience": null,
  "lots_data": null,
  "description_propre": null
}

RÈGLES DE NORMALISATION STRICTES :

TRIBUNAL :
- Format exact : "Tribunal Judiciaire de Ville" (majuscule initiale sur chaque mot de la ville)
- "TJ de Tours" → "Tribunal Judiciaire de Tours"
- "Tribunal de Grande Instance de Paris" → "Tribunal Judiciaire de Paris"
- Ne PAS inclure l'adresse du tribunal, la salle, l'étage

VILLE :
- Nom propre complet avec accents et traits d'union
- "SAINT JEAN DE VEDAS" → "Saint-Jean-de-Védas"
- "PONT A MOUSSON" → "Pont-à-Mousson"
- "tours" → "Tours"
- Ne PAS inclure le code postal, le département, ni "Cedex"

CODE_POSTAL : exactement 5 chiffres. Ne PAS confondre avec le CP de l'avocat ou du tribunal.

DEPARTEMENT : nom du département (ex: "Indre-et-Loire", "Loire-Atlantique"), PAS le numéro.

TYPE_BIEN :
- "Appartement" : tout logement en copropriété (studio, T1-T5, duplex)
- "Maison" : pavillon, villa, corps de ferme, propriété
- "Immeuble" : immeuble entier (même divisé en lots)
- "Terrain" : terrain nu, parcelle
- "Local commercial" : boutique, commerce, local d'activité
- "Parking" : garage, box, place de parking
- "Bureau" : local professionnel/bureau
- "Mixte" : habitation + commerce dans le même lot
- "Autre" : parts de SCI, droits indivis, cave seule, etc.

SURFACE :
- Surface habitable totale en m² (float). Pour multi-lots, somme des surfaces habitables.
- Ne PAS confondre surface terrain (ares, hectares) avec surface habitable.
- "1.699 m²" en notation française pour un terrain = 1699 m², ne pas stocker dans surface.

OCCUPATION :
- "libre" si le texte dit "libre", "vacant", "inoccupé"
- "occupe" si occupé sans bail
- "loue" si bail en cours avec loyer
- "NC" si pas d'information claire
- Ne PAS déduire "occupé" du contexte juridique général

LOYER : toujours hors charges (HC), en €/mois. Si CC, soustraire charges si connues.

AVOCAT :
- avocat_nom : "Prénom NOM" ou "NOM" (pas de "Maître", "Me")
- avocat_cabinet : nom du cabinet (SELARL, SCP, etc.) sans adresse
- avocat_tel : numéro tel formaté "0X XX XX XX XX"
- avocat_email : adresse email si présente dans le texte ou le bloc avocat. null si non mentionnée.

FRAIS_PREALABLES : montant en euros (float) des frais préalables / frais de procédure / frais de poursuite mentionnés dans l'annonce ou le CCV. Souvent intitulé "frais préalables", "frais de poursuite", "frais taxés". null si non mentionné.

DATE_VISITE : date et heure de visite au format ISO "YYYY-MM-DDTHH:MM:SS". Cherche "Visite", "VISITES", "visite sur place", "visite le", "visite prévue". Peut contenir "Le Jeudi 19 mars 2026 de 15h00 à 16h00" → "2026-03-19T15:00:00". Si plage horaire, prendre l'heure de début. null si non mentionné.

HEURE_AUDIENCE : heure de l'audience au format "HH:MM" (ex: "10:30", "14:00"). Cherche dans la date de vente/audience "à 10h00", "à 14h30", "10 heures". null si pas d'heure mentionnée.

LOTS_DATA (si multi-lots uniquement) :
[{"type": "Appartement", "surface": 52.23, "etage": "1er", "occupation": "occupe", "loyer": 450}, ...]

DESCRIPTION_PROPRE : 2-3 phrases résumant le bien. Pas d'infos juridiques, DVF, ni publicités.

PRIORITÉ DES SOURCES : en cas de conflit entre le texte de la page web et le contenu d'un PDF (CCV, PV descriptif), le PDF fait foi (document officiel du tribunal).

RÈGLE D'OR : n'invente rien. Si une info n'est pas dans le texte ni les PDFs, laisse null.
"""


def load_learning_examples() -> list[dict]:
    """Charge les exemples vérifiés depuis encheres_learning.json."""
    learning_path = Path(__file__).parent / "encheres_learning.json"
    if not learning_path.exists():
        return []
    try:
        data = json.loads(learning_path.read_text(encoding="utf-8"))
        return data.get("examples", [])
    except Exception as e:
        log.warning(f"Erreur chargement learning: {e}")
        return []


def build_system_prompt() -> str:
    """Construit le system prompt avec les exemples few-shot."""
    examples = load_learning_examples()
    if not examples:
        return SYSTEM_PROMPT

    examples_text = "\n\n--- EXEMPLES VÉRIFIÉS ---\n"
    for i, ex in enumerate(examples, 1):
        examples_text += f"\nExemple {i} : {ex.get('input_summary', '')}\n"
        examples_text += f"Résultat attendu : {json.dumps(ex.get('expected_output', {}), ensure_ascii=False)}\n"

    return SYSTEM_PROMPT + examples_text


def build_prompt_text(item: dict, pdf_paths: list[str] = None) -> str:
    """Construit le prompt texte pour le CLI claude.
    Les PDFs sont référencés par chemin — Claude les lira via son outil Read.
    """
    text_parts = []
    text_parts.append(f"Source : {item.get('source', '?')}")
    text_parts.append(f"URL : {item.get('url', '?')}")

    # Hints structurés (données fiables du scraping)
    hints = []
    if item.get("avocat_cabinet"):
        hints.append(f"Cabinet avocat : {item['avocat_cabinet']}")
    if item.get("avocat_tel"):
        hints.append(f"Tel avocat : {item['avocat_tel']}")
    if item.get("avocat_email"):
        hints.append(f"Email avocat : {item['avocat_email']}")
    if hints:
        text_parts.append("\n--- DONNÉES STRUCTURÉES (fiables) ---\n" + "\n".join(hints))

    if item.get("description"):
        text_parts.append(f"\n--- TEXTE BRUT SCRAPÉ ---\n{item['description']}")

    if pdf_paths:
        text_parts.append("\n--- DOCUMENTS PDF À LIRE ---")
        for pdf_path in pdf_paths:
            text_parts.append(f"Lis le fichier {pdf_path} (pages 1-5) avec l'outil Read.")

    return "\n".join(text_parts)


# ══════════════════════════════════════════════════════════════════════════════
# PDF download & extraction
# ══════════════════════════════════════════════════════════════════════════════

def download_pdf(url: str, dest_path: str) -> bool:
    """Télécharge un PDF vers un fichier local. Retourne True si succès."""
    try:
        r = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        with open(dest_path, "wb") as f:
            f.write(r.content)
        log.info(f"  PDF téléchargé: {len(r.content)//1024}Ko → {dest_path}")
        return True
    except Exception as e:
        log.warning(f"Erreur téléchargement PDF {url}: {e}")
        return False


# ══════════════════════════════════════════════════════════════════════════════
# Extraction via CLI Claude
# ══════════════════════════════════════════════════════════════════════════════

stats = {"total": 0, "enriched": 0, "no_data": 0, "errors": 0}


def call_claude_cli(prompt: str, system_prompt: str = None, timeout: int = 180) -> str | None:
    """Appelle le CLI claude en mode print. Retourne la réponse texte ou None."""
    cmd = ["claude", "-p", "--model", MODEL, "--allowedTools", "Read,Bash", "--no-session-persistence"]
    if system_prompt:
        cmd.extend(["--system-prompt", system_prompt])

    global QUOTA_HIT
    if QUOTA_HIT:
        return None
    try:
        result = subprocess.run(
            cmd, input=prompt, capture_output=True, text=True, timeout=timeout,
        )
        if result.returncode != 0:
            err_text = (result.stderr + result.stdout).strip()
            log.error(f"CLI claude exit {result.returncode} — {err_text[:500] or '(vide)'}")
            if any(kw in err_text.lower() for kw in QUOTA_KEYWORDS):
                log.critical("⚠️  QUOTA CLI MAX ATTEINT — arrêt du batch")
                QUOTA_HIT = True
            return None
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        log.error(f"CLI claude timeout ({timeout}s)")
        return None
    except Exception as e:
        log.error(f"CLI claude exception: {e}")
        return None


def _download_pdfs(item: dict, tmp_dir: str) -> list[str]:
    """Télécharge les PDFs d'une enchère dans tmp_dir.
    Retourne la liste des chemins locaux.
    """
    PDF_TYPES_PRIORITY = ("pv", "ccv", "autre")
    pdf_paths = []
    if item.get("documents"):
        docs = item["documents"]
        if isinstance(docs, str):
            docs = json.loads(docs)
        for doc_type in PDF_TYPES_PRIORITY:
            for doc in docs:
                if doc.get("type") == doc_type:
                    dest = os.path.join(tmp_dir, f"{doc_type}_{item['id']}.pdf")
                    if download_pdf(doc["url"], dest):
                        pdf_paths.append(dest)
                    break  # un seul PDF par type
    return pdf_paths


def extract_with_claude(item: dict, with_pdfs: bool = True, dry_run: bool = False) -> dict | None:
    """Appelle le CLI claude (Opus via Max) pour extraire les données structurées.
    Télécharge les PDFs localement — Claude les lit directement (texte ou scan).
    """
    tmp_dir = tempfile.mkdtemp(prefix="encheres_")
    try:
        pdf_paths = _download_pdfs(item, tmp_dir) if with_pdfs else []
        prompt = build_prompt_text(item, pdf_paths if pdf_paths else None)

        if dry_run:
            log.info(f"[DRY-RUN] Prompt ({len(prompt)} chars, {len(pdf_paths)} PDFs)")
            return None

        full_prompt = prompt + "\n\nRetourne UNIQUEMENT le JSON, sans commentaire ni explication ni bloc markdown."
        response = call_claude_cli(full_prompt, system_prompt=build_system_prompt())

        if not response:
            return None

        # Extraire le JSON de la réponse
        text = response.strip()
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```\s*$", "", text)
        # Chercher le premier objet JSON dans la réponse
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            log.warning(f"Pas de JSON trouvé dans la réponse ({len(text)} chars)")
            return None

        data = json.loads(match.group(0))
        data = _normalize_output(data)
        return data

    except json.JSONDecodeError as e:
        log.warning(f"JSON invalide: {e}")
        return None
    except Exception as e:
        log.error(f"Erreur extraction: {e}")
        return None
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)


# Mots français à ne pas capitaliser dans les noms de villes/tribunaux
_FR_LOWERCASE = {"de", "du", "des", "le", "la", "les", "l", "en", "sur", "sous", "à", "a", "et", "lès", "lez"}

def _titlecase_fr(s: str) -> str:
    """Title case respectant les règles françaises.
    'MONT DE MARSAN' → 'Mont-de-Marsan', 'brive la gaillarde' → 'Brive-la-Gaillarde'
    """
    # Heuristique : si > 2 mots sans tiret, ajouter des tirets (noms de villes composés)
    words = s.split()
    if len(words) > 2 and "-" not in s:
        s = "-".join(words)

    parts = re.split(r"(-|\s)", s)
    result = []
    for i, part in enumerate(parts):
        if part in ("-", " "):
            result.append(part)
        elif part.lower() in _FR_LOWERCASE and i > 0:
            result.append(part.lower())
        elif part.isupper() and len(part) > 1:
            result.append(part.capitalize())
        elif part.islower():
            result.append(part.capitalize())
        else:
            result.append(part)
    return "".join(result)


def _normalize_output(data: dict) -> dict:
    """Normalisation programmatique de l'output Sonnet (gratuit, pas d'API)."""

    # Tribunal : "TJ X" / "tj x" / "Tribunal judiciaire de x" → "TJ de Ville"
    tj = data.get("tribunal")
    if tj:
        tj = tj.strip()
        # Retirer tous les préfixes connus (y compris doublons "TJ de TJ")
        tj = re.sub(r"^(?:TJ\s+de\s+)+", "", tj, flags=re.I)
        tj = re.sub(r"^(?:TJ|TGI|Tribunal de Grande Instance|Tribunal d'Instance)\s+(?:de\s+|d')?", "", tj, flags=re.I)
        tj = re.sub(r"^Tribunal\s+Judiciaire\s+(?:de\s+|d')?", "", tj, flags=re.I)
        # Nettoyer : retirer adresse, salle, étage
        tj = re.sub(r"\s*[-,]?\s*(?:\d+\s+(?:rue|avenue|place|boulevard)|salle|étage|RDC).*", "", tj, flags=re.I)
        tj = tj.strip().rstrip(",.")
        if tj:
            # Title case puis corriger les articles/prépositions français
            tj = _titlecase_fr(tj)
            # Contractions françaises : "de Le" → "du", "de Les" → "des", "de Des" → "des"
            prefix = "TJ de "
            if re.match(r"^Les?\s", tj):
                # "Le Mans" → "du Mans", "Les Sables" → "des Sables"
                if tj.startswith("Le "):
                    prefix = "TJ du "
                    tj = tj[3:]
                elif tj.startswith("Les "):
                    prefix = "TJ des "
                    tj = tj[4:]
            elif re.match(r"^Des?\s", tj):
                # "Des Sables" (erreur source) → "des Sables"
                prefix = "TJ des "
                tj = tj[4:]
            data["tribunal"] = prefix + tj
        else:
            data["tribunal"] = None

    # Ville : normaliser casse "TOURS" → "Tours", "SAINT JEAN DE VEDAS" → "Saint-Jean-de-Védas"
    ville = data.get("ville")
    if ville:
        ville = ville.strip()
        ville = re.sub(r"\s*\d{5}\s*", "", ville)  # retirer CP incrusté
        ville = re.sub(r"\s+[Cc]edex.*", "", ville)  # retirer Cedex
        ville = _titlecase_fr(ville)
        data["ville"] = ville

    # Département : "44" → laisser (on ne peut pas deviner le nom), mais nettoyer
    dept = data.get("departement")
    if dept:
        dept = dept.strip().rstrip(",.")
        data["departement"] = dept

    # Code postal : garder uniquement 5 chiffres
    cp = data.get("code_postal")
    if cp:
        m = re.search(r"\d{5}", str(cp))
        data["code_postal"] = m.group(0) if m else None

    # Type bien : normaliser
    type_map = {
        "studio": "Appartement", "duplex": "Appartement", "triplex": "Appartement",
        "pavillon": "Maison", "villa": "Maison", "propriété": "Maison",
        "corps de ferme": "Maison", "ferme": "Maison",
        "commerce": "Local commercial", "boutique": "Local commercial",
        "garage": "Parking", "box": "Parking",
    }
    tb = data.get("type_bien")
    if tb:
        normalized = type_map.get(tb.lower(), tb)
        if normalized not in ("Appartement", "Maison", "Immeuble", "Terrain", "Local commercial", "Parking", "Bureau", "Mixte", "Autre"):
            normalized = "Autre"
        data["type_bien"] = normalized

    # Avocat : normalisation complète
    avocat = data.get("avocat_nom")
    if avocat:
        avocat = avocat.strip()
        # Retirer préfixes "Maître", "Me", etc.
        avocat = re.sub(r"^(?:Ma[îi]tre|Me|Mtre|M[eE]\.?)\s+", "", avocat)
        # Si le nom contient "Cabinet" ou "SCP" ou "SELARL" → c'est un cabinet, pas un nom
        if re.match(r"^(?:Cabinet|SCP|SELARL|AARPI|S\.C\.P)", avocat, re.I):
            if not data.get("avocat_cabinet"):
                data["avocat_cabinet"] = avocat
            data["avocat_nom"] = None
        else:
            # Séparer "Prénom Nom, du Cabinet XXX" ou "Prénom Nom, membre de..."
            m = re.match(r"^(.+?)\s*[,]\s*(?:du\s+|de\s+la\s+|membre\s+)", avocat, re.I)
            if m:
                rest = avocat[m.end():]
                avocat = m.group(1).strip()
                # Extraire le cabinet du reste
                if not data.get("avocat_cabinet") and rest:
                    cab = re.sub(r"^(?:cabinet|selarl|scp|aarpi)\s+", "", rest, flags=re.I).strip()
                    if cab:
                        data["avocat_cabinet"] = cab
            # Retirer "Avocats", "Avocat" en fin
            avocat = re.sub(r"\s*Avocats?\s*$", "", avocat, flags=re.I)
            # Normaliser la casse : "GERRIET" → "Gerriet", mais garder "Jean-Pierre"
            parts = avocat.split()
            normalized = []
            for p in parts:
                if p.isupper() and len(p) > 2:
                    normalized.append(p.capitalize())
                else:
                    normalized.append(p)
            data["avocat_nom"] = " ".join(normalized)

    # Avocat cabinet : nettoyer
    cabinet = data.get("avocat_cabinet")
    if cabinet:
        cabinet = cabinet.strip()
        # Retirer adresse/CP/ville en fin
        cabinet = re.sub(r"\s*[-,]\s*\d{1,3}\s+(?:rue|avenue|boulevard|place|bd).*", "", cabinet, flags=re.I)
        cabinet = re.sub(r"\s*[-,]\s*\d{5}\s+\w.*", "", cabinet)
        cabinet = re.sub(r"\s*Avocats?\s*$", "", cabinet, flags=re.I)
        cabinet = cabinet.strip().rstrip(",.-")
        data["avocat_cabinet"] = cabinet if cabinet else None

    # Avocat tel : normaliser format "01 23 45 67 89"
    tel = data.get("avocat_tel")
    if tel:
        digits = re.sub(r"\D", "", tel)
        if digits.startswith("33") and len(digits) == 11:
            digits = "0" + digits[2:]
        if len(digits) == 10:
            data["avocat_tel"] = " ".join([digits[i:i+2] for i in range(0, 10, 2)])
        else:
            data["avocat_tel"] = tel.strip().rstrip("-.,")

    # Occupation : normaliser
    occ = data.get("occupation")
    if occ:
        occ_lower = occ.lower().strip()
        occ_map = {"libre": "libre", "vacant": "libre", "inoccupé": "libre",
                    "inoccupée": "libre", "vacante": "libre", "inoccupe": "libre",
                    "occupé": "occupe", "occupe": "occupe", "occupée": "occupe",
                    "occupee": "occupe",
                    "loué": "loue", "loue": "loue", "louée": "loue", "louee": "loue",
                    "nc": "NC", "non communiqué": "NC", "non précisé": "NC",
                    "mixte": "occupe", "": "NC"}
        if occ_lower in occ_map:
            data["occupation"] = occ_map[occ_lower]
        elif "libre" in occ_lower or "vacant" in occ_lower or "inoccup" in occ_lower:
            data["occupation"] = "libre"
        elif "loué" in occ_lower or "loue" in occ_lower or "bail" in occ_lower:
            data["occupation"] = "loue"
        elif "occup" in occ_lower:
            data["occupation"] = "occupe"
        else:
            data["occupation"] = "NC"

    # DPE : lettre majuscule A-G
    dpe = data.get("dpe")
    if dpe:
        dpe = str(dpe).strip().upper()
        data["dpe"] = dpe if dpe in "ABCDEFG" and len(dpe) == 1 else None

    return data




def _auto_log_example(item: dict, corrected_data: dict, fields_corrected: list):
    """Ajoute automatiquement un exemple au fichier learning quand l'auto-correction réussit."""
    corrected_values = {f: corrected_data.get(f) for f in fields_corrected if corrected_data.get(f)}
    if not corrected_values:
        return

    learning = load_learning_examples()
    # Limiter à 50 exemples max pour ne pas exploser le prompt
    if len(learning) >= 50:
        return

    learning_path = Path(__file__).parent / "encheres_learning.json"
    try:
        data = json.loads(learning_path.read_text(encoding="utf-8")) if learning_path.exists() else {"version": 1, "examples": []}
        data["examples"].append({
            "note": f"Auto-corrigé: {', '.join(fields_corrected)} (ID {item.get('id')})",
            "input_summary": f"{item.get('source', '?')}, {item.get('type_bien') or '?'} à {corrected_data.get('ville') or item.get('ville') or '?'}, MAP {item.get('mise_a_prix') or '?'}€",
            "expected_output": corrected_values,
        })
        learning_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        log.info(f"  Exemple auto-logué ({len(data['examples'])} total)")
    except Exception as e:
        log.warning(f"  Erreur log exemple: {e}")


def process_enchere(enchere_id: int, with_pdfs: bool = True, dry_run: bool = False):
    """Traite une enchère : extraction Sonnet → mise à jour toutes les colonnes texte."""
    c = get_client()
    if not c:
        return

    now = datetime.now(timezone.utc).isoformat()

    try:
        r = c.table(TABLE).select("*").eq("id", enchere_id).limit(1).execute()
        if not r.data:
            return
        item = r.data[0]

        # Skip si pas de description (raw_text)
        if not item.get("description") or len(item.get("description", "")) < 30:
            c.table(TABLE).update({
                "enrichissement_statut": "no_data",
                "enrichissement_date": now,
            }).eq("id", enchere_id).execute()
            stats["no_data"] += 1
            stats["total"] += 1
            return

        data = extract_with_claude(item, with_pdfs=with_pdfs, dry_run=dry_run)

        if dry_run:
            stats["total"] += 1
            return

        if not data:
            status = "echec_quota" if QUOTA_HIT else "echec"
            c.table(TABLE).update({
                "enrichissement_statut": status,
                "enrichissement_date": now,
            }).eq("id", enchere_id).execute()
            stats["errors"] += 1
            stats["total"] += 1
            return

        # ── Construire l'update ──────────────────────────────────────────
        update = {
            "enrichissement_statut": "ok",
            "enrichissement_date": now,
            "enrichissement_data": json.dumps(data, ensure_ascii=False),
        }

        # Sonnet est AUTORITAIRE sur ces champs — écrase toujours
        AUTHORITATIVE = {
            "ville": "ville",
            "tribunal": "tribunal",
            "type_bien": "type_bien",
            "occupation": "occupation",
            "description_propre": "description_resume",  # résumé Sonnet dans colonne dédiée (ne PAS écraser description originale)
            "code_postal": "code_postal",
            "departement": "departement",
            "adresse_complete": "adresse",
            "avocat_nom": "avocat_nom",
            "avocat_cabinet": "avocat_cabinet",
            "avocat_tel": "avocat_tel",
            "avocat_email": "avocat_email",
        }
        for sonnet_key, db_key in AUTHORITATIVE.items():
            val = data.get(sonnet_key)
            if val and val != "NC" and val != "Autre":
                update[db_key] = val

        # Champs complétés si absents en base
        FILL_IF_NULL = {
            "surface": "surface",
            "nb_pieces": "nb_pieces",
            "nb_lots": "nb_lots",
            "nb_chambres": "nb_chambres",
            "etat_interieur": "etat_interieur",
            "dpe": "dpe",
            "annee_construction": "annee_construction",
        }
        for sonnet_key, db_key in FILL_IF_NULL.items():
            val = data.get(sonnet_key)
            if val is not None and not item.get(db_key):
                update[db_key] = val

        # Loyer (si occupation = loué et loyer détecté)
        if data.get("loyer_mensuel") and not item.get("loyer"):
            update["loyer"] = data["loyer_mensuel"]

        # Frais préalables (garde-fou : si > 50% de la MAP, c'est probablement la créance)
        if data.get("frais_prealables") and not item.get("frais_prealables"):
            frais = data["frais_prealables"]
            map_ = item.get("mise_a_prix") or 0
            if map_ > 0 and frais > map_ * 0.5:
                log.warning(f"  Frais préalables suspects ({frais}€ vs MAP {map_}€) — ignoré (probable créance)")
                data["frais_prealables"] = None
            else:
                update["frais_prealables"] = frais

        # Date visite (Sonnet extrait mieux que les regex)
        if data.get("date_visite") and not item.get("date_visite"):
            update["date_visite"] = data["date_visite"]

        # Heure audience : injecter dans date_audience si l'heure manque (00:00:00)
        if data.get("heure_audience") and item.get("date_audience"):
            da = item["date_audience"]
            if "T00:00:00" in str(da):
                heure = data["heure_audience"]
                try:
                    h, m = heure.replace("h", ":").split(":")
                    new_da = str(da).replace("T00:00:00", f"T{int(h):02d}:{int(m):02d}:00")
                    update["date_audience"] = new_da
                except Exception:
                    pass

        # Lots data
        if data.get("lots_data") and not item.get("lots_data"):
            update["lots_data"] = json.dumps(data["lots_data"], ensure_ascii=False)

        # Booleans (amenities)
        for key in ["has_cave", "has_parking", "has_jardin", "has_terrasse",
                     "has_piscine", "has_ascenseur"]:
            if data.get(key) is not None:
                update[key] = data[key]

        # Score travaux déduit de etat_interieur (si pas déjà en base)
        if data.get("etat_interieur") and not item.get("score_travaux"):
            score_map = {"bon": 1, "correct": 2, "travaux légers": 3,
                         "travaux lourds": 4, "ruine": 5}
            score = score_map.get(data["etat_interieur"])
            if score:
                update["score_travaux"] = score

        c.table(TABLE).update(update).eq("id", enchere_id).execute()

        stats["enriched"] += 1
        stats["total"] += 1

    except Exception as e:
        log.error(f"Erreur traitement {enchere_id}: {e}")
        try:
            c.table(TABLE).update({
                "enrichissement_statut": "echec",
                "enrichissement_date": now,
            }).eq("id", enchere_id).execute()
        except Exception:
            pass
        stats["errors"] += 1
        stats["total"] += 1


# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════

def run(with_pdfs: bool = True, dry_run: bool = False, limit: int = None,
        reprocess: bool = False):
    """Lance l'extraction Sonnet sur les enchères non encore enrichies.
    --reprocess : re-traite aussi les "ok" existants (utile si prompt amélioré).
    """
    c = get_client()
    if not c:
        log.error("Supabase non connecté")
        return stats

    # Récupérer les enchères à traiter
    q = c.table(TABLE).select("id, source, id_source")

    if reprocess:
        # Re-traiter tout (utile après amélioration du prompt)
        q = q.order("created_at")
    else:
        # Non-enrichis + échecs (retry automatique)
        q = q.or_("enrichissement_statut.is.null,enrichissement_statut.eq.echec,enrichissement_statut.eq.echec_quota").order("created_at")

    if limit:
        q = q.limit(limit)

    r = q.execute()
    ids = [row["id"] for row in (r.data or [])]

    log.info(f"Extraction Sonnet — {len(ids)} enchères à traiter")
    log.info(f"Mode: {'DRY-RUN' if dry_run else 'PRODUCTION'} | PDFs: {'OUI' if with_pdfs else 'NON'} | Reprocess: {'OUI' if reprocess else 'NON'}")

    if not ids:
        log.info("Rien à traiter")
        return stats

    for i, eid in enumerate(ids, 1):
        try:
            process_enchere(eid, with_pdfs, dry_run)
        except Exception as e:
            log.error(f"Erreur {eid}: {e}")
        if i % 10 == 0 or i == len(ids):
            log.info(f"Progression: {i}/{len(ids)} — {json.dumps(stats)}")

    log.info(f"Terminé: {json.dumps(stats)}")
    return stats


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extraction Sonnet — enchères judiciaires")
    parser.add_argument("--no-pdfs", action="store_true", help="Désactiver l'analyse PDFs")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--reprocess", action="store_true", help="Re-traiter les enrichis existants")
    args = parser.parse_args()

    run(with_pdfs=not args.no_pdfs, dry_run=args.dry_run, limit=args.limit,
        reprocess=args.reprocess)
