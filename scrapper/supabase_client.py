"""
supabase_client.py — Module d'intégration Supabase pour MDB
Gère : Storage (photos + fichiers) + Table biens
"""
import os, json, logging, datetime
from pathlib import Path

log = logging.getLogger(__name__)

# ── Lazy import supabase ──────────────────────────────────────────────────────
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    log.warning("supabase-py non installé — pip install supabase")

SUPABASE_URL    = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY    = os.getenv("SUPABASE_KEY", "")   # service_role key (pas anon)
STORAGE_BUCKET  = "mdb-files"
TABLE_BIENS     = "biens"
TABLE_PARAMS    = "parametres_snapshot"
TABLE_LEARNING  = "learning_logs"

_client: "Client | None" = None

def get_client() -> "Client | None":
    """Retourne le client Supabase, None si non configuré."""
    global _client
    if not SUPABASE_AVAILABLE:
        return None
    if not SUPABASE_URL or not SUPABASE_KEY:
        return None
    if _client is None:
        try:
            _client = create_client(SUPABASE_URL, SUPABASE_KEY)
        except Exception as e:
            log.error(f"Supabase connexion échouée : {e}")
            return None
    return _client

def is_connected() -> bool:
    return get_client() is not None

# ══════════════════════════════════════════════════════════════════════════════
# STORAGE — Upload / Download fichiers
# ══════════════════════════════════════════════════════════════════════════════

def upload_file(local_path: Path, remote_name: str = None) -> bool:
    """Upload un fichier vers Supabase Storage."""
    client = get_client()
    if not client or not local_path.exists():
        return False
    remote = remote_name or local_path.name
    try:
        with open(local_path, "rb") as f:
            data = f.read()
        client.storage.from_(STORAGE_BUCKET).upload(
            remote, data,
            file_options={"upsert": "true",
                          "content-type": _mime(local_path)}
        )
        log.info(f"  ☁️  Storage upload OK : {remote}")
        return True
    except Exception as e:
        log.warning(f"  Storage upload échoué ({remote}) : {e}")
        return False

def download_file(remote_name: str, local_path: Path) -> bool:
    """Télécharge un fichier depuis Supabase Storage."""
    client = get_client()
    if not client:
        return False
    try:
        data = client.storage.from_(STORAGE_BUCKET).download(remote_name)
        local_path.write_bytes(data)
        log.info(f"  ☁️  Storage download OK : {remote_name} → {local_path.name}")
        return True
    except Exception as e:
        log.warning(f"  Storage download échoué ({remote_name}) : {e}")
        return False

def sync_files_on_startup(base_dir: Path):
    """Au démarrage : sync fichiers locaux depuis Supabase Storage."""
    if not is_connected():
        return
    # ai_learning.json (locatif)
    learning_path = base_dir / "ai_learning.json"
    if not learning_path.exists():
        log.info("ai_learning.json absent — téléchargement depuis Supabase...")
        download_file("ai_learning.json", learning_path)
    # ai_learning_travaux.json (travaux lourds)
    learning_travaux_path = base_dir / "ai_learning_travaux.json"
    if not learning_travaux_path.exists():
        log.info("ai_learning_travaux.json absent — téléchargement depuis Supabase...")
        download_file("ai_learning_travaux.json", learning_travaux_path)

def sync_files_after_save(base_dir: Path):
    """Après chaque sauvegarde : upload fichiers vers Storage."""
    if not is_connected():
        return
    for fname in ["ai_learning.json", "ai_learning_travaux.json", "progress.json"]:
        p = base_dir / fname
        if p.exists():
            upload_file(p)

def _mime(p: Path) -> str:
    ext = p.suffix.lower()
    return {
        ".json": "application/json",
        ".py":   "text/plain",
        ".log":  "text/plain",
    }.get(ext, "application/octet-stream")

# ══════════════════════════════════════════════════════════════════════════════
# TABLE BIENS — Upsert annonces
# ══════════════════════════════════════════════════════════════════════════════

