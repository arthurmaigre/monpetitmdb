"""
batch_encheres_extraction.py — Extraction IA (Sonnet) pour les enchères judiciaires

Sonnet est la SOURCE AUTORITAIRE pour toutes les colonnes texte.
Le scraping ne fournit que les données fiables (prix, dates, GPS, URLs).
Sonnet lit le raw_text + PDFs et peuple proprement toutes les colonnes structurées.

Usage :
  python batch_encheres_extraction.py                     # Texte + PDFs
  python batch_encheres_extraction.py --no-pdfs            # Texte seul (moins cher)
  python batch_encheres_extraction.py --limit 10
  python batch_encheres_extraction.py --reprocess          # Re-traiter les "ok" existants
  python batch_encheres_extraction.py --dry-run
"""
import os, sys, json, logging, time, argparse, re
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
# Prompt Sonnet — SOURCE AUTORITAIRE pour toutes les colonnes texte
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


def build_user_message(item: dict, pdf_texts: list[str] = None, pdf_images: list[str] = None) -> list:
    """Construit le message utilisateur pour Sonnet.
    Retourne une liste de content blocks (texte + images si scans).
    """
    text_parts = []
    text_parts.append(f"Source : {item.get('source', '?')}")
    text_parts.append(f"URL : {item.get('url', '?')}")

    if item.get("description"):
        text_parts.append(f"\n--- TEXTE BRUT SCRAPÉ ---\n{item['description']}")

    if pdf_texts:
        for i, pdf_text in enumerate(pdf_texts, 1):
            text_parts.append(f"\n--- DOCUMENT PDF {i} ---\n{pdf_text}")

    content = [{"type": "text", "text": "\n".join(text_parts)}]

    # Ajouter les images PDF (scans) pour Sonnet vision
    if pdf_images:
        content[0]["text"] += "\n\n--- PAGES PDF SCANNÉES CI-DESSOUS (images) ---"
        for img_b64 in pdf_images:
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/jpeg",
                    "data": img_b64,
                }
            })

    return content


# ══════════════════════════════════════════════════════════════════════════════
# PDF download & extraction
# ══════════════════════════════════════════════════════════════════════════════

def download_pdf_text(url: str) -> str | None:
    """Télécharge un PDF et en extrait le texte. Retourne None si scan (images)."""
    try:
        r = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        try:
            import pdfplumber
            import io
            with pdfplumber.open(io.BytesIO(r.content)) as pdf:
                text_parts = []
                for page in pdf.pages[:10]:
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


def download_pdf_images(url: str, max_pages: int = 3) -> list[str] | None:
    """Télécharge un PDF scan et retourne les premières pages en base64 (pour Sonnet vision).
    Utilisé en fallback quand pdfplumber ne retourne pas de texte.
    """
    try:
        import base64
        r = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        try:
            import pypdfium2 as pdfium
            import io
            pdf = pdfium.PdfDocument(io.BytesIO(r.content))
            images_b64 = []
            for i in range(min(len(pdf), max_pages)):
                page = pdf[i]
                bitmap = page.render(scale=2)  # 2x pour lisibilité
                pil_image = bitmap.to_pil()
                buf = io.BytesIO()
                pil_image.save(buf, format="JPEG", quality=80)
                images_b64.append(base64.b64encode(buf.getvalue()).decode("utf-8"))
            return images_b64 if images_b64 else None
        except ImportError:
            log.warning("pypdfium2 non installé — pip install pypdfium2")
            return None
    except Exception as e:
        log.warning(f"Erreur conversion PDF images {url}: {e}")
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


# Tous les champs attendus dans l'output Sonnet
ALL_EXPECTED_FIELDS = [
    "type_bien", "surface", "nb_pieces", "nb_chambres", "nb_lots", "etage",
    "occupation", "loyer_mensuel", "profil_locataire",
    "etat_interieur", "dpe", "annee_construction",
    "has_cave", "has_parking", "has_jardin", "has_terrasse", "has_piscine", "has_ascenseur",
    "tribunal", "adresse_complete", "code_postal", "ville", "departement",
    "avocat_nom", "avocat_cabinet", "avocat_tel",
    "frais_prealables", "lots_data", "description_propre",
]

