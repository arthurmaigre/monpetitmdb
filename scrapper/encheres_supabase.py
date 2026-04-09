"""
encheres_supabase.py — Module Supabase pour la table enchères judiciaires
Gère : upsert, dedup intra-source et cross-source, normalisation
"""
import os, json, logging, re, unicodedata
from datetime import datetime, timezone

log = logging.getLogger(__name__)

# Réutilise le client Supabase existant
from supabase_client import get_client

TABLE_ENCHERES = "encheres"


# ══════════════════════════════════════════════════════════════════════════════
# Normalisation pour dedup cross-source
# ══════════════════════════════════════════════════════════════════════════════

def _strip_accents(s: str) -> str:
    """Retire les accents d'une chaîne."""
    return "".join(
        c for c in unicodedata.normalize("NFD", s)
        if unicodedata.category(c) != "Mn"
    )

def normalize_tribunal(name: str) -> str:
    """Normalise le nom du tribunal pour dedup cross-source.
    Ex: 'Tribunal Judiciaire de TOURS' → 'tj tours'
    """
    if not name:
        return ""
    s = _strip_accents(name.lower().strip())
    # Retirer préfixes courants
    s = re.sub(r"^tribunal\s+(judiciaire|de grande instance|d'instance)\s+(de\s+|d')?", "tj ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def normalize_ville(name: str) -> str:
    """Normalise le nom de ville pour dedup cross-source.
    Ex: 'Saint-Jean-de-Védas' → 'saint jean de vedas'
    """
    if not name:
        return ""
    s = _strip_accents(name.lower().strip())
    s = s.replace("-", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s


# ══════════════════════════════════════════════════════════════════════════════
# Lecture existants (dedup)
# ══════════════════════════════════════════════════════════════════════════════

def get_existing_encheres(source: str = None) -> dict:
    """Retourne {id_source: id} pour dedup intra-source.
    Si source=None, retourne toutes les sources.
    """
    client = get_client()
    if not client:
        return {}
    try:
        q = client.table(TABLE_ENCHERES).select("id, source, id_source")
        if source:
            q = q.eq("source", source)
        # Pagination pour gros volumes
        result = {}
        offset = 0
        while True:
            r = q.range(offset, offset + 999).execute()
            rows = r.data or []
            if not rows:
                break
            for row in rows:
                key = f"{row['source']}:{row['id_source']}"
                result[key] = row["id"]
            offset += len(rows)
            if len(rows) < 1000:
                break
        return result
    except Exception as e:
        log.error(f"get_existing_encheres: {e}")
        return {}


def get_existing_urls() -> set:
    """Retourne l'ensemble des URLs déjà en base."""
    client = get_client()
    if not client:
        return set()
    try:
        urls = set()
        offset = 0
        while True:
            r = client.table(TABLE_ENCHERES).select("url").range(offset, offset + 999).execute()
            rows = r.data or []
            if not rows:
                break
            for row in rows:
                urls.add(row["url"])
            offset += len(rows)
            if len(rows) < 1000:
                break
        return urls
    except Exception as e:
        log.error(f"get_existing_urls: {e}")
        return set()


def get_cross_dedup_keys() -> set:
    """Retourne un set de (tribunal_norm, date_audience_iso, ville_norm) pour dedup cross-source."""
    client = get_client()
    if not client:
        return set()
    try:
        keys = set()
        offset = 0
        while True:
            r = client.table(TABLE_ENCHERES).select("tribunal, date_audience, ville") \
                .range(offset, offset + 999).execute()
            rows = r.data or []
            if not rows:
                break
            for row in rows:
                t = normalize_tribunal(row.get("tribunal") or "")
                d = (row.get("date_audience") or "")[:10]  # YYYY-MM-DD
                v = normalize_ville(row.get("ville") or "")
                if t and d and v:
                    keys.add((t, d, v))
            offset += len(rows)
            if len(rows) < 1000:
                break
        return keys
    except Exception as e:
        log.error(f"get_cross_dedup_keys: {e}")
        return set()


# ══════════════════════════════════════════════════════════════════════════════
# Upsert
# ══════════════════════════════════════════════════════════════════════════════

def _match_cross_source(item: dict, client) -> dict | None:
    """Cherche si le même bien existe déjà en base depuis une autre source.

    Matching par ville + date_audience (+ confirmation prix ±5%).
    Retourne la ligne existante si trouvée, None sinon.
    """
    ville = normalize_ville(item.get("ville") or "")
    date = (item.get("date_audience") or "")[:10]
    prix = item.get("mise_a_prix") or 0

    if not ville or not date:
        return None

    try:
        # Chercher par ville normalisée + date audience
        r = client.table(TABLE_ENCHERES).select("*") \
            .neq("source", item["source"]) \
            .eq("statut", "a_venir") \
            .execute()

        for row in (r.data or []):
            row_ville = normalize_ville(row.get("ville") or "")
            row_date = (row.get("date_audience") or "")[:10]
            row_prix = row.get("mise_a_prix") or 0

            if row_ville == ville and row_date == date:
                # Confirmer avec prix ±5%
                if prix and row_prix:
                    ratio = abs(prix - row_prix) / max(prix, row_prix, 1)
                    if ratio > 0.05:
                        continue  # Prix trop différent → pas le même bien
                return row

    except Exception as e:
        log.warning(f"match_cross_source: {e}")

    return None


# Champs qui peuvent être complétés par fusion cross-source
MERGEABLE_FIELDS = [
    "type_bien", "adresse", "ville", "code_postal", "departement",
    "surface", "nb_pieces", "nb_lots", "description", "occupation",
    "tribunal", "date_visite", "publication",
    "avocat_nom", "avocat_cabinet", "avocat_tel", "avocat_email",
    "latitude", "longitude", "photo_url",
]


def _build_source_entry(item: dict) -> dict:
    """Construit une entrée pour le champ sources JSONB."""
    return {
        "source": item.get("source"),
        "id_source": item.get("id_source"),
        "url": item.get("url"),
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }


def _add_source_to_list(existing_sources: list | str | None, new_entry: dict) -> list:
    """Ajoute une source à la liste si pas déjà présente."""
    if isinstance(existing_sources, str):
        existing_sources = json.loads(existing_sources)
    sources = existing_sources or []

    # Vérifier si cette source est déjà dans la liste
    for s in sources:
        if s.get("source") == new_entry["source"] and s.get("id_source") == new_entry["id_source"]:
            s["scraped_at"] = new_entry["scraped_at"]  # MAJ date
            return sources

    sources.append(new_entry)
    return sources


def _merge_into_existing(existing_row: dict, new_item: dict, client) -> bool:
    """Fusionne les données d'une nouvelle source dans un bien existant.

    Règle : ne complète que les champs NULL en base. N'écrase jamais.
    Ajoute la source dans le champ sources (JSONB) pour traçabilité.
    """
    update = {}

    for field in MERGEABLE_FIELDS:
        existing_val = existing_row.get(field)
        new_val = new_item.get(field)
        if not existing_val and new_val:
            update[field] = new_val

    # Documents : fusionner les listes de PDFs
    existing_docs = existing_row.get("documents") or []
    new_docs = new_item.get("documents") or []
    if new_docs:
        if isinstance(existing_docs, str):
            existing_docs = json.loads(existing_docs)
        existing_urls = {d.get("url") for d in existing_docs}
        added_docs = [d for d in new_docs if d.get("url") not in existing_urls]
        if added_docs:
            update["documents"] = existing_docs + added_docs

    # Sources : ajouter la nouvelle source à la liste
    new_entry = _build_source_entry(new_item)
    updated_sources = _add_source_to_list(existing_row.get("sources"), new_entry)
    update["sources"] = updated_sources

    update["updated_at"] = datetime.now(timezone.utc).isoformat()

    try:
        client.table(TABLE_ENCHERES).update(update) \
            .eq("id", existing_row["id"]).execute()
        fields_added = len([k for k in update if k not in ("sources", "updated_at")])
        log.info(f"  FUSION: {existing_row['source']}:{existing_row['id_source'][:20]} "
                 f"<- {new_item['source']}:{new_item['id_source'][:20]} "
                 f"(+{fields_added} champs, {len(updated_sources)} sources)")
        return True
    except Exception as e:
        log.error(f"merge error: {e}")
        return False


def upsert_encheres_batch(items: list, dry_run: bool = False) -> dict:
    """Upsert un batch d'enchères avec fusion cross-source.

    Logique :
    1. Si (source, id_source) existe → update (même source, refresh)
    2. Sinon, si même bien trouvé sur une autre source (ville+date+prix) → FUSION
       (compléter les champs NULL sans écraser)
    3. Sinon → insert (nouveau bien)

    Retourne {"inserted": N, "updated": N, "merged": N, "skipped": N, "errors": N}.
    """
    stats = {"inserted": 0, "updated": 0, "merged": 0, "skipped": 0, "errors": 0}

    if not items:
        return stats

    if dry_run:
        for item in items:
            log.info(f"[DRY-RUN] {item.get('source')}:{item.get('id_source')} — "
                     f"{item.get('ville', '?')} — {item.get('mise_a_prix', '?')}€")
            stats["inserted"] += 1
        return stats

    client = get_client()
    if not client:
        log.error("Supabase non connecté")
        stats["errors"] = len(items)
        return stats

    # Charger existants intra-source pour dedup rapide
    sources = set(item.get("source") for item in items)
    existing = {}
    for src in sources:
        existing.update(get_existing_encheres(src))

    now = datetime.now(timezone.utc).isoformat()

    for item in items:
        key = f"{item['source']}:{item['id_source']}"
        try:
            source_entry = _build_source_entry(item)

            if key in existing:
                # Même source, même ID → update (refresh données)
                # Protéger les champs corrigés par Sonnet (ne pas écraser)
                PROTECTED_IF_ENRICHED = {
                    "description", "ville", "occupation", "type_bien", "tribunal",
                    "enrichissement_data", "enrichissement_statut", "enrichissement_date",
                }
                update_data = {k: v for k, v in item.items()
                              if k not in ("id", "source", "id_source", "created_at", "sources")
                              and k not in PROTECTED_IF_ENRICHED
                              and v is not None}
                update_data["updated_at"] = now

                # MAJ scraped_at dans sources
                row = client.table(TABLE_ENCHERES).select("sources, enrichissement_statut") \
                    .eq("source", item["source"]) \
                    .eq("id_source", item["id_source"]).limit(1).execute()
                if row.data:
                    update_data["sources"] = _add_source_to_list(
                        row.data[0].get("sources"), source_entry)

                client.table(TABLE_ENCHERES).update(update_data) \
                    .eq("source", item["source"]) \
                    .eq("id_source", item["id_source"]).execute()
                stats["updated"] += 1
            else:
                # Chercher un match cross-source
                match = _match_cross_source(item, client)
                if match:
                    # Même bien sur une autre source → fusionner
                    merged = _merge_into_existing(match, item, client)
                    if merged:
                        stats["merged"] += 1
                    else:
                        stats["skipped"] += 1
                else:
                    # Nouveau bien → insert avec sources initialisé
                    item["created_at"] = now
                    item["updated_at"] = now
                    item["sources"] = [source_entry]
                    insert_data = {k: v for k, v in item.items() if v is not None}
                    client.table(TABLE_ENCHERES).insert(insert_data).execute()
                    stats["inserted"] += 1
        except Exception as e:
            err_msg = str(e)
            if "23505" in err_msg:
                stats["skipped"] += 1
            else:
                log.error(f"Upsert {key}: {e}")
                stats["errors"] += 1

    return stats


# ══════════════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════════════

def parse_prix(text: str) -> float | None:
    """Parse un prix depuis du texte. Ex: '67 000 €' → 67000.0"""
    if not text:
        return None
    # Nettoyer
    s = text.replace("\u202f", "").replace("\xa0", "").replace(" ", "")
    s = s.replace("€", "").replace(",", ".").strip()
    try:
        return float(s)
    except ValueError:
        return None

def parse_date_fr(text: str, year: int = None) -> str | None:
    """Parse une date française vers ISO. Ex: 'Jeudi 9 avril' → '2026-04-09T00:00:00Z'
    Ex: '30 mars 2026 à 14h00' → '2026-03-30T14:00:00Z'
    """
    if not text:
        return None

    MOIS = {
        "janvier": 1, "février": 2, "fevrier": 2, "mars": 3, "avril": 4,
        "mai": 5, "juin": 6, "juillet": 7, "août": 8, "aout": 8,
        "septembre": 9, "octobre": 10, "novembre": 11, "décembre": 12, "decembre": 12
    }

    text = text.lower().strip()

    # Format "DD/MM/YYYY" ou "DD/MM/YY"
    m = re.search(r"(\d{1,2})/(\d{1,2})/(\d{2,4})", text)
    if m:
        day, month, yr = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if yr < 100:
            yr += 2000
        # Chercher heure
        hm = re.search(r"(\d{1,2})[h:](\d{2})", text)
        hour = int(hm.group(1)) if hm else 0
        minute = int(hm.group(2)) if hm else 0
        try:
            dt = datetime(yr, month, day, hour, minute, tzinfo=timezone.utc)
            return dt.isoformat()
        except ValueError:
            return None

    # Format "jour DD mois YYYY à HHhMM"
    m = re.search(r"(\d{1,2})\s+(\w+)\s+(\d{4})", text)
    if m:
        day = int(m.group(1))
        mois_str = _strip_accents(m.group(2))
        yr = int(m.group(3))
        month = MOIS.get(mois_str)
        if month:
            hm = re.search(r"(\d{1,2})[h:](\d{2})", text)
            hour = int(hm.group(1)) if hm else 0
            minute = int(hm.group(2)) if hm else 0
            try:
                dt = datetime(yr, month, day, hour, minute, tzinfo=timezone.utc)
                return dt.isoformat()
            except ValueError:
                return None

    # Format "Jour DD mois" (sans année — utiliser année courante ou passée en param)
    m = re.search(r"(\d{1,2})\s+(\w+)", text)
    if m:
        day = int(m.group(1))
        mois_str = _strip_accents(m.group(2))
        month = MOIS.get(mois_str)
        if month:
            yr = year or datetime.now().year
            hm = re.search(r"(\d{1,2})[h:](\d{2})", text)
            hour = int(hm.group(1)) if hm else 0
            minute = int(hm.group(2)) if hm else 0
            try:
                dt = datetime(yr, month, day, hour, minute, tzinfo=timezone.utc)
                return dt.isoformat()
            except ValueError:
                return None

    return None

def extract_id_from_url(url: str, pattern: str) -> str | None:
    """Extrait un ID depuis une URL avec un pattern regex."""
    m = re.search(pattern, url)
    return m.group(1) if m else None
