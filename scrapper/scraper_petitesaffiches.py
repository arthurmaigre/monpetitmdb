"""
scraper_petitesaffiches.py — Scraper pour Petites Affiches (enchères judiciaires)
Source : https://www.petitesaffiches.fr/encheres-immobilieres/
~420 annonces actives + résultats adjudications (historique massif).
Gratuit, HTML classique, pagination simple.
"""
import os, sys, re, json, time, logging, argparse
from pathlib import Path
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from encheres_supabase import (
    upsert_encheres_batch, parse_prix, parse_date_fr, get_existing_encheres
)

log = logging.getLogger("petitesaffiches")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

BASE_URL = "https://www.petitesaffiches.fr/encheres-immobilieres"
SOURCE = "petitesaffiches"
DELAY = 1.0

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9",
}


# ══════════════════════════════════════════════════════════════════════════════
# Phase 1 : Collecte des URLs depuis le listing
# ══════════════════════════════════════════════════════════════════════════════

def fetch_page(url: str, session: requests.Session) -> BeautifulSoup | None:
    """Fetch une page et retourne le soup, ou None si erreur."""
    try:
        r = session.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        return BeautifulSoup(r.text, "html.parser")
    except Exception as e:
        log.warning(f"Erreur fetch {url}: {e}")
        return None


def collect_listing_urls(session: requests.Session, include_adjudications: bool = False) -> list[str]:
    """Parcourt le listing des enchères actives et collecte les URLs."""
    all_urls = []

    # Enchères actives
    log.info("Collecte enchères actives...")
    page = 1
    while True:
        url = f"{BASE_URL}/ventes-aux-encheres-immobilieres-p{page}.html"
        log.info(f"Listing page {page}")

        soup = fetch_page(url, session)
        if not soup:
            break

        # Pattern : /vente/immobiliere/judiciaire/slug-ID.html
        links = soup.find_all("a", href=re.compile(r"/vente/immobiliere/"))
        page_urls = []
        for link in links:
            href = link.get("href", "")
            if href.startswith("/"):
                href = "https://www.petitesaffiches.fr" + href
            if href not in all_urls and href not in page_urls:
                page_urls.append(href)

        if not page_urls:
            log.info(f"Page {page} : aucune annonce, fin")
            break

        all_urls.extend(page_urls)
        log.info(f"Page {page} : {len(page_urls)} annonces (total: {len(all_urls)})")
        page += 1
        time.sleep(DELAY)

    # Résultats adjudications (optionnel — historique massif)
    if include_adjudications:
        log.info("Collecte résultats adjudications (pages récentes)...")
        # Limiter aux 10 premières pages (les plus récentes)
        for adj_page in range(1, 11):
            url = f"{BASE_URL}/resultats-adjudications-p{adj_page}.html"
            soup = fetch_page(url, session)
            if not soup:
                break

            links = soup.find_all("a", href=re.compile(r"/vente/immobiliere/"))
            count = 0
            for link in links:
                href = link.get("href", "")
                if href.startswith("/"):
                    href = "https://www.petitesaffiches.fr" + href
                if href not in all_urls:
                    all_urls.append(href)
                    count += 1

            log.info(f"Adjudications p{adj_page}: +{count} (total: {len(all_urls)})")
            if count == 0:
                break
            time.sleep(DELAY)

    log.info(f"✅ {len(all_urls)} URLs collectées")
    return all_urls


# ══════════════════════════════════════════════════════════════════════════════
# Extraction depuis la page listing (données dans les cards)
# ══════════════════════════════════════════════════════════════════════════════

