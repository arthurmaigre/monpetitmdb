"""
batch_dedup_cross.py — Déduplication cross-source APRÈS extraction Sonnet

Tourne après batch_extraction_encheres.py.
Utilise les données propres de Sonnet (ville, date_audience, mise_a_prix)
pour détecter et fusionner les doublons entre Licitor, Avoventes et Vench.

Usage :
  python batch_dedup_cross.py                # Production
  python batch_dedup_cross.py --dry-run      # Afficher les fusions sans écrire
"""
import os, json, logging, re, unicodedata, argparse
from pathlib import Path
from datetime import datetime, timezone
from collections import defaultdict

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from supabase_client import get_client

log = logging.getLogger("dedup_cross")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

TABLE = "encheres"


def _strip_accents(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", s)
        if unicodedata.category(c) != "Mn"
    )


def normalize_ville(name: str) -> str:
    """Normalise le nom de ville pour matching.
    "Saint-Jean-de-Védas" → "saint jean de vedas"
    """
    if not name:
        return ""
    s = _strip_accents(name.lower().strip())
    s = s.replace("-", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def normalize_tribunal(name: str) -> str:
    """Normalise le tribunal pour matching.
    "Tribunal Judiciaire de Tours" → "tj tours"
    """
    if not name:
        return ""
    s = _strip_accents(name.lower().strip())
    s = re.sub(r"^tribunal\s+(judiciaire|de grande instance|d'instance)\s+(de\s+|d')?", "tj ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def load_enriched_encheres() -> list[dict]:
    """Charge toutes les enchères enrichies par Sonnet."""
    client = get_client()
    if not client:
        return []

    all_rows = []
    offset = 0
    while True:
        r = client.table(TABLE).select(
            "id, source, id_source, url, ville, tribunal, date_audience, "
            "mise_a_prix, type_bien, surface, statut, sources, documents, "
            "description, code_postal, departement, adresse, "
            "avocat_nom, avocat_cabinet, avocat_tel, "
            "photo_url, latitude, longitude, "
            "nb_pieces, nb_lots, nb_chambres, occupation, loyer, "
            "enrichissement_statut, enrichissement_data, created_at"
        ).eq("enrichissement_statut", "ok") \
         .range(offset, offset + 999).execute()
        rows = r.data or []
        if not rows:
            break
        all_rows.extend(rows)
        offset += len(rows)
        if len(rows) < 1000:
            break

    return all_rows


def find_duplicates(rows: list[dict]) -> list[list[dict]]:
    """Trouve les groupes de doublons cross-source.

    Matching : ville normalisée + date_audience (même jour) + prix ±5%
    Un groupe = même bien vu sur plusieurs sources.
    """
    # Indexer par (ville_norm, date_audience_date)
    index = defaultdict(list)
    for row in rows:
        ville = normalize_ville(row.get("ville") or "")
        date = (row.get("date_audience") or "")[:10]  # YYYY-MM-DD
        if ville and date:
            index[(ville, date)].append(row)

    groups = []
    for key, candidates in index.items():
        if len(candidates) < 2:
            continue

        # Vérifier que ce sont des sources différentes
        sources = set(c["source"] for c in candidates)
        if len(sources) < 2:
            continue

        # Sous-grouper par prix ±5%
        used = set()
        for i, a in enumerate(candidates):
            if i in used:
                continue
            group = [a]
            used.add(i)
            prix_a = a.get("mise_a_prix") or 0

            for j, b in enumerate(candidates):
                if j in used or b["source"] == a["source"]:
                    continue
                prix_b = b.get("mise_a_prix") or 0

                # Si les deux ont un prix, vérifier ±5%
                if prix_a and prix_b:
                    ratio = abs(prix_a - prix_b) / max(prix_a, prix_b, 1)
                    if ratio > 0.05:
                        continue

                group.append(b)
                used.add(j)

            if len(group) > 1:
                groups.append(group)

    return groups


def choose_master(group: list[dict]) -> tuple[dict, list[dict]]:
    """Choisit le master dans un groupe de doublons.

    Priorité : le plus ancien (premier inséré) = le plus de données historiques.
    """
    sorted_group = sorted(group, key=lambda x: x.get("created_at") or "")
    return sorted_group[0], sorted_group[1:]


# Champs qui peuvent être complétés depuis un doublon
MERGEABLE_FIELDS = [
    "adresse", "code_postal", "departement",
    "surface", "nb_pieces", "nb_lots", "nb_chambres",
    "occupation", "loyer",
    "avocat_nom", "avocat_cabinet", "avocat_tel",
    "latitude", "longitude", "photo_url",
    "type_bien",
]


def merge_into_master(master: dict, duplicates: list[dict], client, dry_run: bool = False) -> bool:
    """Fusionne les doublons dans le master.

    1. Complète les champs NULL du master avec les données des doublons
    2. Fusionne les documents PDF (union)
    3. Fusionne les sources JSONB
    4. Supprime les doublons
    """
    update = {}
    now = datetime.now(timezone.utc).isoformat()

    # 1. Compléter les champs NULL
    for field in MERGEABLE_FIELDS:
        if not master.get(field):
            for dup in duplicates:
                if dup.get(field):
                    update[field] = dup[field]
                    break

    # 2. Fusionner les documents PDF
    master_docs = master.get("documents") or []
    if isinstance(master_docs, str):
        master_docs = json.loads(master_docs)
    existing_urls = {d.get("url") for d in master_docs}

    for dup in duplicates:
        dup_docs = dup.get("documents") or []
        if isinstance(dup_docs, str):
            dup_docs = json.loads(dup_docs)
        for doc in dup_docs:
            if doc.get("url") not in existing_urls:
                master_docs.append(doc)
                existing_urls.add(doc.get("url"))

    if len(master_docs) > len(master.get("documents") or []):
        update["documents"] = master_docs

    # 3. Fusionner les sources JSONB
    master_sources = master.get("sources") or []
    if isinstance(master_sources, str):
        master_sources = json.loads(master_sources)
    existing_source_keys = {(s.get("source"), s.get("id_source")) for s in master_sources}

    for dup in duplicates:
        dup_sources = dup.get("sources") or []
        if isinstance(dup_sources, str):
            dup_sources = json.loads(dup_sources)
        for s in dup_sources:
            key = (s.get("source"), s.get("id_source"))
            if key not in existing_source_keys:
                master_sources.append(s)
                existing_source_keys.add(key)
        # Ajouter la source du doublon elle-même si pas dans la liste
        dup_key = (dup["source"], dup["id_source"])
        if dup_key not in existing_source_keys:
            master_sources.append({
                "source": dup["source"],
                "id_source": dup["id_source"],
                "url": dup["url"],
                "scraped_at": now,
            })
            existing_source_keys.add(dup_key)

    update["sources"] = master_sources
    update["updated_at"] = now

    dup_ids = [d["id"] for d in duplicates]
    dup_info = ", ".join(f"{d['source']}:{d['id_source'][:20]}" for d in duplicates)

    log.info(f"FUSION: master={master['source']}:{master['id_source'][:20]} "
             f"← {dup_info} "
             f"(+{len([k for k in update if k not in ('sources', 'updated_at')])} champs, "
             f"{len(master_sources)} sources)")

    if dry_run:
        return True

    try:
        # Update master
        client.table(TABLE).update(update).eq("id", master["id"]).execute()

        # Supprimer les doublons
        for dup_id in dup_ids:
            client.table(TABLE).delete().eq("id", dup_id).execute()

        return True
    except Exception as e:
        log.error(f"Erreur fusion master {master['id']}: {e}")
        return False


def run(dry_run: bool = False) -> dict:
    """Lance la déduplication cross-source."""
    stats = {"groups_found": 0, "merged": 0, "duplicates_removed": 0, "errors": 0}

    log.info("Chargement des enchères enrichies...")
    rows = load_enriched_encheres()
    log.info(f"{len(rows)} enchères enrichies en base")

    if len(rows) < 2:
        log.info("Pas assez de données pour la dédup")
        return stats

    log.info("Recherche de doublons cross-source...")
    groups = find_duplicates(rows)
    stats["groups_found"] = len(groups)
    log.info(f"{len(groups)} groupes de doublons détectés")

    if not groups:
        return stats

    client = get_client()
    if not client and not dry_run:
        log.error("Supabase non connecté")
        return stats

    for group in groups:
        master, duplicates = choose_master(group)
        ok = merge_into_master(master, duplicates, client, dry_run=dry_run)
        if ok:
            stats["merged"] += 1
            stats["duplicates_removed"] += len(duplicates)
        else:
            stats["errors"] += 1

    log.info(f"Dédup terminée: {json.dumps(stats)}")
    return stats


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Dédup cross-source enchères (post-Sonnet)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    run(dry_run=args.dry_run)
