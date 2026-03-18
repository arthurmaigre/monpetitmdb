"""
Scraper MDB v5 — Supabase uniquement
Biens occupés — 7 métropoles × N stratégies

MODES :
  --init           scraping complet (toutes les annonces)
  (défaut)         mode HEBDO (nouvelles annonces 7j + vérification statuts)

FILTRE MÉTROPOLES :
  --metropoles Nantes Paris    scrape uniquement ces métropoles
  (défaut)                     toutes les métropoles

Usage :
    python scraper_supabase_prod.py                          → HEBDO toutes métropoles
    python scraper_supabase_prod.py --init                   → INIT toutes métropoles
    python scraper_supabase_prod.py --init --metropoles Nantes Lyon
    python scraper_supabase_prod.py --metropoles Paris       → HEBDO Paris uniquement
"""

import asyncio
import random
import re
import json
import logging
import datetime
import os
import sys
from pathlib import Path

# ─────────────────────────────────────────────
# MODE : INIT ou HEBDO
# ─────────────────────────────────────────────

MODE_INIT = "--init" in sys.argv  # True = scraping complet, False = hebdomadaire

# Filtre métropoles : --metropoles Nantes Paris Lyon (défaut = toutes)
_idx = sys.argv.index("--metropoles") if "--metropoles" in sys.argv else -1
METROPOLES_FILTRE = []
if _idx >= 0:
    for _a in sys.argv[_idx+1:]:
        if _a.startswith("--"):
            break
        METROPOLES_FILTRE.append(_a)

# ─────────────────────────────────────────────
# ENVIRONNEMENT
# ─────────────────────────────────────────────

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env")
except ImportError:
    pass

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
SUPABASE_URL      = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY      = os.getenv("SUPABASE_KEY", "")
CAPSOLVER_KEY     = os.getenv("CAPSOLVER_KEY", "")
IPROYAL_USER      = os.getenv("IPROYAL_USER", "")
IPROYAL_PASS      = os.getenv("IPROYAL_PASS", "")

try:
    import capsolver
    capsolver.api_key = CAPSOLVER_KEY
    CAPSOLVER_AVAILABLE = bool(CAPSOLVER_KEY)
except ImportError:
    CAPSOLVER_AVAILABLE = False

try:
    import anthropic as anthropic_sdk
    ANTHROPIC_CLIENT = anthropic_sdk.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None
except ImportError:
    ANTHROPIC_CLIENT = None

import supabase_client as supa
supa.SUPABASE_URL = SUPABASE_URL
supa.SUPABASE_KEY = SUPABASE_KEY
supa._client      = None

from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────

BASE_DIR       = Path(__file__).parent
LOG_PATH       = BASE_DIR / "scraper.log"
PROGRESS_PATH  = BASE_DIR / "progress.json"
LEARNING_PATH  = BASE_DIR / "ai_learning.json"
CHROME_PROFILE = BASE_DIR / "chrome_profile"

SAVE_EVERY        = 1        # upsert Supabase à chaque annonce retenue

# ── Proxy IPRoyal résidentiel ──
# Chargé depuis .env : IPROYAL_USER=xxx_country-fr / IPROYAL_PASS=xxx
# Actif automatiquement si les variables sont présentes (VPS)
# Absent = IP directe (PC Windows avec IP résidentielle)
PROXY_CONFIG = None
if IPROYAL_USER and IPROYAL_PASS:
    # IP whitelistée sur IPRoyal — pas besoin de credentials
    PROXY_CONFIG = {
        "server": "http://geo.iproyal.com:12321",
    }

# ── Délais humains ──
DELAY_MIN = 3.0   # Délai entre pages résultats (anti-détection)
DELAY_MAX = 7.0   # Leboncoin tolère mieux des navigations espacées

# ── Phase 3 : seuils de vérification statut ──
PHASE3_SEUIL_RECENTES_JOURS      = 7    # annonces > 7j  : arrêt pagination en mode HEBDO
PHASE3_SEUIL_TROP_RECENTES_JOURS = 7    # annonces < 7j  : pas vérifiées en phase 3
PHASE3_SEUIL_FREQUENTES_JOURS    = 120  # annonces < 4 mois : vérifiées à chaque run
PHASE3_SEUIL_ESPACEES_JOURS      = 180  # annonces < 6 mois : vérifiées si dernière vérif > 15j
PHASE3_DELAI_ESPACEES_JOURS      = 15   # délai minimum entre vérifs (4-6 mois)
PHASE3_DELAI_RARES_JOURS         = 30   # délai minimum entre vérifs (> 6 mois)

# ── Communes et mots-clés ──
# Format URL Leboncoin :
# locations=NomVille__LAT_LNG_INSEE_RAYON
# Exemples préconfigurés pour les 10 grandes métropoles françaises
# ⚠️  Les paramètres GPS/INSEE doivent être récupérés manuellement sur Leboncoin
# pour chaque ville (filtrer par ville → copier l'URL générée)

COMMUNES = {
    # Format : "Métropole": "NomVille__LAT_LNG_INSEE_RAYON"
    "Nantes":    "Nantes__47.21972460703553_-1.5396709042358398_44109_10000",
    "Paris":     "Paris__48.86017419624389_2.337177366534126_9370_20000",
    "Lyon":      "Lyon__45.76053450713997_4.835562580016857_7308_10000",
    "Marseille": "Marseille__43.29913187499456_5.386161307537629_10000_10000",
    "Bordeaux":  "Bordeaux__44.85027430275702_-0.5749636855863279_9036_5000",
    "Toulouse":  "Toulouse__43.599373754597394_1.435619856703149_9864_5000",
    "Rennes":    "Rennes__48.10984729898359_-1.6674973472410701_6275_5000",
}

KEYWORDS = {
    "Locataire en place": [
        "locataire en place",
        "vendu loué",
        "bail en cours",
        # "loyer en place",    # ❌ supprimé — taux faible
        # "bien loué occupé",  # ❌ supprimé — taux faible
    ],
    "Travaux lourds": [
        # Tier 1 — haute précision
        "à rénover",
        "gros travaux",
        "à remettre en état",
        "rénovation complète",
        "tout à refaire",
        "vendu en l'état",
        "succession",
        # Tier 2 — bonne précision
        "travaux importants",
        "à réhabiliter",
        "DPE G",
        "toiture à refaire",
        "humidité",
        "mise aux normes",
    ],
}

# Stratégies disponibles pour le menu de sélection
STRATEGIES_DISPONIBLES = list(KEYWORDS.keys())

# ─────────────────────────────────────────────
# LOGGING
# ─────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_PATH, encoding="utf-8"),
        logging.StreamHandler()
    ]
)
for lib in ["httpx", "httpcore", "httpcore.http11", "httpcore.http2",
            "httpcore.connection", "supabase", "postgrest", "realtime", "gotrue"]:
    logging.getLogger(lib).setLevel(logging.WARNING)
log = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# FICHIER DE PROGRESSION UNIFIÉ
# ─────────────────────────────────────────────
# Structure du fichier progress.json :
# {
#   "phase1": {
#     "done_keys": ["kw|Nantes", ...],   ← combinaisons kw×ville terminées sans blocage
#     "failed_keys": ["kw|Paris", ...],  ← combinaisons bloquées (à retraiter)
#     "urls": [...],                     ← toutes les URLs collectées
#     "url_to_kw": {...},
#     "url_to_commune": {...},
#     "kw_stats": {...},
#     "complete": false                  ← true quand toutes les combis sont done sans erreur
#   },
#   "phase2": {
#     "todo": [...],     ← URLs à analyser
#     "done": [...],     ← URLs analysées avec succès (bien occupé ou non)
#     "captcha": [...],  ← URLs bloquées captcha/cloudflare
#     "failed": [...],   ← URLs en erreur (timeout, crash)
#     "complete": false  ← true quand todo vide ET captcha+failed vides
#   }
# }