def extract_from_listing_page(session: requests.Session, include_adjudications: bool = False) -> list[dict]:
    """Extrait les données directement depuis les pages listing (sans aller sur les pages détail).
    Utile car les pages listing contiennent déjà beaucoup d'infos.
    """
    items = []

    # Enchères actives
    page = 1
    while True:
        url = f"{BASE_URL}/ventes-aux-encheres-immobilieres-p{page}.html"
        soup = fetch_page(url, session)
        if not soup:
            break

        cards = _parse_listing_cards(soup, is_adjudication=False)
        if not cards:
            break

        items.extend(cards)
        log.info(f"Listing p{page}: {len(cards)} annonces extraites")
        page += 1
        time.sleep(DELAY)

    # Adjudications
    if include_adjudications:
        for adj_page in range(1, 11):
            url = f"{BASE_URL}/resultats-adjudications-p{adj_page}.html"
            soup = fetch_page(url, session)
            if not soup:
                break

            cards = _parse_listing_cards(soup, is_adjudication=True)
            if not cards:
                break

            items.extend(cards)
            log.info(f"Adjudications p{adj_page}: {len(cards)} résultats")
            time.sleep(DELAY)

    return items


def _parse_listing_cards(soup: BeautifulSoup, is_adjudication: bool = False) -> list[dict]:
    """Parse les cards d'annonces d'une page listing."""
    items = []
    text_full = soup.get_text(" ", strip=True)

    # Trouver tous les liens d'annonces avec leur contexte
    links = soup.find_all("a", href=re.compile(r"/vente/immobiliere/judiciaire/"))
    seen_urls = set()

    for link in links:
        href = link.get("href", "")
        if href.startswith("/"):
            href = "https://www.petitesaffiches.fr" + href
        if href in seen_urls:
            continue
        seen_urls.add(href)

        # Extraire l'ID depuis l'URL : /slug-XXXXX.html
        id_source = extract_id(href)
        if not id_source:
            continue

        item = {
            "source": SOURCE,
            "id_source": id_source,
            "url": href,
        }

        # Titre depuis le lien
        titre = link.get_text(strip=True)
        if titre:
            item["type_bien"] = _extract_type_bien(titre)

        # Référence
        m = re.search(r"Ref\.\s*:\s*(\d+)", titre)
        if m:
            item["id_source"] = m.group(1)

        # Récupérer le contexte autour du lien (parent ou siblings)
        parent = link.parent
        if parent:
            context = parent.get_text(" ", strip=True)
        else:
            context = titre

        # Mise à prix
        m = re.search(r"[Mm]ise\s+[àa]\s+[Pp]rix\s*:?\s*([\d\s.,]+)\s*€", context)
        if m:
            item["mise_a_prix"] = parse_prix(m.group(1))

        # Prix adjugé (adjudications)
        if is_adjudication:
            m = re.search(r"[Aa]djudication\s*:?\s*([\d\s.,*]+)\s*€", context)
            if m:
                prix_text = m.group(1).replace("*", "")
                prix = parse_prix(prix_text)
                if prix and prix > 0:
                    item["prix_adjuge"] = prix
                    item["statut"] = "vendu"

        # Tribunal
        m = re.search(r"[Ll]ieu\s+de\s+vente\s*:?\s*(?:TJ\s+(?:DE\s+)?|Tribunal\s+Judiciaire\s+(?:de\s+)?)([A-ZÀ-Úa-zà-ú\s\-]+?)(?:\s*$|\s*Type)", context)
        if m:
            item["tribunal"] = f"TJ de {m.group(1).strip()}"

        # Ville (depuis "Adresse : Ville" avec lien maps)
        m = re.search(r"[Aa]dresse\s*:?\s*([A-ZÀ-Úa-zà-ú\s\-]+)", context)
        if m:
            item["ville"] = m.group(1).strip()

        # Date de vente
        m = re.search(r"[Dd]ate\s+de\s+vente\s*:?\s*(\d{1,2}/\d{1,2}/\d{2,4})", context)
        if m:
            item["date_audience"] = parse_date_fr(m.group(1))

        # Publication légale
        m = re.search(r"[Pp]ub\.\s*l[ée]gale\s*:?\s*(\d{1,2}/\d{1,2}/\d{2,4})", context)
        if m:
            item["publication"] = m.group(1)

        items.append(item)

    return items


