"""
encheres_supabase.py — Module Supabase pour la table enchères judiciaires

Dedup INTRA-SOURCE uniquement (source + id_source).
La dedup cross-source se fait APRÈS l'extraction Sonnet (dedup_cross_source.py).
"""
import os, json, logging, re, unicodedata
from datetime import datetime, timezone

log = logging.getLogger(__name__)

from supabase_client import get_client

TABLE_ENCHERES = "encheres"


# ══════════════════════════════════════════════════════════════════════════════
# Lecture existants (dedup intra-source)
# ══════════════════════════════════════════════════════════════════════════════

def get_existing_encheres(source: str) -> dict:
    """Retourne {id_source: id} pour dedup intra-source."""
    client = get_client()
    if not client:
        return {}
    try:
        result = {}
        offset = 0
        while True:
            r = client.table(TABLE_ENCHERES).select("id, id_source") \
                .eq("source", source) \
                .range(offset, offset + 999).execute()
            rows = r.data or []
            if not rows:
                break
            for row in rows:
                result[row["id_source"]] = row["id"]
            offset += len(rows)
            if len(rows) < 1000:
                break
        return result
    except Exception as e:
        log.error(f"get_existing_encheres: {e}")
        return {}


def get_all_id_sources(source: str) -> set:
    """Retourne l'ensemble des id_source en base pour une source donnée.
    Utilisé pour détecter les biens disparus (→ expire).
    """
    client = get_client()
    if not client:
        return set()
    try:
        ids = set()
        offset = 0
        while True:
            r = client.table(TABLE_ENCHERES).select("id_source") \
                .eq("source", source) \
                .in_("statut", ["a_venir", "surenchere"]) \
                .range(offset, offset + 999).execute()
            rows = r.data or []
            if not rows:
                break
            for row in rows:
                ids.add(row["id_source"])
            offset += len(rows)
            if len(rows) < 1000:
                break
        return ids
    except Exception as e:
        log.error(f"get_all_id_sources: {e}")
        return set()


# ══════════════════════════════════════════════════════════════════════════════
# Upsert — Dedup intra-source uniquement
# ══════════════════════════════════════════════════════════════════════════════

# Champs fiables qui peuvent être mis à jour à chaque scraping
UPDATABLE_FIELDS = {
    "mise_a_prix", "prix_adjuge", "date_audience", "date_visite",
    "date_surenchere", "mise_a_prix_surenchere", "consignation",
    "latitude", "longitude", "photo_url", "documents",
}

# Champs protégés : peuplés par Sonnet, jamais écrasés par le scraping
SONNET_FIELDS = {
    "ville", "tribunal", "type_bien", "adresse", "code_postal", "departement",
    "occupation", "surface", "nb_pieces", "nb_lots", "nb_chambres",
    "avocat_nom", "avocat_cabinet", "avocat_tel",
    "enrichissement_data", "enrichissement_statut", "enrichissement_date",
    "lots_data", "loyer", "score_travaux",
}


def _build_source_entry(item: dict) -> dict:
    """Construit une entrée pour le champ sources JSONB."""
    return {
        "source": item.get("source"),
        "id_source": item.get("id_source"),
        "url": item.get("url"),
        "scraped_at": datetime.now(timezone.utc).isoformat(),
    }