def load_progress() -> dict:
    if PROGRESS_PATH.exists():
        try:
            with open(PROGRESS_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            log.warning(f"Impossible de charger progress.json : {e}")
    return _empty_progress()

def _empty_progress() -> dict:
    return {
        "phase1": {
            "done_keys": [], "failed_keys": [],
            "urls": [], "url_to_kw": {}, "url_to_commune": {}, "kw_stats": {},
            "complete": False
        },
        "phase2": {
            "todo": [], "done": [], "captcha": [], "failed": [],
            "complete": False
        }
    }

def save_progress(prog: dict):
    try:
        with open(PROGRESS_PATH, "w", encoding="utf-8") as f:
            json.dump(prog, f, ensure_ascii=False, indent=2)
    except Exception as e:
        log.warning(f"Impossible de sauvegarder progress.json : {e}")

def clear_progress():
    if PROGRESS_PATH.exists():
        PROGRESS_PATH.unlink()
        log.info("progress.json supprimé")

def progress_is_clean(prog: dict) -> bool:
    """True si phase1 et phase2 sont toutes deux complètes sans erreur."""
    p1 = prog.get("phase1", {})
    p2 = prog.get("phase2", {})
    return (
        p1.get("complete", False) and
        p2.get("complete", False) and
        not p2.get("captcha") and
        not p2.get("failed")
    )

# ─────────────────────────────────────────────
# NOTIFICATION (Windows uniquement)
# ─────────────────────────────────────────────

def notify_windows(title, message):
    """Notification Windows — silencieux sur Linux/VPS."""
    if sys.platform != "win32":
        return
    try:
        script = (
            f"Add-Type -AssemblyName System.Windows.Forms; "
            f"$n = New-Object System.Windows.Forms.NotifyIcon; "
            f"$n.Icon = [System.Drawing.SystemIcons]::Information; "
            f"$n.Visible = $true; "
            f"$n.ShowBalloonTip(8000, '{title}', '{message}', "
            f"[System.Windows.Forms.ToolTipIcon]::Info); "
            f"Start-Sleep -s 10; $n.Visible = $false"
        )
        os.system(f'powershell -Command "{script}"')
    except Exception:
        pass

# ─────────────────────────────────────────────
# UTILITAIRES
# ─────────────────────────────────────────────

def rand_delay():
    return random.uniform(DELAY_MIN, DELAY_MAX)

def extract_number(text):
    if not text:
        return None
    cleaned = re.sub(r"[^\d,.]", "", text.replace(" ", "").replace("\u00a0", ""))
    cleaned = cleaned.replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return None

async def human_behavior(page):
    try:
        for _ in range(random.randint(1, 2)):
            await page.mouse.wheel(0, random.randint(200, 400))
            await asyncio.sleep(random.uniform(0.2, 0.5))
        await page.mouse.move(random.randint(200, 1100), random.randint(100, 600))
        await asyncio.sleep(random.uniform(0.3, 0.8))
        if random.random() < 0.2:
            await page.mouse.wheel(0, -random.randint(100, 200))
            await asyncio.sleep(random.uniform(0.2, 0.4))
    except:
        pass

# ─────────────────────────────────────────────
# DÉTECTION BIEN OCCUPÉ
# ─────────────────────────────────────────────

PATTERNS_NIVEAU1 = [
    r"locataire\s+en\s+place",
    r"vendu\s+lou[eé]",
    r"bail\s+en\s+cours",
    r"loyer\s+en\s+place",
    r"bien\s+occup[eé]\s+lou[eé]",
    r"occup[eé]\s+par\s+(un\s+)?locataire",
    r"lou[eé]\s+et\s+occup[eé]",
    r"vente\s+occup[eé]e?",
    r"lou[eé]\s+en\s+place",
]

PATTERNS_NIVEAU2 = [
    r"bail\s+(en\s+cours|actif|restant|de\s+\d+\s*ans?|commercial|en\s+vigueur)",
    r"locataire\s+(actuel|en\s+place|pr[eé]sent|en\s+cours)",
    r"lou[eé]\s+(actuellement|en\s+ce\s+moment|depuis\s+\d+)",
    r"revenus?\s+locatifs?\s+de\s+\d+",
    r"loyer\s+(actuel|en\s+cours|mensuel\s+de)\s+\d+",
    r"investissement\s+locatif\s+(avec|clé\s+en\s+main|imm[eé]diat)",
    r"rendement\s+(locatif|brut|net)\s+de\s+\d+",
    r"bien\s+lou[eé]\s+(depuis|à|avec)",
]

def is_occupied(text):
    if not text:
        return False
    t = text.lower()
    for pattern in PATTERNS_NIVEAU1 + PATTERNS_NIVEAU2:
        if re.search(pattern, t):
            return True
    return False

# ─────────────────────────────────────────────
# EXTRACTION DONNÉES LOCATIVES
# ─────────────────────────────────────────────

def extract_rent(text):
    if not text:
        return None
    t = text.lower()
    patterns = [
        r"loyer\s+(?:hors\s+charges?|hc)\s*:?\s*([\d\s]+[,.]?\d*)\s*[€e]",
        r"loyer\s+mensuel\s+(?:de\s+)?([\d\s]+[,.]?\d*)",
        r"loyer\s*:?\s*([\d\s]+[,.]?\d*)\s*[€e]",
        r"lou[eé]\s+([\d\s]+[,.]?\d*)\s*[€e]",
        r"([\d\s]+[,.]?\d*)\s*[€e]\s+charges?\s+comprises?",
    ]
    for pattern in patterns:
        m = re.search(pattern, t)
        if m:
            val = extract_number(m.group(1))
            if val and 100 < val < 10000:
                return val
    return None

def extract_charges_recup(text):
    if not text:
        return None
    t = text.lower()
    patterns = [
        r"charges?\s+r[eé]cup[eé]rables?\s*:?\s*([\d\s]+[,.]?\d*)\s*[€e]",
        r"dont\s+([\d\s]+[,.]?\d*)\s*[€e]\s+(?:de\s+)?charges?",
        r"provision\s+pour\s+charges?\s*:?\s*([\d\s]+[,.]?\d*)\s*[€e]",
    ]
    for pattern in patterns:
        m = re.search(pattern, t)
        if m:
            val = extract_number(m.group(1))
            if val and 0 < val < 1000:
                return val
    return None

def extract_taxe_fonciere(text):
    if not text:
        return None
    patterns = [
        r"taxe\s+fonci[eè]re\s*:?\s*(\d[\d\s]*)\s*[€e]",
        r"(\d[\d\s]*)\s*[€e]\s+(?:de\s+)?taxe\s+fonci[eè]re",
        r"tf\s*:?\s*(\d[\d\s]*)\s*[€e]",
    ]
    for pattern in patterns:
        m = re.search(pattern, text.lower())
        if m:
            val = extract_number(m.group(1))
            if val and 50 < val < 15000:
                return val
    return None

def extract_charges_copro(text):
    if not text:
        return None
    t = text.lower()
    patterns = [
        r"charges?\s+(?:de\s+)?copro(?:pri[eé]t[eé])?\s*:?\s*([\d\s]+[,.]?\d*)\s*[€e]\s*(?:/\s*)?([a-z]*)",
        r"([\d\s]+[,.]?\d*)\s*[€e]\s+(?:de\s+)?charges?\s+(?:de\s+)?copro([a-z]*)",
    ]
    for pattern in patterns:
        m = re.search(pattern, t)
        if m:
            val = extract_number(m.group(1))
            periodicite = m.group(2) if len(m.groups()) > 1 else ""
            if val and 0 < val < 10000:
                if "trimest" in periodicite:
                    val = round(val / 3, 2)
                elif "an" in periodicite:
                    val = round(val / 12, 2)
                if 0 < val < 2000:
                    return val
    return None

def extract_with_ai(description, dpe=None, annee=None, photo_urls=None, few_shot=""):
    """
    Extraction données locatives + scoring travaux en un seul appel Sonnet.
    photo_urls : liste limitée à 3 photos max (cover + 2 suivantes) pour le locatif.
    Retourne un dict avec données locatives ET score_travaux + score_commentaire.
    """
    if not ANTHROPIC_CLIENT or not description or len(description.strip()) < 20:
        return {}

    system_prompt = """Tu es un expert en immobilier locatif et rénovation française.
Tu analyses des annonces immobilières pour extraire deux types d'informations.

PARTIE 1 : DONNÉES LOCATIVES

RÈGLES LOYER (critiques) :
- Loyer HC : loyer seul sans charges. Signaux : "hors charges", "HC", loyer suivi de "+ X€ charges"
  Ex: "Loyer : 507€ + 36€ charges" → loyer_hc=507 / "650€ HC" → loyer_hc=650
- Loyer CC : charges incluses. Signaux : "charges comprises", "CC", "tout compris"
  Ex: "703€ charges comprises" → loyer_cc=703
- Le signe + entre loyer et charges = toujours HC. Ne jamais additionner loyer et charges.

RÈGLES CHARGES RÉCUPÉRABLES :
- Additionner TOUTES les lignes : provisions + TOM + eau + autres charges locataires
  Ex: "36€ charges + 11€ TOM" → charges_rec=47

RÈGLES DATES :
- fin_bail : uniquement au format DD/MM/YYYY. Date partielle ou approximative → null

RÈGLES PROFIL LOCATAIRE :
- Format : "statut_pro | composition | ancienneté"
- statut_pro : Salarié | Retraité | Indépendant | Etudiant | Non précisé
- composition : Seul | Couple | Famille | Colocation | Non précisé
- ancienneté : < 1 an | 1-3 ans | 3-5 ans | 5-10 ans | > 10 ans | Non précisé

PARTIE 2 : SCORE TRAVAUX

Analyse la description ET les photos pour évaluer l'état réel du bien.
Les photos de cuisine et salle de bain sont particulièrement révélatrices.
RÈGLE DU CRITÈRE DOMINANT : le signal le plus grave fixe le plancher.

Score 1 — Rafraîchissement    : logement habitable, cosmétique uniquement
Score 2 — Rénovation légère   : cuisine OU salle de bain à refaire, installations correctes
Score 3 — Rénovation complète : tous corps d'état (élec, plomberie, isolation), structure saine
Score 4 — Rénovation lourde   : structure partielle + tous corps d'état
Score 5 — Réhabilitation totale : structure entière à reprendre, bien inhabitable

Signaux déterminants :
- DPE G → score minimum 3 / DPE F → score minimum 2
- Toiture/charpente/fissures → score 4 ou 5
- Électricité + plomberie à refaire → score 3 minimum
- Humidité/infiltrations → score 3 minimum
- Photos montrant cuisine/SDB vétuste des années 70-80 → score 2 minimum
- Construction avant 1950 sans rénovation citée → monte d'un niveau"""

    user_content_text = f"""Analyse cette annonce et renvoie UNIQUEMENT un objet JSON valide.

Description : {description[:900]}
DPE : {dpe or "NC"} | Année construction : {annee or "NC"}
{few_shot}
JSON attendu (tous les champs obligatoires) :
{{
  "loyer_cc": <nombre ou null>,
  "loyer_hc": <nombre ou null>,
  "charges_rec": <nombre ou null>,
  "charges_copro_mensuel": <nombre ou null>,
  "taxe_fonciere_annuelle": <nombre ou null>,
  "fin_bail": "<DD/MM/YYYY ou null>",
  "type_bail": "<vide/meublé/commercial/null>",
  "surface_m2": <nombre ou null>,
  "profil_locataire": "<statut_pro | composition | ancienneté> ou null",
  "score_travaux": <1-5>,
  "score_commentaire": "<justification 1-2 phrases max>"
}}"""

    # Contenu multimodal : max 3 photos pour le locatif (cover + cuisine/SDB)
    content = []
    if photo_urls:
        import base64
        for purl in photo_urls[:3]:
            img_bytes = supa.fetch_photo_bytes(purl)
            if img_bytes:
                b64 = base64.standard_b64encode(img_bytes).decode()
                content.append({
                    "type": "image",
                    "source": {"type": "base64", "media_type": "image/jpeg", "data": b64}
                })
        if content:
            log.debug(f"  {len(content)} photo(s) ajoutées à l'appel Sonnet locatif")
    content.append({"type": "text", "text": user_content_text})

    try:
        message = ANTHROPIC_CLIENT.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=500,
            system=system_prompt,
            messages=[{"role": "user", "content": content}]
        )
        raw = message.content[0].text.strip()
        raw = re.sub(r"```json|```", "", raw).strip()
        return json.loads(raw)
    except Exception as e:
        log.debug(f"  IA extraction erreur : {e}")
        return {}

def extract_nb_pieces(text):
    if not text:
        return None
    t = text.lower()
    if re.search(r'\bstudio\b|\bt1\b|\bf1\b', t):
        return "T1"
    for n in range(6, 1, -1):
        if re.search(rf'\bt{n}\b|\bf{n}\b|\b{n}\s*pi[eè]ces?\b', t):
            return f"T{n}"
    return None

# ─────────────────────────────────────────────
# SCORING TRAVAUX — Pré-filtre + IA
# ─────────────────────────────────────────────