VALIDATION_PROMPT = """Voici le JSON extrait d'une enchère judiciaire. Vérifie la COHÉRENCE et le FORMAT de TOUS les champs. Ne relis PAS les sources, analyse UNIQUEMENT ce JSON.

{first_result}

Contrôles :
1. TRIBUNAL : format exact "Tribunal Judiciaire de Ville" (majuscule initiale). Ne doit PAS contenir d'adresse, salle, étage.
2. VILLE : nom propre avec accents et tirets. Pas de MAJUSCULES, pas de "Cedex", pas de code postal dedans.
3. CODE_POSTAL : exactement 5 chiffres. Cohérent avec la ville et le département.
4. DEPARTEMENT : nom complet ("Loire-Atlantique", pas "44"). Cohérent avec le code postal.
5. TYPE_BIEN : valeur parmi Appartement/Maison/Immeuble/Terrain/Local commercial/Parking/Bureau/Mixte/Autre. Cohérent avec surface/nb_pieces.
6. SURFACE : float en m² habitables. >500m² suspect pour un appartement. null vaut mieux qu'une valeur douteuse terrain.
7. OCCUPATION : uniquement "libre", "occupe", "loue" ou "NC". Pas d'interprétation.
8. AVOCAT_NOM : sans "Maître"/"Me"/"Mtre" en préfixe. Juste le nom.
9. AVOCAT_TEL : format "0X XX XX XX XX" si présent.
10. FRAIS_PREALABLES : nombre > 0 si présent. Pas de texte.
11. DESCRIPTION_PROPRE : résumé court (2-3 phrases), pas de texte juridique brut ni de navigation web.
12. NB_PIECES / NB_CHAMBRES : entiers positifs, cohérents entre eux (chambres < pièces).
13. DPE : lettre A-G uniquement.
14. ANNEE_CONSTRUCTION : entier 4 chiffres entre 1600 et 2026.
15. LOYER_MENSUEL : nombre > 0, cohérent avec la surface (pas 50€ pour 100m²).
16. ADRESSE_COMPLETE : adresse du BIEN, pas de l'avocat ni du tribunal.

Retourne UNIQUEMENT une liste JSON des problèmes trouvés. Chaque problème au format "champ: description du problème".
Si AUCUN problème, retourne une liste vide [].

Exemples de réponses :
["tribunal: manquant", "ville: en majuscules TOURS au lieu de Tours", "surface: 1699 semble être un terrain pas une surface habitable"]
ou
[]"""


def _get_pdf_data(item: dict) -> tuple[list[str], list[dict]]:
    """Télécharge et extrait le contenu des PDFs.
    Retourne (pdf_texts, pdf_images).
    - pdf_texts : liste de strings (texte extrait par pdfplumber)
    - pdf_images : liste de dicts {"type": "image", "data": base64} pour Sonnet vision (fallback scans)
    """
    PDF_TYPES_PRIORITY = ("pv", "ccv", "autre")
    pdf_texts = []
    pdf_images = []
    if item.get("documents"):
        docs = item["documents"]
        if isinstance(docs, str):
            docs = json.loads(docs)
        for doc_type in PDF_TYPES_PRIORITY:
            for doc in docs:
                if doc.get("type") == doc_type:
                    # Essayer le texte d'abord
                    text = download_pdf_text(doc["url"])
                    if text and len(text) > 100:
                        pdf_texts.append(text[:10000])
                        log.info(f"  PDF {doc_type} texte: {len(text)} chars")
                    else:
                        # Fallback : convertir en images (scan)
                        images = download_pdf_images(doc["url"], max_pages=3)
                        if images:
                            pdf_images.extend(images)
                            log.info(f"  PDF {doc_type} scan: {len(images)} pages (vision)")
                    break
    return pdf_texts, pdf_images


def extract_with_sonnet(item: dict, with_pdfs: bool = True, dry_run: bool = False) -> dict | None:
    """Appelle Sonnet pour extraire les données structurées.
    Pass 1 : extraction complète.
    Pass 2 : validation + correction de TOUS les champs (qualité, cohérence, champs manquants).
    """
    pdf_texts, pdf_images = _get_pdf_data(item) if with_pdfs else ([], [])
    user_content = build_user_message(item, pdf_texts if pdf_texts else None, pdf_images if pdf_images else None)

    if dry_run:
        text_len = sum(len(b.get("text", "")) for b in user_content if b["type"] == "text")
        img_count = sum(1 for b in user_content if b["type"] == "image")
        log.info(f"[DRY-RUN] Prompt ({text_len} chars, {img_count} images)")
        return None

    try:
        ai_client = get_anthropic_client()

        # ── Pass 1 : extraction ──────────────────────────────────────
        response = ai_client.messages.create(
            model=MODEL,
            max_tokens=MAX_TOKENS,
            system=build_system_prompt(),
            messages=[{"role": "user", "content": user_content}],
        )
        text = response.content[0].text.strip()
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        data = json.loads(text)

        # ── Normalisation programmatique (gratuit, pas d'appel API) ──
        data = _normalize_output(data)

        return data
    except json.JSONDecodeError as e:
        log.warning(f"JSON invalide: {e}")
        return None
    except Exception as e:
        log.error(f"Erreur Sonnet: {e}")
        return None