def upsert_encheres_batch(items: list, dry_run: bool = False) -> dict:
    """Upsert un batch d'enchères avec dedup INTRA-SOURCE uniquement.

    - Si (source, id_source) existe → UPDATE champs fiables (pas les champs Sonnet)
    - Sinon → INSERT (nouveau bien, enrichissement_statut = NULL)

    La dedup cross-source est gérée par dedup_cross_source.py après Sonnet.
    """
    stats = {"inserted": 0, "updated": 0, "skipped": 0, "errors": 0}

    if not items:
        return stats

    if dry_run:
        for item in items:
            log.info(f"[DRY-RUN] {item.get('source')}:{item.get('id_source')} — "
                     f"{item.get('mise_a_prix', '?')}€")
            stats["inserted"] += 1
        return stats

    client = get_client()
    if not client:
        log.error("Supabase non connecté")
        stats["errors"] = len(items)
        return stats

    # Charger existants intra-source
    sources = set(item.get("source") for item in items)
    existing = {}
    for src in sources:
        existing.update({k: v for k, v in get_existing_encheres(src).items()})

    now = datetime.now(timezone.utc).isoformat()

    for item in items:
        id_source = item["id_source"]
        try:
            source_entry = _build_source_entry(item)

            if id_source in existing:
                # UPDATE : seulement les champs fiables du scraping
                update_data = {}
                for key, val in item.items():
                    if key in UPDATABLE_FIELDS and val is not None:
                        update_data[key] = val

                # Statut : mettre à jour si prix_adjuge apparaît
                if item.get("prix_adjuge") and item.get("statut"):
                    update_data["statut"] = item["statut"]

                update_data["updated_at"] = now

                # Fetch existant pour sources + check enrichissement
                row = client.table(TABLE_ENCHERES).select("sources, enrichissement_statut") \
                    .eq("source", item["source"]) \
                    .eq("id_source", id_source).limit(1).execute()

                # Description : écraser uniquement si pas encore enrichi par Sonnet
                if row.data and row.data[0].get("enrichissement_statut") != "ok":
                    if item.get("description"):
                        update_data["description"] = item["description"]

                # MAJ sources JSONB
                if row.data:
                    old_sources = row.data[0].get("sources") or []
                    if isinstance(old_sources, str):
                        old_sources = json.loads(old_sources)
                    # Mettre à jour la date de scraping
                    found = False
                    for s in old_sources:
                        if s.get("source") == source_entry["source"]:
                            s["scraped_at"] = source_entry["scraped_at"]
                            found = True
                            break
                    if not found:
                        old_sources.append(source_entry)
                    update_data["sources"] = old_sources

                client.table(TABLE_ENCHERES).update(update_data) \
                    .eq("source", item["source"]) \
                    .eq("id_source", id_source).execute()
                stats["updated"] += 1

            else:
                # INSERT : nouveau bien
                insert_data = {k: v for k, v in item.items() if v is not None}
                insert_data["created_at"] = now
                insert_data["updated_at"] = now
                insert_data["sources"] = [source_entry]
                insert_data["statut"] = insert_data.get("statut", "a_venir")

                client.table(TABLE_ENCHERES).insert(insert_data).execute()
                stats["inserted"] += 1

        except Exception as e:
            err_msg = str(e)
            if "23505" in err_msg:
                stats["skipped"] += 1
            else:
                log.error(f"Upsert {item['source']}:{id_source}: {e}")
                stats["errors"] += 1

    return stats


def mark_expired(source: str, active_id_sources: set) -> int:
    """Marque comme 'expire' les enchères qui ont disparu du listing.

    Compare les id_source actifs en base avec ceux du scraping.
    Retourne le nombre de biens marqués expirés.
    """
    client = get_client()
    if not client:
        return 0

    existing = get_all_id_sources(source)
    disappeared = existing - active_id_sources

    if not disappeared:
        return 0

    now = datetime.now(timezone.utc).isoformat()
    count = 0
    for id_source in disappeared:
        try:
            client.table(TABLE_ENCHERES).update({
                "statut": "expire",
                "updated_at": now,
            }).eq("source", source).eq("id_source", id_source).execute()
            count += 1
        except Exception as e:
            log.error(f"mark_expired {source}:{id_source}: {e}")

    log.info(f"{source}: {count} enchères marquées expirées")
    return count


# ══════════════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════════════

def _strip_accents(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", s)
        if unicodedata.category(c) != "Mn"
    )

def parse_prix(text: str) -> float | None:
    if not text:
        return None
    s = text.replace("\u202f", "").replace("\xa0", "").replace(" ", "")
    s = s.replace("€", "").replace(",", ".").strip()
    try:
        return float(s)
    except ValueError:
        return None

def parse_date_fr(text: str, year: int = None) -> str | None:
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
        hm = re.search(r"(\d{1,2})[h:](\d{2})", text)
        hour = int(hm.group(1)) if hm else 0
        minute = int(hm.group(2)) if hm else 0
        try:
            dt = datetime(yr, month, day, hour, minute, tzinfo=timezone.utc)
            return dt.isoformat()
        except ValueError:
            return None

    # Format "DD mois YYYY"
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

    # Format "DD mois" (sans année)
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