def extract_qualite_nlp(description: str, photo_urls: list = None) -> dict:
    """
    Extrait les signaux qualitatifs d'une annonce via Claude Haiku.
    Utilise pour fiabiliser l'estimation DVF avec des correcteurs.
    """
    if not ANTHROPIC_CLIENT or not description or len(description.strip()) < 30:
        return {}

    prompt = f"""Analyse cette annonce immobiliere et extrait les informations qualitatives.
Renvoie UNIQUEMENT un objet JSON valide, sans commentaire.

Description : {description[:800]}

JSON attendu :
{{
  "parking_type": "box_ferme" | "parking_ouvert" | "garage_attenant" | null,
  "has_piscine": true | false,
  "exposition": "sud" | "sud-ouest" | "sud-est" | "est" | "ouest" | "nord" | null,
  "vue": "degagee" | "mer" | "parc" | "montagne" | "vis_a_vis" | null,
  "etat_interieur": "neuf" | "refait_recemment" | "bon_etat" | "correct" | "a_rafraichir" | "a_renover",
  "jardin_etat": "soigne" | "standard" | "a_amenager" | "friche" | null,
  "has_cave": true | false,
  "has_gardien": true | false,
  "has_double_vitrage": true | false,
  "has_cuisine_equipee": true | false,
  "is_plain_pied": true | false,
  "mitoyennete": "individuelle" | "semi_mitoyen" | "mitoyen" | null,
  "has_grenier": true | false,
  "assainissement": "collectif" | "individuel" | null
}}

Regles :
- parking_type : "box_ferme" si box/garage ferme, "parking_ouvert" si place de parking, "garage_attenant" si garage de maison
- exposition : uniquement si explicitement mentionne
- vue : "degagee" si mentionne vue degagee/panoramique, "vis_a_vis" si mentionne vis-a-vis
- etat_interieur : "neuf" si neuf ou livre neuf, "refait_recemment" si renove recemment, "bon_etat" si bien entretenu, "a_rafraichir" si travaux legers, "a_renover" si gros travaux
- mitoyennete : uniquement pour les maisons. "individuelle" si detachee/isolee, "semi_mitoyen" si un cote mitoyen, "mitoyen" si deux cotes mitoyens ou maison de ville
- has_grenier : true si mentionne grenier, combles amenageables, mansarde
- assainissement : "individuel" si fosse septique ou assainissement autonome, "collectif" si tout-a-l'egout
- Si une info n'est pas dans la description, mettre null ou false"""

    content = []

    # Ajouter max 2 photos pour le standing
    if photo_urls:
        import base64
        for purl in photo_urls[:2]:
            img_bytes = supa.fetch_photo_bytes(purl)
            if img_bytes:
                b64 = base64.standard_b64encode(img_bytes).decode()
                content.append({
                    "type": "image",
                    "source": {"type": "base64", "media_type": "image/jpeg", "data": b64}
                })
        if content:
            prompt += "\n\nAnalyse aussi les photos pour evaluer le standing de l'immeuble et l'etat interieur."
            prompt += '\nAjoute au JSON : "standing_immeuble": <1-5> (1=tres bas standing, 5=haut standing/luxe)'

    content.append({"type": "text", "text": prompt})

    try:
        message = ANTHROPIC_CLIENT.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            messages=[{"role": "user", "content": content}]
        )
        raw = message.content[0].text.strip()
        raw = re.sub(r"```json|```", "", raw).strip()
        result = json.loads(raw)
        log.debug(f"  NLP qualite : {json.dumps(result, ensure_ascii=False)[:120]}")
        return result
    except Exception as e:
        log.debug(f"  NLP qualite erreur : {e}")
        return {}


def prefiltre_travaux(texte: str, dpe: str = None) -> bool:
    """
    Filtre heuristique rapide AVANT d'appeler Claude.
    Retourne True si le bien mérite un scoring IA travaux.
    """
    t = (texte or "").lower()
    signaux = [
        "rénov", "travaux", "rafraîch", "remettre en état",
        "réhabilit", "tout à refaire",
        "succession", "vendu en l'état", "à saisir",
        "humidité", "toiture", "charpente", "fissure",
        "électricité", "plomberie", "mise aux normes",
        "dpe g", "dpe f", "passoire",
        "ancien", "vétuste", "dégradé",
    ]
    if any(s in t for s in signaux):
        return True
    if dpe in ("F", "G"):
        return True
    return False


def _load_few_shot_travaux(base_dir: Path, n: int = 6) -> str:
    """
    Charge les N derniers exemples corrigés depuis ai_learning_travaux.json.
    Les corrections utilisateur (frontend → Supabase → sync) alimentent ce fichier.
    Retourne un bloc texte injecté dans le prompt Claude.
    """
    path = base_dir / "ai_learning_travaux.json"
    if not path.exists():
        return ""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        corriges = [e for e in data.get("exemples", []) if e.get("score_corrige") is not None]
        # Un exemple par niveau de score pour maximiser la diversité
        par_score = {}
        for ex in reversed(corriges):
            s = ex["score_corrige"]
            if s not in par_score:
                par_score[s] = ex
        exemples = list(par_score.values())[:n]
        if not exemples:
            return ""
        bloc = "\n\nEXEMPLES VALIDÉS (corrections utilisateur) :\n"
        for ex in exemples:
            bloc += f"---\nDescription : {ex['description'][:250]}\n"
            bloc += f"DPE : {ex.get('dpe','NC')} | Année : {ex.get('annee_construction','NC')}\n"
            bloc += f"Score correct : {ex['score_corrige']}\n"
        return bloc
    except Exception as e:
        log.debug(f"  _load_few_shot_travaux erreur : {e}")
        return ""


def _save_learning_travaux(base_dir: Path, bien_id: str, description: str,
                           dpe: str, annee: int, score_attribue: int,
                           commentaire: str):
    """
    Sauvegarde un exemple dans ai_learning_travaux.json.
    score_corrige = None → sera rempli si l'utilisateur corrige en frontend.
    Les corrections remontent via Supabase → sync → few-shot au prochain run.
    """
    path = base_dir / "ai_learning_travaux.json"
    try:
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8"))
        else:
            data = {"version": 1, "exemples": []}
        data["exemples"] = [e for e in data["exemples"] if e.get("bien_id") != bien_id]
        data["exemples"].append({
            "bien_id":            bien_id,
            "description":        (description or "")[:500],
            "dpe":                dpe,
            "annee_construction": annee,
            "score_attribue":     score_attribue,
            "score_corrige":      None,
            "commentaire":        commentaire,
            "date":               datetime.date.today().isoformat(),
        })
        data["exemples"] = data["exemples"][-500:]
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        log.debug(f"  _save_learning_travaux erreur : {e}")


def score_travaux_with_ai(base_dir: Path, description: str, dpe: str,
                          annee: int, titre: str, prix: float, surface: float,
                          photo_urls: list = None) -> tuple[int | None, str | None]:
    """
    Score le niveau de travaux via Claude API (vision + texte).
    Analyse : description + DPE + année + toutes les photos disponibles.
    Injecte automatiquement les corrections utilisateur passées (few-shot).
    Retourne : (score 1-5, commentaire) ou (None, None) si échec.
    """
    if not ANTHROPIC_CLIENT or not description:
        return None, None

    few_shot = _load_few_shot_travaux(base_dir)

    prompt_text = f"""Tu es un expert en rénovation immobilière française.
Analyse cette annonce et attribue un score de travaux de 1 à 5.

RÈGLE DU CRITÈRE DOMINANT : le signal le plus grave fixe le plancher du score.

Score 1 — Rafraîchissement    : logement habitable, cosmétique uniquement (peintures, sols)
Score 2 — Rénovation légère   : cuisine OU salle de bain à refaire, installations correctes
Score 3 — Rénovation complète : tous corps d'état (élec, plomberie, isolation), structure saine
Score 4 — Rénovation lourde   : structure partielle + tous corps d'état (planchers, charpente partielle)
Score 5 — Réhabilitation totale : structure entière à reprendre, bien inhabitable

SIGNAUX DÉTERMINANTS :
- DPE G                                            → score minimum 3
- DPE F                                            → score minimum 2
- Toiture / charpente / fissures structurelles     → score 4 ou 5
- Électricité + plomberie à refaire ensemble       → score 3 minimum
- Humidité / infiltrations importantes             → score 3 minimum
- "Succession" / "vendu en l'état" / "inhabitable" → monte d'un niveau
- Construction avant 1950 sans rénovation citée   → monte d'un niveau
- Photos montrant état dégradé visible             → confirme ou monte le score
{few_shot}
ANNONCE À ANALYSER :
Titre       : {titre or 'NC'}
Description : {(description or '')[:900]}
DPE         : {dpe or 'NC'}
Année const.: {annee or 'NC'}
Prix        : {int(prix) if prix else 'NC'}€ | Surface : {int(surface) if surface else 'NC'}m²

Réponds UNIQUEMENT en JSON sur une seule ligne :
{{"score": <1-5>, "commentaire": "<justification courte 1-2 phrases max>"}}"""

    content = []
    if photo_urls:
        import base64
        for purl in photo_urls:
            img_bytes = supa.fetch_photo_bytes(purl)
            if img_bytes:
                b64 = base64.standard_b64encode(img_bytes).decode()
                content.append({
                    "type": "image",
                    "source": {"type": "base64", "media_type": "image/jpeg", "data": b64}
                })
        if content:
            log.debug(f"  {len(content)} photo(s) ajoutées au prompt vision")
    content.append({"type": "text", "text": prompt_text})

    try:
        msg = ANTHROPIC_CLIENT.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=150,
            messages=[{"role": "user", "content": content}]
        )
        raw = re.sub(r"```json|```", "", msg.content[0].text.strip())
        result = json.loads(raw)
        score = int(result.get("score", 0))
        commentaire = str(result.get("commentaire", "")).strip()
        if not (1 <= score <= 5):
            log.warning(f"  Score hors bornes ({score}) — ignoré")
            return None, None
        log.info(f"  🔨 Score travaux : {score}/5 — {commentaire[:60]}")
        return score, commentaire
    except Exception as e:
        log.debug(f"  score_travaux_with_ai erreur : {e}")
        return None, None

def extract_etage(text):
    if not text:
        return None
    t = text.lower()
    if re.search(r'rez[- ]de[- ]chauss[eé]e|rdc\b', t):
        return "RDC"
    m = re.search(r'(\d+)[eèème]+\s+[eé]tage', t)
    if m:
        n = int(m.group(1))
        return {1: "1er", 2: "2ème", 3: "3ème"}.get(n, f"{n}ème")
    if re.search(r'dernier\s+[eé]tage', t):
        return "Dernier étage"
    return None

def extract_type_bien(titre, description):
    t = (titre + " " + description).lower()
    if re.search(r'\bmaison\b|\bpavillon\b|\bvilla\b', t):
        return "Maison"
    elif re.search(r'\bstudio\b', t):
        return "Studio"
    elif re.search(r'\bloft\b', t):
        return "Loft"
    elif re.search(r'\bappartement\b|\bappart\b', t):
        return "Appartement"
    return "Inconnu"

def is_residence_geree(titre, description):
    """Détecte les résidences gérées avec exploitant (tourisme, étudiants, seniors).
    Ces biens ont un bail commercial entre propriétaire et exploitant — hors stratégie MDB.
    Exemples : Pierre & Vacances, Nexity Studéa, Domitys, Orpéa, Maeva...
    """
    t = (titre + " " + description).lower()
    return bool(re.search(
        # Résidences tourisme / loisirs
        r"pierre.{0,5}vacances|maeva|club med|goélia|odalys|nemea|"
        r"résidence.{0,10}touristique|résidence.{0,10}tourisme|"
        r"résidence.{0,10}vacances|résidence.{0,10}loisirs|"
        r"appart.?hotel|apart.?hotel|aparthôtel|"
        # Résidences étudiantes
        r"résidence.{0,10}étudiant|résidence.{0,10}student|"
        r"nexity.{0,10}studia|studéa|studia|kley|ecla|cardinal campus|"
        # Résidences seniors / EHPAD
        r"résidence.{0,10}senior|résidence.{0,10}agée|résidence.{0,10}âgée|"
        r"domitys|orpéa|korian|medica|emera|"
        r"ehpad|maison de retraite|résidence services|"
        # Signaux exploitant génériques
        r"bail commercial|gestionnaire|exploitant|"
        r"loyer garanti.{0,20}gestionnaire|para.?hôtelier|parahôtelier|"
        r"lmnp.{0,20}géré|lmp.{0,20}géré|résidence gérée|résidence avec services",
        t
    ))