# ══════════════════════════════════════════════════════════════════════════════
# Phase 2 : Scraping des pages détail (enrichissement)
# ══════════════════════════════════════════════════════════════════════════════

def extract_id(url: str) -> str | None:
    """Extrait l'ID numérique de l'URL.
    Ex: /vente/immobiliere/judiciaire/une-maison-56734.html → '56734'
    """
    m = re.search(r"-(\d{4,})\.html", url)
    return m.group(1) if m else None


def scrape_detail(url: str, session: requests.Session) -> dict | None:
    """Scrape une page détail Petites Affiches pour enrichir les données."""
    soup = fetch_page(url, session)
    if not soup:
        return None

    text = soup.get_text(" ", strip=True)

    id_source = extract_id(url)
    if not id_source:
        return None

    item = {
        "source": SOURCE,
        "id_source": id_source,
        "url": url,
    }

    # ── Type de bien ─────────────────────────────────────────────────────────
    h1 = soup.find("h1")
    if h1:
        titre = h1.get_text(strip=True)
        item["type_bien"] = _extract_type_bien(titre)

    # ── Mise à prix ──────────────────────────────────────────────────────────
    m = re.search(r"[Mm]ise\s+[àa]\s+[Pp]rix\s*:?\s*([\d\s.,]+)\s*€", text)
    if m:
        item["mise_a_prix"] = parse_prix(m.group(1))

    # ── Prix adjugé ──────────────────────────────────────────────────────────
    m = re.search(r"[Aa]djudication\s*:?\s*([\d\s.,]+)\s*€", text)
    if m:
        prix = parse_prix(m.group(1))
        if prix and prix > 0:
            item["prix_adjuge"] = prix
            item["statut"] = "vendu"

    # ── Tribunal ─────────────────────────────────────────────────────────────
    m = re.search(r"(?:TJ|Tribunal\s+Judiciaire)\s+(?:DE\s+|de\s+|d')([A-ZÀ-Úa-zà-ú\s\-]+?)(?:\s*,|\s*\d|\s*$)", text)
    if m:
        item["tribunal"] = f"TJ de {m.group(1).strip()}"

    # ── Avocat ───────────────────────────────────────────────────────────────
    m = re.search(r"[Aa]vocat\s+[Pp]oursuivant\s*:?\s*(?:Maître|Me|Mtre)?\s*([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s\-]+)", text)
    if m:
        item["avocat_nom"] = m.group(1).strip()

    m = re.search(r"(?:\+33|0)\s*\d[\d\s.()-]{8,}", text)
    if m:
        item["avocat_tel"] = m.group(0).strip()

    # ── Ville / Adresse ──────────────────────────────────────────────────────
    m = re.search(r"(\d{5})\s+([A-ZÀ-Úa-zà-ú\s\-]+)", text)
    if m:
        item["code_postal"] = m.group(1)
        item["ville"] = m.group(2).strip()

    # Adresse depuis le slug
    if not item.get("ville"):
        slug = url.split("/")[-1].replace(".html", "")
        m = re.search(r"-a-(.+?)(?:-\d+$)", slug)
        if m:
            item["ville"] = m.group(1).replace("-", " ").title()

    # ── Date de vente ────────────────────────────────────────────────────────
    m = re.search(r"[Dd]ate\s+de\s+vente\s*:?\s*(\d{1,2}/\d{1,2}/\d{2,4})", text)
    if m:
        item["date_audience"] = parse_date_fr(m.group(1))

    # ── Occupation ───────────────────────────────────────────────────────────
    text_lower = text.lower()
    if "occupé" in text_lower or "occupe" in text_lower:
        item["occupation"] = "occupe"
    elif "loué" in text_lower or "loue" in text_lower:
        item["occupation"] = "loue"
    elif "libre" in text_lower or "vacant" in text_lower:
        item["occupation"] = "libre"

    # ── Surface ──────────────────────────────────────────────────────────────
    m = re.search(r"(\d+[,.]?\d*)\s*m[²2]", text)
    if m:
        item["surface"] = float(m.group(1).replace(",", "."))

    # ── Photos ───────────────────────────────────────────────────────────────
    slider = soup.find(class_=re.compile(r"slider|bxSlider|gallery", re.I))
    if slider:
        img = slider.find("img")
        if img:
            src = img.get("src", "") or img.get("data-src", "")
            if src and not src.startswith("data:"):
                if src.startswith("/"):
                    src = "https://www.petitesaffiches.fr" + src
                item["photo_url"] = src

    return item