def prop_to_row(prop: dict, params: dict = None) -> dict:
    """
    Convertit un dict de propriété scraper → ligne Supabase.
    Stocke uniquement les données brutes scraper + rendement_brut.
    Tous les calculs financement/fiscalité sont faits côté frontend JS.

    Colonnes communes (toutes stratégies) :
      - annee_construction  : année de construction du bien
      - dpe                 : lettre DPE (A à G)

    Colonnes stratégie Travaux lourds :
      - score_travaux       : score 1-5 attribué par l'IA
      - score_commentaire   : justification courte du score par l'IA
    """
    def _num(v):
        if v is None or v == "": return None
        try: return float(v)
        except: return None

    def _int(v):
        n = _num(v)
        return int(n) if n is not None else None

    def _date(v):
        if isinstance(v, datetime.date): return v.isoformat()
        if isinstance(v, str) and v:
            import re
            s = v.strip()
            m = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})$', s)
            if m:
                try:
                    import datetime as _dt
                    _dt.date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
                    return f"{m.group(3)}-{m.group(2).zfill(2)}-{m.group(1).zfill(2)}"
                except ValueError:
                    return None
            m2 = re.match(r'^\d{4}-\d{2}-\d{2}$', s)
            if m2: return s
            return None
        return None

    STATUTS_PRO  = {"Salarié", "Retraité", "Indépendant", "Etudiant", "Non précisé"}
    COMPOSITIONS = {"Seul", "Couple", "Famille", "Colocation", "Non précisé"}
    ANCIENNETES  = {"< 1 an", "1-3 ans", "3-5 ans", "5-10 ans", "> 10 ans", "Non précisé"}

    def _profil(v):
        if not v or not isinstance(v, str): return None
        parts = [p.strip() for p in v.split("|")]
        if len(parts) != 3: return None
        statut, compo, anciennete = parts
        statut     = statut     if statut     in STATUTS_PRO  else "Non précisé"
        compo      = compo      if compo      in COMPOSITIONS else "Non précisé"
        anciennete = anciennete if anciennete in ANCIENNETES  else "Non précisé"
        if statut == compo == anciennete == "Non précisé": return None
        if statut == "Non précisé" and compo == "Non précisé":
            return f"Locataire {anciennete}"
        if statut == "Non précisé":
            return f"{compo} | {anciennete}"
        if compo == "Non précisé":
            return f"{statut} | {anciennete}"
        return f"{statut} | {compo} | {anciennete}"

    def _dpe(v):
        """Normalise la lettre DPE : retourne A-G ou None."""
        if not v: return None
        s = str(v).strip().upper()
        return s if s in ("A", "B", "C", "D", "E", "F", "G") else None

    prix         = _num(prop.get("prix"))
    loyer_raw    = _num(prop.get("loyer"))
    charges_rec  = _num(prop.get("charges_rec"))
    type_loyer   = prop.get("type_loyer", "HC")
    surface      = _num(prop.get("surface"))

    # Si loyer CC et charges récupérables connues → déduire le loyer HC
    if loyer_raw and type_loyer == "CC" and charges_rec:
        loyer      = round(loyer_raw - charges_rec, 2)
        type_loyer = "HC"
    else:
        loyer = loyer_raw

    # Rendement brut = seul calcul stocké en base (toujours sur loyer HC)
    rev_brut       = loyer * 12 if loyer else None
    rendement_brut = round(rev_brut / prix, 4) if (rev_brut and prix) else None

    # Score travaux : validation 1-5
    score_travaux = _int(prop.get("score_travaux"))
    if score_travaux is not None and not (1 <= score_travaux <= 5):
        score_travaux = None

    return {
        # ── Identité ──────────────────────────────────────────────
        # id géré automatiquement par Supabase
        "statut":               "Toujours disponible",
        "url":                  prop.get("url"),
        "strategie_mdb":        prop.get("strategie_mdb"),
        "metropole":            prop.get("metropole"),
        "ville":                prop.get("ville"),
        "quartier":             prop.get("quartier"),
        "adresse":              prop.get("adresse"),
        "code_postal":          prop.get("code_postal"),
        # ── Caractéristiques bien ─────────────────────────────────
        "type_bien":            prop.get("type_bien"),
        "nb_pieces":            prop.get("nb_pieces"),       # TEXT ex: "T2"
        "etage":                prop.get("etage"),           # TEXT ex: "RDC"
        "surface":              _num(surface),
        "surface_terrain":      _num(prop.get("surface_terrain")),
        "annee_construction":   _int(prop.get("annee_construction")),
        "dpe":                  _dpe(prop.get("dpe")),                  # ← NOUVEAU
        # ── Prix ──────────────────────────────────────────────────
        "prix_fai":             _num(prix),
        "prix_m2":              round(prix / surface, 0) if (prix and surface) else None,
        # ── Locatif (stratégie Locataire en place) ────────────────
        "loyer":                _num(loyer),
        "type_loyer":           type_loyer,
        "charges_rec":          charges_rec,
        "charges_copro":        _num(prop.get("charges_cop")),
        "taxe_fonc_ann":        _num(prop.get("taxe_fonc")),
        "fin_bail":             _date(prop.get("bail_end")),
        "profil_locataire":     _profil(prop.get("profil_loc")),
        "rendement_brut":       rendement_brut,
        # ── Caractéristiques complémentaires ─────────────────────
        "ascenseur":            prop.get("ascenseur"),
        "acces_exterieur":      prop.get("acces_exterieur"),
        "type_chauffage":       prop.get("type_chauffage"),
        "mode_chauffage":       prop.get("mode_chauffage"),
        "nb_sdb":               _int(prop.get("nb_sdb")),
        "nb_chambres":          _int(prop.get("nb_chambres")),
        "ges":                  prop.get("ges"),
        "dpe_valeur":           _num(prop.get("dpe_valeur")),
        "budget_energie_min":   _num(prop.get("budget_energie_min")),
        "budget_energie_max":   _num(prop.get("budget_energie_max")),
        # ── Travaux ───────────────────────────────────────────────
        "score_travaux":        score_travaux,
        "score_commentaire":    prop.get("score_commentaire"),
        # ── Photos ────────────────────────────────────────────────
        "photo_url":            prop.get("photo_url"),
        "photo_storage_path":   prop.get("photo_storage_path"),
    }