def _normalize_output(data: dict) -> dict:
    """Normalisation programmatique de l'output Sonnet (gratuit, pas d'API)."""

    # Tribunal : "TJ X" / "tj x" / "Tribunal judiciaire de x" → "Tribunal Judiciaire de X"
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
            data["tribunal"] = f"TJ de {tj.title()}"
        else:
            data["tribunal"] = None

    # Ville : normaliser casse "TOURS" → "Tours", "saint jean" → "Saint-Jean"
    ville = data.get("ville")
    if ville:
        ville = ville.strip()
        ville = re.sub(r"\s*\d{5}\s*", "", ville)  # retirer CP incrusté
        ville = re.sub(r"\s+[Cc]edex.*", "", ville)  # retirer Cedex
        if ville.isupper() or ville.islower():
            ville = ville.title()
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
        occ_map = {"libre": "libre", "vacant": "libre", "inoccupé": "libre",
                    "occupé": "occupe", "occupe": "occupe", "occupee": "occupe",
                    "loué": "loue", "loue": "loue", "louée": "loue",
                    "nc": "NC", "": "NC"}
        data["occupation"] = occ_map.get(occ.lower().strip(), occ)

    # DPE : lettre majuscule A-G
    dpe = data.get("dpe")
    if dpe:
        dpe = str(dpe).strip().upper()
        data["dpe"] = dpe if dpe in "ABCDEFG" and len(dpe) == 1 else None

    return data


def _validation_pass(first_result: dict) -> list:
    """Pass 2 : contrôle qualité du JSON → retourne uniquement la liste des issues."""
    try:
        prompt = VALIDATION_PROMPT.format(first_result=json.dumps(first_result, ensure_ascii=False, indent=2))

        ai_client = get_anthropic_client()
        response = ai_client.messages.create(
            model=MODEL,
            max_tokens=300,
            system="Retourne UNIQUEMENT une liste JSON de strings. Pas de commentaire.",
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text.strip()
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```\s*$", "", text)
        match = re.search(r"\[[\s\S]*\]", text)
        if not match:
            return []
        return json.loads(match.group(0))
    except Exception as e:
        log.warning(f"  Pass 2 échoué: {e}")
        return []


def _targeted_retry(item: dict, missing_fields: list, pdf_texts: list) -> dict | None:
    """Pass 3 : relit les sources UNIQUEMENT pour les champs manquants critiques."""
    field_instructions = {
        "tribunal": 'TRIBUNAL : cherche "Tribunal Judiciaire de", "TJ", "TGI", "devant le tribunal". Format exact : "Tribunal Judiciaire de Ville".',
        "ville": "VILLE : cherche le code postal 5 chiffres suivi du nom de commune, ou l'adresse du bien (PAS celle de l'avocat). Format : nom propre avec accents et tirets.",
        "type_bien": 'TYPE_BIEN : cherche "appartement", "maison", "immeuble", "terrain", "local", "parking", "studio" dans la description.',
        "frais_prealables": 'FRAIS_PREALABLES : cherche "frais préalables", "frais de poursuite", "frais taxés", "montant des frais". C\'est un montant en euros, souvent dans le CCV.',
    }
    instructions = "\n".join(field_instructions[f] for f in missing_fields if f in field_instructions)

    try:
        parts = [f"Cherche SPÉCIFIQUEMENT ces informations dans le texte ci-dessous :\n{instructions}\n\nRetourne un JSON avec uniquement les champs trouvés. null si introuvable."]
        if item.get("description"):
            parts.append(f"\n--- TEXTE ---\n{item['description'][:2000]}")
        for i, pdf_text in enumerate(pdf_texts, 1):
            parts.append(f"\n--- PDF {i} ---\n{pdf_text[:4000]}")

        ai_client = get_anthropic_client()
        response = ai_client.messages.create(
            model=MODEL,
            max_tokens=300,
            system="Retourne UNIQUEMENT du JSON valide.",
            messages=[{"role": "user", "content": "\n".join(parts)}],
        )
        text = response.content[0].text.strip()
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```\s*$", "", text)
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            return None
        return json.loads(match.group(0))
    except Exception as e:
        log.warning(f"  Pass 3 échoué: {e}")
        return None


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
            with lock:
                stats["no_data"] += 1
                stats["total"] += 1
            return

        data = extract_with_sonnet(item, with_pdfs=with_pdfs, dry_run=dry_run)

        if dry_run:
            with lock:
                stats["total"] += 1
            return

        if not data:
            c.table(TABLE).update({
                "enrichissement_statut": "echec",
                "enrichissement_date": now,
            }).eq("id", enchere_id).execute()
            with lock:
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
            "description_propre": "description",  # remplace le raw_text par le résumé propre
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

        # Frais préalables
        if data.get("frais_prealables") and not item.get("frais_prealables"):
            update["frais_prealables"] = data["frais_prealables"]

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

        with lock:
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
        with lock:
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
        # Seulement les non-enrichis
        q = q.is_("enrichissement_statut", "null").order("created_at")

    if limit:
        q = q.limit(limit)

    r = q.execute()
    ids = [row["id"] for row in (r.data or [])]

    log.info(f"Extraction Sonnet — {len(ids)} enchères à traiter")
    log.info(f"Mode: {'DRY-RUN' if dry_run else 'PRODUCTION'} | PDFs: {'OUI' if with_pdfs else 'NON'} | Reprocess: {'OUI' if reprocess else 'NON'}")

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
    parser.add_argument("--no-pdfs", action="store_true", help="Désactiver l'analyse PDFs")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--reprocess", action="store_true", help="Re-traiter les enrichis existants")
    args = parser.parse_args()

    run(with_pdfs=not args.no_pdfs, dry_run=args.dry_run, limit=args.limit,
        reprocess=args.reprocess)