def _extract_type_bien(titre: str) -> str:
    """Déduit le type de bien depuis le titre."""
    t = titre.lower()
    if "appartement" in t:
        return "Appartement"
    elif "maison" in t or "pavillon" in t or "villa" in t:
        return "Maison"
    elif "immeuble" in t:
        return "Immeuble"
    elif "terrain" in t:
        return "Terrain"
    elif "local" in t and "commercial" in t:
        return "Local commercial"
    elif "parking" in t or "garage" in t or "box" in t:
        return "Parking"
    elif "bureau" in t:
        return "Bureau"
    elif "studio" in t:
        return "Appartement"
    elif "propriété" in t or "propriete" in t:
        return "Maison"
    elif "grenier" in t:
        return "Autre"
    elif "habitation" in t:
        return "Maison"
    return "Autre"


# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════

def run(dry_run: bool = False, limit: int = None, include_adjudications: bool = False,
        enrich_details: bool = True) -> dict:
    """Lance le scraping Petites Affiches.

    Args:
        enrich_details: Si True, scrape aussi les pages détail pour enrichir les données.
                       Si False, utilise uniquement les données du listing (plus rapide).
    """
    session = requests.Session()

    # Phase 1 : extraire depuis les listings
    log.info("═══ Phase 1 : Extraction depuis listings ═══")
    items = extract_from_listing_page(session, include_adjudications=include_adjudications)
    log.info(f"{len(items)} annonces extraites des listings")

    if limit:
        items = items[:limit]
        log.info(f"Limité à {limit} annonces")

    # Phase 2 : enrichir avec les pages détail (optionnel)
    if enrich_details:
        log.info(f"═══ Phase 2 : Enrichissement depuis {len(items)} pages détail ═══")
        enriched_items = []
        for i, item in enumerate(items, 1):
            detail = scrape_detail(item["url"], session)
            if detail:
                # Merger : les données détail complètent les données listing
                merged = {**item, **{k: v for k, v in detail.items() if v is not None}}
                enriched_items.append(merged)
                log.info(f"[{i}/{len(items)}] ✅ {merged.get('ville', '?')} — "
                         f"{merged.get('mise_a_prix', '?')}€")
            else:
                enriched_items.append(item)  # Garder les données listing
                log.info(f"[{i}/{len(items)}] ⚠️ Détail indisponible, listing conservé")

            if i < len(items):
                time.sleep(DELAY)

        items = enriched_items

    # Phase 3 : upsert
    log.info(f"═══ Phase 3 : Upsert {len(items)} enchères ═══")
    stats = upsert_encheres_batch(items, dry_run=dry_run)
    log.info(f"Résultat: {json.dumps(stats)}")

    return stats


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scraper Petites Affiches — enchères judiciaires")
    parser.add_argument("--dry-run", action="store_true", help="Pas d'écriture DB")
    parser.add_argument("--limit", type=int, help="Limiter le nombre d'annonces")
    parser.add_argument("--adjudications", action="store_true", help="Inclure résultats adjudications")
    parser.add_argument("--no-details", action="store_true", help="Ne pas enrichir avec pages détail")
    args = parser.parse_args()

    stats = run(
        dry_run=args.dry_run,
        limit=args.limit,
        include_adjudications=args.adjudications,
        enrich_details=not args.no_details,
    )
    print(f"\nTerminé: {json.dumps(stats, indent=2)}")