def generate_message(data):
    missing = []
    if not data.get("loyer"):       missing.append("le loyer mensuel hors charges")
    if not data.get("charges_rec"): missing.append("les charges récupérables mensuelles")
    if not data.get("bail_end"):    missing.append("la date de fin de bail")
    if not data.get("charges_cop"): missing.append("les charges de copropriété")
    if not data.get("taxe_fonc"):   missing.append("la taxe foncière annuelle")
    if not missing:
        return ""
    items = ", ".join(missing[:-1]) + (f" et {missing[-1]}" if len(missing) > 1 else missing[0])
    return (
        f"Bonjour, je suis intéressé par votre bien en vente occupé. "
        f"Afin d'étudier l'investissement, pourriez-vous m'indiquer : {items} ? "
        f"Y a-t-il des travaux de copropriété votés ou prévus ? "
        f"Le prix est-il négociable ? Je vous remercie."
    )

# ─────────────────────────────────────────────
# CAPSOLVER — Résolution captcha
# ─────────────────────────────────────────────

async def extract_turnstile_sitekey(page):
    try:
        return await page.evaluate("""
            () => {
                const iframe = document.querySelector('iframe[src*="challenges.cloudflare.com"]');
                if (iframe) {
                    const match = iframe.src.match(/sitekey=([^&]+)/);
                    if (match) return match[1];
                }
                const el = document.querySelector('[data-sitekey]');
                if (el) return el.getAttribute('data-sitekey');
                return null;
            }
        """)
    except:
        return None

async def inject_turnstile_token(page, token):
    try:
        return await page.evaluate("""
            (token) => {
                const input = document.querySelector('[name="cf-turnstile-response"]');
                if (input) { input.value = token; return true; }
                return false;
            }
        """, token)
    except:
        return False