def log_learning(url: str, description: str, resultat: dict, modele: str = "") -> bool:
    """Log un exemple d'extraction IA dans Supabase."""
    client = get_client()
    if not client:
        return False
    try:
        client.table(TABLE_LEARNING).insert({
            "url": url,
            "description": description[:500],
            "resultat": resultat,
            "modele": modele,
        }).execute()
        return True
    except Exception as e:
        log.warning(f"  Supabase learning log échoué : {e}")
        return False

# ══════════════════════════════════════════════════════════════════════════════
# PHOTOS — Téléchargement + Upload Storage
# ══════════════════════════════════════════════════════════════════════════════

def upload_photo(bien_id: str, photo_url: str, index: int = 0) -> str | None:
    """
    Télécharge une photo depuis Leboncoin et l'upload dans Supabase Storage.
    index=0 → cover, index=1,2 → photos supplémentaires pour analyse IA travaux
    Retourne le chemin Storage ou None si échec.
    """
    client = get_client()
    if not client or not photo_url:
        return None
    try:
        import urllib.request, urllib.error, hashlib as _hl
        suffix  = "cover" if index == 0 else f"p{index}"
        safe_id = _hl.md5(str(bien_id).encode()).hexdigest()[:12] if str(bien_id).startswith("http") else str(bien_id)
        remote_path = f"photos/{safe_id}_{suffix}.jpg"

        req = urllib.request.Request(
            photo_url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                "Referer": "https://www.leboncoin.fr/",
                "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            }
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            img_data = resp.read()

        if len(img_data) < 1000:
            log.warning(f"  Photo trop petite ({len(img_data)}o) pour {bien_id}")
            return None

        client.storage.from_(STORAGE_BUCKET).upload(
            remote_path,
            img_data,
            file_options={"upsert": "true", "content-type": "image/jpeg"}
        )
        log.info(f"  📷 Photo [{suffix}] uploadée : {remote_path} ({len(img_data)//1024}Ko)")
        return remote_path

    except Exception as e:
        log.warning(f"  Photo upload échoué ({bien_id} idx={index}) : {e}")
        return None

def fetch_photo_bytes(photo_url: str) -> bytes | None:
    """
    Télécharge une photo et retourne les bytes bruts (pour analyse IA).
    Ne stocke PAS dans Supabase.
    """
    if not photo_url:
        return None
    try:
        import urllib.request
        req = urllib.request.Request(
            photo_url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/120.0.0.0 Safari/537.36"
                ),
                "Referer": "https://www.leboncoin.fr/",
                "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            }
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
        return data if len(data) >= 1000 else None
    except Exception as e:
        log.debug(f"  fetch_photo_bytes échoué ({photo_url[:60]}) : {e}")
        return None

def get_photo_public_url(storage_path: str) -> str | None:
    """Retourne l'URL publique d'une photo depuis son chemin Storage."""
    if not storage_path or not SUPABASE_URL:
        return None
    client = get_client()
    if not client:
        return None
    try:
        res = client.storage.from_(STORAGE_BUCKET).create_signed_url(
            storage_path, expires_in=3600 * 24 * 7  # 7 jours
        )
        return res.get("signedURL")
    except Exception as e:
        log.warning(f"  Signed URL échouée ({storage_path}) : {e}")
        return None


# ══════════════════════════════════════════════════════════════════════════════
# FONCTIONS REQUÊTES TABLE BIENS
# ══════════════════════════════════════════════════════════════════════════════

def get_existing_urls() -> set:
    """Retourne toutes les URLs déjà en base."""
    client = get_client()
    if not client:
        return set()
    try:
        res = client.table(TABLE_BIENS).select("url").execute()
        return {r["url"] for r in res.data if r.get("url")}
    except Exception as e:
        log.warning(f"  get_existing_urls échoué : {e}")
        return set()

def get_existing_ids() -> int:
    """Retourne le max id numérique en base (pour incrémenter)."""
    client = get_client()
    if not client:
        return 0
    try:
        res = client.table(TABLE_BIENS).select("id").execute()
        ids = []
        for r in res.data:
            try:
                ids.append(int(r["id"]))
            except:
                pass
        return max(ids) if ids else 0
    except Exception as e:
        log.warning(f"  get_existing_ids échoué : {e}")
        return 0

def get_active_urls() -> list:
    """Retourne les biens actifs (statut = Toujours disponible) avec url + dates."""
    client = get_client()
    if not client:
        return []
    try:
        res = (client.table(TABLE_BIENS)
               .select("id, url, statut, updated_at, created_at, derniere_verif_statut")
               .eq("statut", "Toujours disponible")
               .execute())
        return res.data or []
    except Exception as e:
        log.warning(f"  get_active_urls échoué : {e}")
        return []

def upsert_biens_batch(props: list) -> bool:
    """
    Upsert une liste de biens en base. Cle de deduplication : url.
    L'id est genere automatiquement par Supabase.
    - URL nouvelle  : INSERT (Supabase assigne l'id)
    - URL existante : UPDATE sans toucher a l'id
    """
    client = get_client()
    if not client or not props:
        return False
    try:
        existing = get_existing_urls()
    except:
        existing = set()
    insert_rows, update_pairs = [], []
    for p in props:
        row = prop_to_row(p)
        if row.get("url") in existing:
            update_pairs.append((row["url"], row))
        else:
            insert_rows.append(row)
    try:
        if insert_rows:
            client.table(TABLE_BIENS).insert(insert_rows).execute()
            log.info(f"  ✅ Insert {len(insert_rows)} nouveau(x) bien(s)")
        for url, row in update_pairs:
            client.table(TABLE_BIENS).update(row).eq("url", url).execute()
            log.info(f"  ✅ Update bien existant ({url[-40:]})")
        return True
    except Exception as e:
        log.warning(f"  upsert_biens_batch échoué : {e}")
        return False

def update_statut(bien_id: str, statut: str) -> bool:
    """Met à jour le statut d'un bien (ex: Annonce expirée)."""
    client = get_client()
    if not client:
        return False
    try:
        client.table(TABLE_BIENS).update({"statut": statut}).eq("id", bien_id).execute()
        return True
    except Exception as e:
        log.warning(f"  update_statut échoué ({bien_id}) : {e}")
        return False

def update_derniere_verif(bien_id: str) -> bool:
    """Met à jour la date de dernière vérification de statut d'un bien."""
    client = get_client()
    if not client:
        return False
    try:
        now = datetime.datetime.utcnow().isoformat() + "Z"
        client.table(TABLE_BIENS).update({"derniere_verif_statut": now}).eq("id", bien_id).execute()
        return True
    except Exception as e:
        log.warning(f"  update_derniere_verif échoué ({bien_id}) : {e}")
        return False

def update_photo_storage_path(bien_url: str, storage_path: str) -> bool:
    """Met a jour le chemin Storage de la photo d'un bien (par URL)."""
    client = get_client()
    if not client:
        return False
    try:
        client.table(TABLE_BIENS).update({"photo_storage_path": storage_path}).eq("url", bien_url).execute()
        return True
    except Exception as e:
        log.warning(f"  update_photo_storage_path échoué : {e}")
        return False

def update_score_travaux(bien_id: str, score: int, commentaire: str = None) -> bool:
    """
    Met à jour le score travaux d'un bien (correction depuis le frontend utilisateur).
    Cette mise à jour alimente automatiquement le fichier ai_learning_travaux.json
    via sync_files_after_save() → le prochain run bénéficie de la correction.
    """
    client = get_client()
    if not client:
        return False
    try:
        update = {"score_travaux": score}
        if commentaire:
            update["score_commentaire"] = commentaire
        client.table(TABLE_BIENS).update(update).eq("id", bien_id).execute()
        log.info(f"  ✅ Score travaux mis à jour : [{bien_id}] → {score}")
        return True
    except Exception as e:
        log.warning(f"  update_score_travaux échoué ({bien_id}) : {e}")
        return False