async def resolve_datadome_captcha(page) -> bool:
    """Résout le slider captcha DataDome via Capsolver + proxy IPRoyal."""
    if not CAPSOLVER_KEY:
        log.warning('  ⚠ CAPSOLVER_KEY absent — captcha DataDome non résolu')
        return False
    if not PROXY_CONFIG:
        log.warning('  ⚠ Proxy absent — DatadomeSliderTask nécessite un proxy résidentiel')
        return False
    try:
        import aiohttp
    except ImportError:
        log.warning('  ⚠ aiohttp non installé — pip install aiohttp')
        return False

    # Détecter si DataDome est présent
    try:
        body_text = await page.inner_text('body')
        current_url = page.url
    except:
        return False

    is_datadome = any(s in body_text.lower() for s in ['datadome', 'faites glisser', 'captcha-delivery.com'])
    is_datadome = is_datadome or 'captcha-delivery.com' in current_url
    try:
        for frame in page.frames:
            if 'captcha-delivery.com' in frame.url or 'datadome' in frame.url:
                is_datadome = True
                break
    except:
        pass

    if not is_datadome:
        return False

    log.warning('  🛡 Captcha DataDome détecté — résolution via Capsolver...')

    # URL captcha — extraire depuis le HTML brut (plus fiable qu'en headless)
    captcha_url = None
    try:
        html = await page.content()
        # Chercher l'iframe DataDome dans le HTML
        import re as _re
        match = _re.search(r'src="(https://geo\.captcha-delivery\.com/captcha/[^"]+)"', html)
        if match:
            captcha_url = match.group(1).replace('&amp;', '&')
        else:
            # Fallback : chercher dans les frames
            for frame in page.frames:
                if 'captcha-delivery.com' in frame.url:
                    captcha_url = frame.url
                    break
    except:
        pass

    if not captcha_url:
        log.warning('  ⚠ URL captcha DataDome introuvable')
        return False

    log.info(f'  captchaUrl : {captcha_url[:80]}...')

    # Cookie DataDome existant
    dd_cookie = ''
    try:
        cookies = await page.context.cookies()
        for c in cookies:
            if c['name'] == 'datadome':
                dd_cookie = c['value']
                break
    except:
        pass

    user_agent = await page.evaluate('navigator.userAgent')

    task_payload = {
        'clientKey': CAPSOLVER_KEY,
        'task': {
            'type': 'DatadomeSliderTask',
            'websiteURL': 'https://www.leboncoin.fr',
            'captchaUrl': captcha_url,
            'proxy': f'http://{IPROYAL_USER}:{IPROYAL_PASS}@geo.iproyal.com:12321',
            'userAgent': user_agent,
        }
    }
    if dd_cookie:
        task_payload['task']['datadome_cookie'] = dd_cookie

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post('https://api.capsolver.com/createTask', json=task_payload, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                data = await resp.json()
            if data.get('errorId', 0) != 0:
                log.warning(f'  ⚠ Capsolver erreur : {data.get("errorDescription", data)}')
                return False
            task_id = data.get('taskId')
            if not task_id:
                return False
            log.info(f'  Capsolver taskId={task_id} — attente résolution...')
            for attempt in range(24):
                await asyncio.sleep(5)
                async with session.post('https://api.capsolver.com/getTaskResult', json={'clientKey': CAPSOLVER_KEY, 'taskId': task_id}, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    result = await resp.json()
                status = result.get('status')
                if status == 'ready':
                    solution = result.get('solution', {})
                    log.info(f'  ✅ Capsolver résolu en ~{(attempt+1)*5}s')
                    new_cookie = solution.get('cookie', '').replace('datadome=', '').strip()
                    if new_cookie:
                        await page.context.add_cookies([{'name': 'datadome', 'value': new_cookie, 'domain': '.leboncoin.fr', 'path': '/'}])
                        await page.reload(timeout=30000, wait_until='load')
                        await asyncio.sleep(random.uniform(2, 4))
                        log.info('  ✅ Page rechargée après résolution DataDome')
                        return True
                    return False
                elif status == 'failed':
                    log.warning(f'  ❌ Capsolver échec : {result.get("errorDescription", result)}')
                    return False
    except Exception as e:
        log.warning(f'  ⚠ Erreur Capsolver DataDome : {e}')
        return False
    log.warning('  ⚠ Capsolver timeout — non résolu en 2 minutes')
    return False


async def solve_cloudflare(page, url):
    if not CAPSOLVER_AVAILABLE:
        return False
    try:
        sitekey = await extract_turnstile_sitekey(page)
        if not sitekey:
            return False
        log.info("  🔐 Turnstile détecté — résolution Capsolver...")
        solution = capsolver.solve({
            "type": "AntiTurnstileTaskProxyLess",
            "websiteURL": url,
            "websiteKey": sitekey,
        })
        token = solution.get("token")
        if not token:
            return False
        await inject_turnstile_token(page, token)
        await page.wait_for_load_state("domcontentloaded", timeout=15000)
        await asyncio.sleep(2)
        body = await page.inner_text("body")
        if any(x in body.lower() for x in ["just a moment", "checking your browser"]):
            return False
        log.info("  ✓ Challenge Cloudflare résolu")
        return True
    except Exception as e:
        log.warning(f"  Capsolver erreur : {e}")
        return False

# ─────────────────────────────────────────────
# NAVIGATEUR
# ─────────────────────────────────────────────

async def launch_browser(pw, clear_cache=False):
    CHROME_PROFILE.mkdir(exist_ok=True)
    if clear_cache:
        import shutil
        for d in ["Cache", "Code Cache", "GPUCache"]:
            p = CHROME_PROFILE / "Default" / d
            if p.exists():
                try:
                    shutil.rmtree(p)
                except:
                    pass

    if PROXY_CONFIG:
        log.info(f"  🌐 Proxy IPRoyal actif : geo.iproyal.com:12321 (user: {IPROYAL_USER})")
    else:
        log.info("  ⚠ Proxy désactivé — IP directe (OK sur PC Windows, risqué sur VPS)")

    common_args = [
        "--no-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--disable-infobars",
        "--window-size=1366,768",
    ]
    common_ua = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/135.0.0.0 Safari/537.36"
    )
    init_script = """
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en-US', 'en'] });
        window.chrome = { runtime: {}, loadTimes: function() {}, csi: function() {}, app: {} };
    """

    if PROXY_CONFIG:
        # Avec proxy : launch + new_context (seul mode qui supporte l'auth proxy)
        browser = await pw.chromium.launch(
            headless=True,
            proxy=PROXY_CONFIG,
            args=common_args,
        )
        context = await browser.new_context(
            viewport={"width": 1366, "height": 768},
            user_agent=common_ua,
            locale="fr-FR",
            timezone_id="Europe/Paris",
            permissions=["geolocation"],
            geolocation={"latitude": 47.2184, "longitude": -1.5536},
        )
    else:
        # Sans proxy : launch_persistent_context (conserve les cookies entre sessions)
        context = await pw.chromium.launch_persistent_context(
            user_data_dir=str(CHROME_PROFILE),
            headless=False,
            args=common_args,
            viewport={"width": 1366, "height": 768},
            user_agent=common_ua,
            locale="fr-FR",
            timezone_id="Europe/Paris",
            permissions=["geolocation"],
            geolocation={"latitude": 47.2184, "longitude": -1.5536},
        )

    await context.add_init_script(init_script)
    page = await context.new_page()
    try:
        from playwright_stealth import stealth_async
        await stealth_async(page)
    except ImportError:
        pass

    return context, page

async def is_browser_alive(page):
    try:
        await page.evaluate("1 + 1")
        return True
    except:
        return False

# ─────────────────────────────────────────────
# SCRAPING — Utilitaires
# ─────────────────────────────────────────────

async def accept_cookies(page):
    try:
        body = await page.inner_text("body")
        body_lower = body.lower()
        if "accès temporairement restreint" in body_lower:
            log.warning("  ⚠ Cloudflare détecté — tentative résolution...")
            await solve_cloudflare(page, page.url)
            return
        # DataDome : résolution automatique
        if any(s in body_lower for s in ["datadome", "faites glisser", "captcha-delivery.com"]):
            log.warning("  🛡 DataDome détecté dans accept_cookies — résolution...")
            await resolve_datadome_captcha(page)
            return
        selectors = [
            "button:has-text('Accepter & Fermer')",
            "button:has-text('Accepter & Fermer →')",
            "button:has-text('Tout accepter')",
            "button:has-text('Accepter')",
            "button#didomi-notice-agree-button",
            "[data-didomi-action='agree']",
            "button[title*='Accepter']",
            ".modal button:has-text('Accepter')",
        ]
        for selector in selectors:
            try:
                btn = page.locator(selector)
                if await btn.count() > 0:
                    await btn.first.click(timeout=3000)
                    await asyncio.sleep(2)
                    return
            except:
                continue
    except:
        pass

async def extract_urls_from_page(page):
    urls = []
    try:
        try:
            await page.wait_for_load_state("networkidle", timeout=8000)
        except:
            await asyncio.sleep(3)

        all_links = await page.locator("a[href]").all()
        for link in all_links:
            try:
                href = await link.get_attribute("href", timeout=1000)
                if not href:
                    continue
                if not href.startswith("http"):
                    href = "https://www.leboncoin.fr" + href
                if (
                    "leboncoin.fr" in href and
                    "ventes_immobilieres" in href and
                    re.search(r'/\d{6,}', href) and
                    "quick_form" not in href and
                    href not in urls
                ):
                    urls.append(href)
            except:
                pass
        if urls:
            log.info(f"    -> {len(urls)} annonces")
        else:
            log.warning(f"    -> 0 annonces")
    except Exception as e:
        log.warning(f"  extract_urls erreur : {e}")
    return urls

def is_annonce_recente(date_publication_str, jours=7):
    """Vérifie si une annonce est plus récente que N jours."""
    if not date_publication_str:
        return True  # si pas de date, on considère récente par sécurité
    try:
        date_pub = datetime.datetime.fromisoformat(date_publication_str.replace("Z", "+00:00"))
        delta = datetime.datetime.now(datetime.timezone.utc) - date_pub
        return delta.days <= jours
    except:
        return True

# ─────────────────────────────────────────────
# SCRAPING — Page de résultats
# ─────────────────────────────────────────────

async def search_by_keyword(page, keyword, strategie, cookies_accepted,
                             commune_name, commune_loc, mode_init=False):
    """
    Collecte les URLs d'annonces pour un mot-clé et une commune.

    Mode INIT  : toutes les pages, sans limite de date
    Mode HEBDO : trie par date desc, s'arrête dès qu'une annonce > 7 jours

    Retourne : (urls_found, cookies_accepted, bloque)
    bloque=True si DataDome n'a pas pu être résolu → ville NON marquée done
    """
    urls_found = []
    bloque = False
    kw_enc = keyword.replace(" ", "+").replace("é", "%C3%A9").replace("è", "%C3%A8")

    # Si commune_loc est un identifiant Leboncoin complet, on l'utilise
    # Sinon on utilise le nom texte (moins précis)
    if "__" in commune_loc:
        loc_param = f"locations={commune_loc}"
    else:
        loc_enc = (commune_loc.replace(" ", "%20")
                              .replace("é", "%C3%A9").replace("è", "%C3%A8"))
        loc_param = f"locations={loc_enc}"

    # En mode HEBDO : tri par date desc pour détecter les nouvelles annonces
    sort_param = "" if mode_init else "&sort=time&order=desc"

    seed_url = (
        f"https://www.leboncoin.fr/recherche?"
        f"category=9&text={kw_enc}&"
        f"{loc_param}&real_estate_type=1,2{sort_param}"
    )

    log.info(f"  [{strategie}] '{keyword}' | {commune_name} | mode={'INIT' if mode_init else 'HEBDO'}")
    base_url = seed_url
    stop_pagination = False  # Flag pour arrêter en mode HEBDO

    for page_num in range(1, 51):  # max 50 pages
        if stop_pagination:
            break

        url = base_url if page_num == 1 else f"{base_url}&page={page_num}"
        try:
            await page.goto(url, timeout=40000, wait_until="domcontentloaded")
            # Attendre stabilisation — Leboncoin fait des redirections JS après domcontentloaded
            try:
                await page.wait_for_load_state("networkidle", timeout=8000)
            except:
                pass  # Si timeout networkidle, on continue quand même
            await asyncio.sleep(rand_delay())

            # Détecter DataDome uniquement si la page est vraiment bloquée (body vide)
            html = await page.content()
            body_check = await page.inner_text("body")
            datadome_bloquant = (
                ("captcha-delivery.com" in html or "datadome" in html.lower())
                and len(body_check.strip()) < 50
            )
            if datadome_bloquant:
                log.warning(f"    🛡 DataDome bloquant détecté page {page_num} — résolution Capsolver...")
                resolved = await resolve_datadome_captcha(page)
                if resolved:
                    log.info(f"    ✅ DataDome résolu — reprise page {page_num}")
                    html = await page.content()
                else:
                    log.warning(f"    ❌ DataDome non résolu — pause 3min puis ville suivante")
                    bloque = True
                    await asyncio.sleep(180)
                    break

            if not cookies_accepted:
                await accept_cookies(page)
                cookies_accepted = True

            if page_num == 1:
                real_url = page.url
                base_url = re.sub(r'&page=\d+', '', real_url)

            await human_behavior(page)

            body = await page.inner_text("body")
            if "aucune annonce" in body.lower() or " 0 annonce" in body.lower():
                break

            # En mode HEBDO : vérifier les dates des annonces sur cette page
            if not mode_init:
                # Chercher les dates de publication dans le HTML
                # Leboncoin expose les dates dans des attributs data-* ou dans le JSON embarqué
                try:
                    next_data_raw = await page.locator("script#__NEXT_DATA__").first.inner_text(timeout=3000)
                    nd = json.loads(next_data_raw)
                    ads = (nd.get("props", {}).get("pageProps", {})
                             .get("searchData", {}).get("ads", []))
                    if ads:
                        # Vérifier la date de la dernière annonce de la page
                        for ad in ads:
                            date_pub = ad.get("first_publication_date", "")
                            if date_pub and not is_annonce_recente(date_pub, PHASE3_SEUIL_RECENTES_JOURS):
                                log.info(f"    Page {page_num} : annonce de plus de {PHASE3_SEUIL_RECENTES_JOURS}j détectée → arrêt pagination")
                                stop_pagination = True
                                break
                except:
                    pass  # Si pas de NEXT_DATA, on continue sans filtre date

            page_urls = await extract_urls_from_page(page)
            if not page_urls:
                log.warning(f"    Page {page_num} : 0 URLs trouvées")
                break

            new = [u for u in page_urls if u not in urls_found]
            urls_found.extend(new)
            log.info(f"    Page {page_num} : +{len(new)} URLs")

            next_btn = page.locator("a[aria-label='Page suivante'], a:has-text('Suivant')")
            if await next_btn.count() == 0:
                break
            await asyncio.sleep(rand_delay())

        except PlaywrightTimeout:
            log.warning(f"    Timeout page {page_num} — abandon")
            break
        except Exception as e:
            log.error(f"    Erreur page {page_num} : {e}")
            break

    return urls_found, cookies_accepted, bloque

# ─────────────────────────────────────────────
# SCRAPING — Page détail annonce
# ─────────────────────────────────────────────

async def scrape_listing_detail(page, url, strategie_active: str = "Locataire en place"):
    """
    Scrape le détail d'une annonce Leboncoin.
    strategie_active : "Locataire en place" ou "Travaux lourds"
    """
    data = {"url": url}
    try:
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
        await asyncio.sleep(random.uniform(1.0, 2.0))
        await human_behavior(page)

        try:
            body_text = await page.inner_text("body")
            title_text = await page.title()
            cf_indicators = [
                "accès temporairement restreint", "access denied",
                "just a moment", "checking your browser",
                "enable javascript and cookies",
                "quelque chose dans le comportement",
                "robot est sur le même réseau",
                "contacter le support",
                "challenge", "cf-browser-verification",
                "ray id", "cloudflare", "datadome",
                "please wait", "veuillez patienter",
                "human verification", "verification humaine",
                "trop de requetes", "too many requests",
                "nous verifions", "captcha",
            ]
            body_lower = body_text.lower()
            title_lower = title_text.lower()
            page_vide = len(body_text.strip()) < 200
            if page_vide or any(ind in body_lower or ind in title_lower for ind in cf_indicators):
                raison = "page vide (<200 chars)" if page_vide else "indicateur detecte"
                log.warning(f"  ⛔ Ban Leboncoin/DataDome detecte ({raison}) — pause 3min...")
                await asyncio.sleep(180)
                await page.goto(url, timeout=30000, wait_until="domcontentloaded")
                await asyncio.sleep(5)
                body_text = await page.inner_text("body")
                title_text = await page.title()
                body_lower = body_text.lower()
                page_vide = len(body_text.strip()) < 200
                if page_vide or any(ind in body_lower or ind in title_text.lower() for ind in cf_indicators):
                    log.warning(f"  ⛔ Toujours banni apres pause — URL marquee echouee")
                    return "cloudflare"
                log.info(f"  ✅ Ban leve apres pause")
        except Exception as e:
            log.warning(f"  ⚠ Erreur verification ban : {e}")

        # Titre
        try:
            data["titre"] = (await page.locator("h1").first.inner_text(timeout=5000)).strip()
        except:
            pass

        # Prix
        try:
            prix_text = await page.locator("[data-qa-id='adview_price']").first.inner_text(timeout=5000)
            data["prix"] = extract_number(prix_text)
        except:
            pass

        # __NEXT_DATA__ — toutes infos structurées
        try:
            next_data_raw = await page.locator("script#__NEXT_DATA__").first.inner_text(timeout=5000)
            nd = json.loads(next_data_raw)
            ad_data = nd.get("props", {}).get("pageProps", {}).get("ad", {})
            if ad_data:
                for attr in ad_data.get("attributes", []):
                    k = attr.get("key", "")
                    v = attr.get("value", attr.get("values", [None])[0] if attr.get("values") else None)
                    if k == "square" and v and not data.get("surface"):
                        try:
                            data["surface"] = float(str(v).replace(",", "."))
                        except:
                            pass
                    elif k == "rooms" and v and not data.get("nb_pieces"):
                        try:
                            n = int(v)
                            data["nb_pieces"] = f"T{n}" if n > 1 else "T1"
                        except:
                            pass
                    elif k == "floor_number" and v and not data.get("etage"):
                        data["etage"] = str(v)
                    # DPE
                    elif k == "energy_rate" and v and not data.get("dpe"):
                        dpe_val = str(v).strip().upper()
                        if dpe_val in ("A", "B", "C", "D", "E", "F", "G"):
                            data["dpe"] = dpe_val
                    # Année de construction
                    elif k in ("construction_year", "building_year") and v and not data.get("annee_construction"):
                        try:
                            annee = int(v)
                            if 1800 <= annee <= 2030:
                                data["annee_construction"] = annee
                        except:
                            pass
                    # Ascenseur
                    elif k == "elevator" and v is not None:
                        data["ascenseur"] = str(v).lower() in ("1", "true", "yes", "oui")
                    # Accès extérieur
                    elif k == "outside_access" and v:
                        data["acces_exterieur"] = str(v)
                    # Chauffage
                    elif k == "heating_type" and v:
                        data["type_chauffage"] = str(v)
                    elif k == "heating_mode" and v:
                        data["mode_chauffage"] = str(v)
                    # Salles de bain / chambres
                    elif k in ("nb_shower_room", "shower_room") and v:
                        try: data["nb_sdb"] = int(v)
                        except: pass
                    elif k in ("bedrooms", "nb_bedrooms") and v:
                        try: data["nb_chambres"] = int(v)
                        except: pass
                    # GES
                    elif k == "ges" and v:
                        ges_val = str(v).strip().upper()
                        if ges_val in ("A","B","C","D","E","F","G"):
                            data["ges"] = ges_val
                    # DPE valeur kWh/m²/an
                    elif k == "energy_value" and v:
                        try: data["dpe_valeur"] = float(v)
                        except: pass
                    # Surface terrain (maisons)
                    elif k in ("land_plot_surface", "land_surface") and v and not data.get("surface_terrain"):
                        try: data["surface_terrain"] = float(str(v).replace(",", "."))
                        except: pass
                    # Budget énergie annuel
                    elif k == "nannual_energy_budget_min" and v:
                        try: data["budget_energie_min"] = float(v)
                        except: pass
                    elif k == "nannual_energy_budget_max" and v:
                        try: data["budget_energie_max"] = float(v)
                        except: pass
                loc = ad_data.get("location", {})
                if loc:
                    if not data.get("ville"):
                        data["ville"] = loc.get("city") or loc.get("label_locality", "")
                    if not data.get("quartier"):
                        data["quartier"] = loc.get("district_label") or loc.get("district", "")
                    if not data.get("code_postal"):
                        cp = loc.get("zipcode") or loc.get("zip_code", "")
                        if cp and len(str(cp)) == 5:
                            data["code_postal"] = str(cp)
                    if not data.get("adresse"):
                        addr = loc.get("address") or loc.get("street", "")
                        if addr:
                            data["adresse"] = str(addr)
                    # Coordonnees GPS depuis Leboncoin
                    if not data.get("latitude"):
                        lat = loc.get("lat") or loc.get("latitude")
                        lng = loc.get("lng") or loc.get("longitude")
                        if lat and lng:
                            try:
                                data["latitude"] = float(lat)
                                data["longitude"] = float(lng)
                            except: pass
                body_nd = ad_data.get("body", "")
                if body_nd:
                    data["_description_nd"] = body_nd
                # URLs de toutes les photos
                images = ad_data.get("images", {})
                urls_photos = images.get("urls", []) or images.get("urls_large", [])
                if urls_photos:
                    data["_all_photo_urls"] = urls_photos
        except Exception as e:
            log.debug(f"  __NEXT_DATA__ erreur : {e}")

        # Description — déplier "Voir plus"
        description = data.pop("_description_nd", "")
        try:
            desc_el = page.locator("[data-qa-id='adview_description_container']")
            for sel in [
                "[data-qa-id='adview_description_container'] button",
                "button:has-text('Voir plus')",
                "button:has-text('Lire la suite')",
            ]:
                try:
                    btn = page.locator(sel)
                    if await btn.count() > 0:
                        await btn.first.click(timeout=2000)
                        await asyncio.sleep(0.5)
                        break
                except:
                    continue
            description = await desc_el.first.inner_text(timeout=5000)
            data["description"] = description
        except:
            pass

        titre_desc = f"{data.get('titre', '')} {description}"
        data["nb_pieces"] = data.get("nb_pieces") or extract_nb_pieces(titre_desc)
        data["etage"]     = data.get("etage")     or extract_etage(description)
        data["type_bien"] = extract_type_bien(data.get("titre", ""), description)

        # Photo principale (cover)
        all_photo_urls = data.pop("_all_photo_urls", [])
        try:
            photo_url = all_photo_urls[0] if all_photo_urls else None
            if not photo_url:
                for sel in [
                    "img[data-qa-id='adview_gallery_slide_picture']",
                    "div[data-qa-id='adview_gallery'] img",
                    "picture img",
                ]:
                    el = page.locator(sel).first
                    if await el.count() > 0:
                        for attr in ["src", "srcset", "data-src"]:
                            val = await el.get_attribute(attr, timeout=1500)
                            if val and val.startswith("http") and not val.endswith(".svg"):
                                photo_url = val.split(" ")[0]
                                break
                    if photo_url:
                        break
            if photo_url:
                data["photo_url"] = photo_url
        except:
            pass

        # ════════════════════════════════════════════════════════════════════
        # BIFURCATION SELON STRATÉGIE
        # ════════════════════════════════════════════════════════════════════

        if strategie_active == "Locataire en place":
            data["is_occupied"] = is_occupied(titre_desc)
            if not data["is_occupied"]:
                return None
            if is_residence_geree(data.get("titre", ""), description):
                return "residence_geree"

            if ANTHROPIC_CLIENT and description:
                few_shot = _load_few_shot_travaux(BASE_DIR)
                ai = extract_with_ai(
                    description = description,
                    dpe         = data.get("dpe"),
                    annee       = data.get("annee_construction"),
                    photo_urls  = all_photo_urls,  # limité à 3 dans extract_with_ai
                    few_shot    = few_shot,
                )
                loyer_cc = ai.get("loyer_cc")
                loyer_hc = ai.get("loyer_hc")
                if loyer_cc:
                    data["loyer"]      = loyer_cc
                    data["type_loyer"] = "CC"
                elif loyer_hc:
                    data["loyer"]      = loyer_hc
                    data["type_loyer"] = "HC"
                data["charges_rec"] = ai.get("charges_rec")
                data["charges_cop"] = ai.get("charges_copro_mensuel")
                data["taxe_fonc"]   = ai.get("taxe_fonciere_annuelle")
                data["bail_end"]    = ai.get("fin_bail")
                if ai.get("profil_locataire"):
                    data["profil_loc"] = ai.get("profil_locataire")
                if ai.get("surface_m2") and not data.get("surface"):
                    try:
                        data["surface"] = float(ai.get("surface_m2"))
                    except:
                        pass
            else:
                data["loyer"]       = extract_rent(description)
                data["charges_rec"] = extract_charges_recup(description)
                data["charges_cop"] = extract_charges_copro(description)
                data["taxe_fonc"]   = extract_taxe_fonciere(description)
                if description and re.search(r"charges?\s+comprises?", description.lower()):
                    data["type_loyer"] = "CC"

            # Score travaux inclus dans le même appel Sonnet
            score_loc = ai.get("score_travaux")
            if score_loc and isinstance(score_loc, int) and 1 <= score_loc <= 5:
                data["score_travaux"]     = score_loc
                data["score_commentaire"] = ai.get("score_commentaire", "")
                log.info(f"  🔨 Score travaux : {score_loc}/5 — {data['score_commentaire'][:60]}")

            data["message_auto"] = generate_message(data)
            prix_fmt  = f"{int(data['prix']):,}".replace(",", " ") + " €" if data.get("prix") else "prix N/A"
            loyer_fmt = f"{int(data['loyer'])} €/mois" if data.get("loyer") else "loyer N/A"
            log.info(f"  ✓ {data.get('type_bien','?')} | {data.get('ville','?')} | {prix_fmt} | {loyer_fmt}")

        elif strategie_active == "Travaux lourds":
            if not prefiltre_travaux(titre_desc, data.get("dpe")):
                log.info(f"  → Pré-filtre travaux : aucun signal — ignoré")
                return None

            score, commentaire = score_travaux_with_ai(
                base_dir    = BASE_DIR,
                description = description,
                dpe         = data.get("dpe"),
                annee       = data.get("annee_construction"),
                titre       = data.get("titre", ""),
                prix        = data.get("prix"),
                surface     = data.get("surface"),
                photo_urls  = all_photo_urls,
            )
            if score is None:
                log.info(f"  → Scoring IA échoué — bien ignoré")
                return None

            # Seuil minimum : score < 3 = pas assez de travaux pour décote significative
            if score < 3:
                log.info(f"  → Score {score}/5 insuffisant (minimum 3) — bien ignoré")
                return None

            data["score_travaux"]     = score
            data["score_commentaire"] = commentaire
            prix_fmt = f"{int(data['prix']):,}".replace(",", " ") + " €" if data.get("prix") else "prix N/A"
            log.info(f"  ✓ {data.get('type_bien','?')} | {data.get('ville','?')} | {prix_fmt} | DPE {data.get('dpe','NC')} | Score {score}/5")

        else:
            log.warning(f"  Stratégie inconnue : {strategie_active}")
            return None

    except PlaywrightTimeout:
        log.warning(f"  Timeout : {url}")
        return "timeout"
    except Exception as e:
        err = str(e)
        if "ERR_NETWORK_IO_SUSPENDED" in err or "ERR_INTERNET_DISCONNECTED" in err:
            return "network_crash"
        log.error(f"  Erreur : {url} — {err[:100]}")
        return None

    # Geocoding fallback si pas de coordonnees
    if not data.get("latitude") and data.get("ville"):
        lat, lng = supa.geocode(
            adresse=data.get("adresse", ""),
            ville=data.get("ville", ""),
            code_postal=data.get("code_postal", "")
        )
        if lat and lng:
            data["latitude"] = lat
            data["longitude"] = lng

    # Extraction NLP des signaux qualitatifs pour l'estimation
    description = data.get("_description", "") or data.get("_description_nd", "")
    if description and len(description) > 30:
        photo_urls = data.get("_all_photo_urls", [])
        qualite = extract_qualite_nlp(description, photo_urls)
        if qualite:
            for k in ["parking_type", "exposition", "vue", "etat_interieur", "jardin_etat", "mitoyennete", "assainissement"]:
                if qualite.get(k):
                    data[k] = qualite[k]
            for k in ["has_piscine", "has_cave", "has_gardien", "has_double_vitrage", "has_cuisine_equipee", "is_plain_pied", "has_grenier"]:
                if qualite.get(k) is True:
                    data[k] = True
            if qualite.get("standing_immeuble"):
                try:
                    s = int(qualite["standing_immeuble"])
                    if 1 <= s <= 5:
                        data["standing_immeuble"] = s
                except: pass

    return data

# ─────────────────────────────────────────────
# PHASE 3 — Vérification statut annonces
# ─────────────────────────────────────────────

def doit_verifier_statut(bien, done_urls):
    """
    Détermine si un bien actif doit être vérifié dans ce run.

    Logique :
    - URL scrapée ce run             → skip (on sait qu'elle est active)
    - Annonce < 7 jours              → skip (trop récente pour être expirée)
    - Annonce < 4 mois               → vérifier à chaque run hebdomadaire
    - Annonce entre 4 et 6 mois      → vérifier si dernière vérif > 15 jours
    - Annonce > 6 mois               → vérifier si dernière vérif > 30 jours
    """
    if bien.get("url") in done_urls:
        return False

    today = datetime.date.today()

    date_ajout_str = bien.get("created_at") or bien.get("maj")
    if date_ajout_str:
        try:
            date_ajout = datetime.date.fromisoformat(date_ajout_str[:10])
            age_jours  = (today - date_ajout).days

            # Trop récente — pas vérifiée
            if age_jours < PHASE3_SEUIL_TROP_RECENTES_JOURS:
                return False

            # < 4 mois → vérifier à chaque run
            if age_jours < PHASE3_SEUIL_FREQUENTES_JOURS:
                return True

            # Récupérer la date de dernière vérification
            derniere_verif_str = bien.get("derniere_verif_statut") or bien.get("maj")
            if derniere_verif_str:
                derniere_verif     = datetime.date.fromisoformat(derniere_verif_str[:10])
                jours_depuis_verif = (today - derniere_verif).days

                # Entre 4 et 6 mois → vérifier si > 15j depuis dernière vérif
                if age_jours < PHASE3_SEUIL_ESPACEES_JOURS:
                    return jours_depuis_verif > PHASE3_DELAI_ESPACEES_JOURS

                # > 6 mois → vérifier si > 30j depuis dernière vérif
                return jours_depuis_verif > PHASE3_DELAI_RARES_JOURS

        except:
            pass

    return True  # Par défaut : vérifier


async def phase3_verification_statut(page, active_biens, done_urls):
    """Phase 3 : vérifie le statut des annonces actives en base."""
    log.info("\n── PHASE 3 : Vérification statut annonces actives ──")

    a_verifier = [b for b in active_biens if doit_verifier_statut(b, done_urls)]
    log.info(f"  {len(a_verifier)} annonces à vérifier sur {len(active_biens)} actives en base")

    expired_count = 0
    for bien in a_verifier:
        bien_url = bien.get("url")
        bien_id  = bien.get("id")
        if not bien_url or not bien_id:
            continue
        try:
            await page.goto(bien_url, timeout=15000, wait_until="domcontentloaded")
            await asyncio.sleep(random.uniform(1.5, 2.5))
            body = (await page.inner_text("body")).lower()
            if any(x in body for x in [
                "annonce introuvable", "n'existe plus",
                "cette annonce a été supprimée", "page introuvable"
            ]):
                supa.update_statut(bien_id, "Annonce expirée")
                log.info(f"  ⚠ Expirée : [{bien_id}]")
                expired_count += 1
            else:
                # Mettre à jour la date de vérification pour espacer les prochains checks
                supa.update_derniere_verif(bien_id)
                log.info(f"  ✓ Active  : [{bien_id}]")
            await asyncio.sleep(rand_delay())
        except PlaywrightTimeout:
            log.warning(f"  Timeout Phase 3 : {bien_url}")
        except Exception as e:
            log.warning(f"  Erreur Phase 3 : {e}")

    log.info(f"Phase 3 terminée : {expired_count} expirées sur {len(a_verifier)} vérifiées")
    return expired_count

# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────

async def main():
    mode_label = "INIT (scraping complet)" if MODE_INIT else "HEBDO (nouvelles annonces)"
    log.info("=" * 60)
    log.info(f"SCRAPER MDB v5 — {mode_label}")
    log.info(f"Démarrage : {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')}")
    if METROPOLES_FILTRE:
        log.info(f"Métropoles ciblées : {', '.join(METROPOLES_FILTRE)}")
    log.info("=" * 60)

    if not supa.is_connected():
        log.error("Supabase non connecté — vérifiez .env")
        sys.exit(1)

    supa.sync_files_on_startup(BASE_DIR)

    existing_urls = supa.get_existing_urls()
    log.info(f"{len(existing_urls)} URLs déjà en base")

    # ── Sélection STRATÉGIE ───────────────────────────────────────────────────
    noms_strat = STRATEGIES_DISPONIBLES
    log.info(f"\n{'─'*60}")
    log.info("SÉLECTION DE LA STRATÉGIE")
    log.info(f"{'─'*60}")
    for i, nom in enumerate(noms_strat, 1):
        log.info(f"  {i} — {nom}")
    log.info(f"  0 — Toutes les stratégies")
    log.info(f"{'─'*60}")
    choix_strat = input("Stratégie (ex: 0 ou 1) : ").strip()
    if choix_strat == "0" or choix_strat == "":
        strategies_choisies = noms_strat
    else:
        try:
            idx = int(choix_strat) - 1
            strategies_choisies = [noms_strat[idx]] if 0 <= idx < len(noms_strat) else noms_strat
        except ValueError:
            strategies_choisies = noms_strat
    log.info(f"Stratégies actives : {', '.join(strategies_choisies)}")
    keywords_actifs = {k: v for k, v in KEYWORDS.items() if k in strategies_choisies}

    # ── Sélection métropoles ──
    # Si --metropoles passé en argument → pas de menu interactif
    if METROPOLES_FILTRE:
        inconnues = [m for m in METROPOLES_FILTRE if m not in COMMUNES]
        if inconnues:
            log.warning(f"Métropoles inconnues ignorées : {inconnues}")
        metropoles_choisies = [m for m in METROPOLES_FILTRE if m in COMMUNES]
    else:
        # Menu interactif de sélection
        noms = list(COMMUNES.keys())
        log.info(f"\n{'─'*60}")
        log.info("SÉLECTION DES MÉTROPOLES")
        log.info(f"{'─'*60}")
        for i, nom in enumerate(noms, 1):
            log.info(f"  {i} — {nom}")
        log.info(f"  0 — Toutes les métropoles ({len(noms)})")
        log.info(f"{'─'*60}")
        choix_str = input("Choix (ex: 0  ou  1 3 5) : ").strip()
        if choix_str == "0" or choix_str == "":
            metropoles_choisies = noms
        else:
            indices = []
            for c in choix_str.split():
                try:
                    idx = int(c)
                    if 1 <= idx <= len(noms):
                        indices.append(idx - 1)
                    else:
                        log.warning(f"  Indice {idx} ignoré (hors plage 1-{len(noms)})")
                except ValueError:
                    log.warning(f"  '{c}' ignoré (pas un nombre)")
            metropoles_choisies = [noms[i] for i in indices] if indices else noms

    communes_actives = {k: v for k, v in COMMUNES.items() if k in metropoles_choisies}
    log.info(f"Communes actives : {', '.join(communes_actives.keys())} ({len(communes_actives)}/{len(COMMUNES)})")

    # ── Aplatir KEYWORDS actifs ──
    all_kw_pairs = []
    for strategie, kw_list in keywords_actifs.items():
        for kw in kw_list:
            all_kw_pairs.append((strategie, kw))
    KW_TO_STRATEGIE = {kw: strat for strat, kw in all_kw_pairs}
    total_combis = len(all_kw_pairs) * len(communes_actives)

    # ────────────────────────────────────────────────────────────
    # CHARGEMENT PROGRESS + MENU
    # ────────────────────────────────────────────────────────────
    prog = load_progress()
    p1   = prog["phase1"]
    p2   = prog["phase2"]

    urls_to_process = None   # None = lancer phase 1, list = aller direct phase 2
    run_phase1      = True
    run_phase2      = True

    has_progress = (
        p1.get("done_keys") or p1.get("failed_keys") or p1.get("urls") or
        p2.get("todo") or p2.get("done") or p2.get("captcha") or p2.get("failed")
    )

    if has_progress:
        n_p1_done   = len(p1.get("done_keys", []))
        n_p1_fail   = len(p1.get("failed_keys", []))
        n_p1_urls   = len(p1.get("urls", []))
        n_p2_todo   = len(p2.get("todo", []))
        n_p2_done   = len(p2.get("done", []))
        n_p2_cap    = len(p2.get("captcha", []))
        n_p2_fail   = len(p2.get("failed", []))

        log.info(f"\n{'─'*60}")
        log.info("PROGRESSION EXISTANTE DÉTECTÉE")
        log.info(f"  Phase 1 : {n_p1_done}/{total_combis} combis faites | {n_p1_fail} bloquées | {n_p1_urls} URLs collectées")
        log.info(f"  Phase 2 : {n_p2_todo} à traiter | {n_p2_done} faites | {n_p2_cap} captcha | {n_p2_fail} erreurs")
        log.info(f"{'─'*60}")
        log.info("  ── SCRAPING COMPLET ───────────────────────────────────")
        log.info("  1 — Nouveau scraping complet          (repart de zéro, supprime tout)")
        log.info("  ── PHASE 1 — Collecte des URLs ────────────────────────")
        log.info("  2 — Recommencer la Phase 1             (garde les URLs déjà collectées, évite les doublons)")
        log.info("  3 — Retraiter les combis bloquées      (uniquement les recherches en erreur/timeout)")
        log.info("  ── PHASE 2 — Analyse des annonces ─────────────────────")
        log.info("  4 — Reprendre la Phase 2               (continue sur les URLs todo restantes)")
        log.info("  5 — Recommencer la Phase 2 depuis le début (retraite toutes les URLs collectées)")
        log.info("  6 — Retraiter les URLs bloquées captcha")
        log.info("  7 — Retraiter les URLs en erreur       (timeout, crash réseau)")
        log.info("  8 — Retraiter les URLs absentes de Supabase")
        log.info(f"{'─'*60}")
        resp = input("Choix (1-8) : ").strip()

        if resp == '1':
            # Nouveau scraping complet
            clear_progress()
            prog = _empty_progress()
            p1   = prog["phase1"]
            p2   = prog["phase2"]
            log.info("Nouveau scraping complet — progression supprimée")
            run_phase1 = True
            urls_to_process = None

        elif resp == '2':
            # Recommencer phase 1 (garde les URLs déjà collectées)
            p1["done_keys"]   = []
            p1["failed_keys"] = []
            p1["complete"]    = False
            log.info(f"Phase 1 réinitialisée — {len(p1.get('urls', []))} URLs précédentes conservées (pas de doublons)")
            run_phase1 = True
            urls_to_process = None

        elif resp == '3':
            # Retraiter seulement les combis bloquées en phase 1
            if not p1.get("failed_keys"):
                log.info("Aucune combi bloquée en phase 1 — rien à retraiter")
                return
            failed_backup     = p1["failed_keys"][:]
            p1["done_keys"]   = [k for k in p1.get("done_keys", []) if k not in p1.get("failed_keys", [])]
            p1["failed_keys"] = []
            p1["complete"]    = False
            log.info(f"Phase 1 — retraitement de {len(failed_backup)} combis bloquées")
            run_phase1  = True
            run_phase2  = False
            urls_to_process = None

        elif resp == '4':
            # Reprendre phase 2 sur les URLs todo restantes
            if not p2.get("todo"):
                log.info("Aucune URL todo — phase 2 déjà terminée")
                urls_to_process = []
            else:
                urls_to_process = p2["todo"]
                log.info(f"Reprise phase 2 : {len(urls_to_process)} URLs restantes")
            run_phase1 = False

        elif resp == '5':
            # Recommencer phase 2 depuis le début (toutes les URLs collectées)
            all_phase2_urls = list(set(
                p2.get("todo", []) + p2.get("done", []) +
                p2.get("captcha", []) + p2.get("failed", [])
            ))
            urls_to_process = [u for u in all_phase2_urls if u not in existing_urls]
            p2["todo"]    = urls_to_process
            p2["done"]    = []
            p2["captcha"] = []
            p2["failed"]  = []
            p2["complete"]= False
            log.info(f"Phase 2 recommencée depuis le début : {len(urls_to_process)} URLs à analyser")
            run_phase1 = False

        elif resp == '6':
            # Retraiter URLs bloquées captcha
            urls_to_process = p2.get("captcha", [])
            p2["captcha"]   = []
            log.info(f"Retraitement captcha : {len(urls_to_process)} URLs")
            run_phase1 = False

        elif resp == '7':
            # Retraiter URLs en erreur (timeout, crash)
            urls_to_process = p2.get("failed", [])
            p2["failed"]    = []
            log.info(f"Retraitement erreurs : {len(urls_to_process)} URLs")
            run_phase1 = False

        else:
            # URLs absentes de Supabase
            log.info("Comparaison avec Supabase...")
            all_known = set(p2.get("todo", [])) | set(p2.get("done", [])) | set(p2.get("captcha", [])) | set(p2.get("failed", []))
            missing   = [u for u in all_known if u not in existing_urls]
            log.info(f"  {len(all_known)} URLs connues | {len(existing_urls)} en Supabase | {len(missing)} absentes")
            urls_to_process = missing
            run_phase1 = False

        save_progress(prog)

    # ────────────────────────────────────────────────────────────
    # PHASE 1 — Collecte URLs
    # ────────────────────────────────────────────────────────────
    kw_stats       = p1.get("kw_stats", {})
    url_to_kw      = p1.get("url_to_kw", {})
    url_to_commune = p1.get("url_to_commune", {})

    async with async_playwright() as pw:
        context, page = await launch_browser(pw)
        cookies_accepted = False

        # Warmup
        try:
            log.info("Warmup : chargement google.fr puis leboncoin.fr...")
            await page.goto("https://www.google.fr", timeout=20000)
            await asyncio.sleep(random.uniform(2, 4))
            await page.goto("https://www.leboncoin.fr", timeout=20000)
            await asyncio.sleep(random.uniform(3, 5))
            await accept_cookies(page)
            cookies_accepted = True
        except Exception as e:
            log.warning(f"Warmup erreur : {e}")

        if run_phase1 and urls_to_process is None:
            log.info(f"\n── PHASE 1 : Collecte URLs ──")
            done_keys   = set(p1.get("done_keys", []))
            failed_keys = set(p1.get("failed_keys", []))
            all_listing_urls = list(p1.get("urls", []))

            for kw_idx, (strategie, kw) in enumerate(all_kw_pairs):
                if kw not in kw_stats:
                    kw_stats[kw] = {"strategie": strategie, "urls_brutes": 0, "annonces_retenues": 0}

                for c_idx, (commune_name, commune_loc) in enumerate(communes_actives.items()):
                    key = f"{kw}|{commune_name}"
                    combi_num = kw_idx * len(communes_actives) + c_idx + 1

                    if key in done_keys:
                        log.info(f"  [{combi_num}/{total_combis}] {commune_name} / '{kw}' — déjà fait ✓")
                        continue

                    log.info(f"  [{combi_num}/{total_combis}] {commune_name} / '{kw}'")

                    kw_urls, cookies_accepted, bloque = await search_by_keyword(
                        page, kw, strategie, cookies_accepted,
                        commune_name, commune_loc, mode_init=MODE_INIT
                    )

                    nouvelles = [u for u in kw_urls if u not in all_listing_urls]
                    kw_stats[kw]["urls_brutes"] += len(kw_urls)
                    log.info(f"    → {len(kw_urls)} URLs ({len(nouvelles)} nouvelles) | Total : {len(all_listing_urls)+len(nouvelles)}")

                    for u in kw_urls:
                        if u not in url_to_kw:       url_to_kw[u] = kw
                        if u not in url_to_commune:   url_to_commune[u] = commune_name
                    all_listing_urls.extend(nouvelles)

                    if bloque:
                        log.warning(f"    ⚠ Bloqué — combi enregistrée en failed_keys")
                        failed_keys.add(key)
                    else:
                        done_keys.add(key)

                    # Sauvegarde progress phase 1 après chaque combi
                    p1.update({
                        "done_keys":      list(done_keys),
                        "failed_keys":    list(failed_keys),
                        "urls":           list(set(all_listing_urls)),
                        "url_to_kw":      url_to_kw,
                        "url_to_commune": url_to_commune,
                        "kw_stats":       kw_stats,
                        "complete":       len(done_keys) == total_combis and not failed_keys,
                    })
                    save_progress(prog)

                    if not bloque:
                        pause = random.uniform(15, 45)
                        log.info(f"    ⏸  Pause inter-ville : {pause:.0f}s")
                        await asyncio.sleep(pause)

            # Fin phase 1
            all_listing_urls = list(set(all_listing_urls))
            urls_to_process  = [u for u in all_listing_urls if u not in existing_urls]
            log.info(f"\nPhase 1 terminée : {len(all_listing_urls)} URLs collectées, {len(urls_to_process)} nouvelles à analyser")
            if failed_keys:
                log.warning(f"  {len(failed_keys)} combis bloquées — relancez avec option 7 pour les retraiter")

            p2["todo"]    = urls_to_process
            p2["done"]    = []
            p2["captcha"] = []
            p2["failed"]  = []
            p2["complete"]= False
            save_progress(prog)

            if not run_phase2:
                log.info("Phase 2 non lancée (option 7 sélectionnée)")
                await context.close()
                return

        # ────────────────────────────────────────────────────────────
        # PHASE 2 — Analyse des annonces
        # ────────────────────────────────────────────────────────────
        if urls_to_process is None:
            urls_to_process = p2.get("todo", [])

        log.info(f"\n── PHASE 2 : Analyse annonces ── {len(urls_to_process)} URLs")

        new_properties       = []
        occupied_count       = 0
        new_count            = 0
        not_occupied_count   = 0
        bail_commercial_count= 0
        cloudflare_count     = 0
        timeout_count        = 0

        done_set    = set(p2.get("done", []))
        captcha_set = set(p2.get("captcha", []))
        failed_set  = set(p2.get("failed", []))

        total_p2 = len(urls_to_process)

        for i, url in enumerate(urls_to_process, 1):

            if url in done_set:
                log.info(f"[{i}/{total_p2}] {url} — déjà traitée, skip")
                continue
            if url in existing_urls:
                log.info(f"[{i}/{total_p2}] {url} — déjà en base, skip")
                done_set.add(url)
                continue

            log.info(f"[{i}/{total_p2}] {url}")

            if not await is_browser_alive(page):
                log.warning("  ⚠ Navigateur mort — relance...")
                try:
                    await context.close()
                except:
                    pass
                await asyncio.sleep(5)
                context, page = await launch_browser(pw, clear_cache=True)
                await asyncio.sleep(3)

            strategie_url = KW_TO_STRATEGIE.get(url_to_kw.get(url, ""), "Locataire en place")
            result = await scrape_listing_detail(page, url, strategie_active=strategie_url)

            # ── Résultats ──
            if result == "cloudflare":
                log.warning(f"  ⛔ Captcha/Cloudflare — URL marquée captcha")
                captcha_set.add(url)
                cloudflare_count += 1
                p2["captcha"] = list(captcha_set)
                remaining = [u for u in urls_to_process if u not in done_set and u != url]
                p2["todo"] = remaining
                save_progress(prog)
                await asyncio.sleep(random.uniform(10, 20))
                continue

            if result == "network_crash":
                log.warning("  Relance navigateur après crash réseau...")
                try:
                    await context.close()
                except:
                    pass
                await asyncio.sleep(8)
                context, page = await launch_browser(pw, clear_cache=True)
                await asyncio.sleep(3)
                result = await scrape_listing_detail(page, url, strategie_active=strategie_url)

            if result == "timeout":
                log.warning(f"  ⏱ Timeout réseau")
                timeout_count += 1
                failed_set.add(url)
            elif result == "network_crash":
                log.warning(f"  💥 Crash réseau")
                failed_set.add(url)
            elif result == "residence_geree":
                bail_commercial_count += 1
                log.info("  🏢 Résidence gérée — hors stratégie, ignoré")
                done_set.add(url)
            elif result is None:
                not_occupied_count += 1
                log.info("  → Non retenu (filtré)")
                done_set.add(url)
            else:
                # Bien retenu
                done_set.add(url)
                occupied_count += 1
                # id assigné automatiquement par Supabase
                result["strategie_mdb"] = strategie_url
                result["metropole"]     = url_to_commune.get(url, "")
                kw_src = url_to_kw.get(url, "")
                if kw_src in kw_stats:
                    kw_stats[kw_src]["annonces_retenues"] = kw_stats[kw_src].get("annonces_retenues", 0) + 1

                # Upsert Supabase
                ok = supa.upsert_biens_batch([result])
                if ok:
                    log.info(f"  🗄️  Bien inséré ({url[-50:]})")
                    new_count += 1
                    existing_urls.add(url)

                # Photo cover
                if result.get("photo_url"):
                    storage_path = supa.upload_photo(result.get("url",""), result["photo_url"], index=0)
                    if storage_path:
                        supa.update_photo_storage_path(result.get("url",""), storage_path)
                        log.info(f"  📷 Photo uploadée")

                # Sauvegarde learning travaux
                if result.get("score_travaux"):
                    _save_learning_travaux(
                        base_dir       = BASE_DIR,
                        bien_id        = result.get("url", ""),
                        description    = result.get("description", ""),
                        dpe            = result.get("dpe"),
                        annee          = result.get("annee_construction"),
                        score_attribue = result["score_travaux"],
                        commentaire    = result.get("score_commentaire", ""),
                    )

                new_properties.append(result)
                supa.sync_files_after_save(BASE_DIR)

            # Sauvegarde progress phase 2
            p2["done"]    = list(done_set)
            p2["captcha"] = list(captcha_set)
            p2["failed"]  = list(failed_set)
            remaining     = [u for u in urls_to_process if u not in done_set and u not in captcha_set and u not in failed_set]
            p2["todo"]    = remaining
            p2["complete"]= len(remaining) == 0 and not captcha_set and not failed_set
            # bail_commercial = done, pas une erreur
            save_progress(prog)

            if result not in (None, "timeout", "network_crash", "cloudflare"):
                await asyncio.sleep(rand_delay())

        # ── Fin phase 2 ──
        # Phase 3 : vérification statuts
        active_biens = supa.get_active_urls()
        await phase3_verification_statut(page, active_biens, done_set)

        # Analyse mots-clés
        if kw_stats:
            log.info("\n══════════════════════════════════════════════════════════════════")
            log.info("  ANALYSE PERTINENCE MOTS CLÉS")
            log.info("══════════════════════════════════════════════════════════════════")
            log.info(f"  {'Mot-clé':<30} {'URLs':>6} {'Retenues':>9} {'Taux':>7}  Verdict")
            log.info("  " + "-" * 68)
            for kw, s in sorted(kw_stats.items(), key=lambda x: -x[1].get("annonces_retenues", 0)):
                urls_n   = s.get("urls_brutes", 0)
                retenues = s.get("annonces_retenues", 0)
                taux     = (retenues / urls_n * 100) if urls_n > 0 else 0
                verdict  = "✅ Garder" if taux >= 8 else ("⚠️  Surveiller" if taux >= 3 else "❌ Supprimer")
                log.info(f"  {kw:<30} {urls_n:>6} {retenues:>9} {taux:>6.1f}%  {verdict}")

        await context.close()

    supa.sync_files_after_save(BASE_DIR)

    # Supprimer progress si tout est propre
    if progress_is_clean(prog):
        clear_progress()
        log.info("✅ Progress supprimé — scraping terminé proprement")
    else:
        n_cap  = len(p2.get("captcha", []))
        n_fail = len(p2.get("failed", []))
        if n_cap:  log.warning(f"{n_cap} URLs captcha — relancez option 2 pour retraiter")
        if n_fail: log.warning(f"{n_fail} URLs en erreur — relancez option 3 pour retraiter")

    log.info(f"\n{'═'*60}")
    log.info("RÉSUMÉ FINAL")
    log.info(f"  Mode                        : {'INIT' if MODE_INIT else 'HEBDO'}")
    if METROPOLES_FILTRE:
        log.info(f"  Métropoles                  : {', '.join(METROPOLES_FILTRE)}")
    log.info(f"  Nouveaux biens ajoutés      : {new_count}")
    log.info(f"  Annonces occupées détectées : {occupied_count}")
    log.info(f"  Non occupées (normal)       : {not_occupied_count}")
    log.info(f"  Résidences gérées (ignorées): {bail_commercial_count}")
    log.info(f"  Captcha/Cloudflare          : {cloudflare_count}")
    log.info(f"  Timeouts réseau             : {timeout_count}")
    log.info("SCRAPING TERMINÉ ✓")
    log.info(f"{'═'*60}")

    notify_windows(
        "Scraper MDB — Terminé",
        f"{new_count} nouveaux biens | {cloudflare_count + timeout_count} erreurs"
    )

if __name__ == "__main__":
    asyncio.run(main())
