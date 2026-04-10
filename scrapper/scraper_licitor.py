"""
scraper_licitor.py — Scraper minimaliste pour Licitor (enchères judiciaires)
Source : https://www.licitor.com
~390 annonces, pagination ?p=1..N, HTML statique, pas d'anti-bot.

Pipeline : scraping (données fiables + raw_text) → Sonnet (extraction structurée)
Seules les données FIABLES sont extraites par regex (prix, dates, GPS).
Tout le reste (ville, tribunal, type_bien, etc.) est délégué à Sonnet.
"""
import os, sys, re, json, time, logging, argparse
from pathlib import Path
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from encheres_supabase import upsert_encheres_batch, parse_prix, parse_date_fr

log = logging.getLogger("licitor")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

BASE_URL = "https://www.licitor.com"
SOURCE = "licitor"
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


def collect_listing_urls(session: requests.Session, limit: int = None) -> list[str]:
    """Parcourt toutes les pages du listing et collecte les URLs d'annonces."""
    all_urls = []
    page = 1

    while True:
        if limit and len(all_urls) >= limit:
            break
        url = f"{BASE_URL}/?p={page}"
        log.info(f"Listing page {page} — {url}")

        soup = fetch_page(url, session)
        if not soup:
            break

        links = soup.find_all("a", href=re.compile(r"/annonce/.*\.html"))
        page_urls = []
        for link in links:
            href = link.get("href", "")
            if href.startswith("/"):
                href = BASE_URL + href
            if href not in all_urls and href not in page_urls:
                page_urls.append(href)

        if not page_urls:
            log.info(f"Page {page} : fin de pagination")
            break

        all_urls.extend(page_urls)
        log.info(f"Page {page} : {len(page_urls)} annonces (total: {len(all_urls)})")
        page += 1
        time.sleep(DELAY)

    log.info(f"{len(all_urls)} URLs collectées")
    return all_urls[:limit] if limit else all_urls


# ══════════════════════════════════════════════════════════════════════════════
# Phase 2 : Scraping des pages détail — MINIMALISTE
# Seuls les champs fiables sont extraits. Le texte brut est stocké pour Sonnet.
# ══════════════════════════════════════════════════════════════════════════════

def extract_id(url: str) -> str | None:
    """Extrait l'ID numérique de l'URL Licitor."""
    m = re.search(r"/(\d{4,})\.html", url)
    return m.group(1) if m else None


def extract_gps(soup: BeautifulSoup, html_text: str) -> tuple[float | None, float | None]:
    """Extrait les coordonnées GPS depuis l'embed Google Maps."""
    for iframe in soup.find_all("iframe"):
        src = iframe.get("src", "")
        if "maps" in src.lower() or "google" in src.lower():
            m = re.search(r"[q=@](-?\d+\.?\d*),\s*(-?\d+\.?\d*)", src)
            if m:
                return float(m.group(1)), float(m.group(2))
    # Fallback : chercher dans le JS
    m = re.search(r"(-?\d{1,3}\.\d{4,}),\s*(-?\d{1,3}\.\d{4,})", html_text)
    if m:
        lat, lng = float(m.group(1)), float(m.group(2))
        if 41 < lat < 52 and -5.5 < lng < 10:
            return lat, lng
    return None, None


def extract_raw_text(soup: BeautifulSoup) -> str:
    """Extrait le texte brut utile de la page (sans nav/footer/pubs)."""
    # Retirer les éléments non pertinents
    for tag in soup.find_all(["nav", "footer", "script", "style", "noscript"]):
        tag.decompose()
    text = soup.get_text("\n", strip=True)
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    # Couper après "annonces similaires" ou "annonce non-officielle"
    cutoff = len(lines)
    for i, line in enumerate(lines):
        ll = line.lower()
        if "annonces similaires" in ll or "annonce non-officielle" in ll:
            cutoff = i
            break
    return "\n".join(lines[:cutoff])


def scrape_detail(url: str, session: requests.Session) -> dict | None:
    """Scrape une page détail Licitor — extraction minimaliste.

    Données fiables (regex) : mise_a_prix, date_audience, date_visite, GPS
    Tout le reste : raw_text pour Sonnet
    """
    try:
        r = session.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
    except Exception as e:
        log.warning(f"Erreur fetch {url}: {e}")
        return None

    html_text = r.text
    soup = BeautifulSoup(html_text, "html.parser")

    id_source = extract_id(url)
    if not id_source:
        return None

    # Texte brut complet pour Sonnet
    raw_text = extract_raw_text(soup)
    text = soup.get_text(" ", strip=True)

    item = {
        "source": SOURCE,
        "id_source": id_source,
        "url": url,
        "description": raw_text,  # Sonnet lira ce champ pour tout extraire
    }

    # ── Mise à prix (fiable : toujours le même format) ───────────────────
    m = re.search(r"[Mm]ise\s+[àa]\s+prix\s*:?\s*([\d\s.,]+)\s*€", text)
    if m:
        item["mise_a_prix"] = parse_prix(m.group(1))

    # ── Date audience (fiable : format structurel) ───────────────────────
    lines = [l.strip() for l in soup.get_text("\n", strip=True).split("\n") if l.strip()]
    for i, line in enumerate(lines):
        ll = line.lower()
        if ll.startswith("vente aux enchères publiques") or ll.startswith("vente aux encheres publiques"):
            if i + 1 < len(lines):
                item["date_audience"] = parse_date_fr(lines[i + 1], year=2026)
            break

    # ── Date visite (fiable) ─────────────────────────────────────────────
    for line in lines:
        if "visite sur place" in line.lower() or "visite :" in line.lower():
            m = re.search(r"(\d{1,2}\s+\w+\s+\d{4})", line)
            if m:
                item["date_visite"] = parse_date_fr(m.group(1))
            break

    # ── GPS (fiable : embed Google Maps) ─────────────────────────────────
    lat, lng = extract_gps(soup, html_text)
    if lat and lng:
        item["latitude"] = lat
        item["longitude"] = lng

    # ── Photo (fiable : URL directe) ────────────────────────────────────
    img = soup.find("img", src=re.compile(r"/uploads/|/images/|/photos/"))
    if img:
        src = img.get("src", "")
        if src.startswith("/"):
            src = BASE_URL + src
        item["photo_url"] = src

    return item


# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════

def run(dry_run: bool = False, limit: int = None) -> dict:
    """Lance le scraping Licitor complet."""
    session = requests.Session()

    log.info("Phase 1 : Collecte URLs listing")
    urls = collect_listing_urls(session, limit=limit)

    log.info(f"Phase 2 : Scraping {len(urls)} pages détail")
    items = []
    for i, url in enumerate(urls, 1):
        item = scrape_detail(url, session)
        if item:
            items.append(item)
            log.info(f"[{i}/{len(urls)}] {item.get('mise_a_prix', '?')}€ — {url[-40:]}")
        else:
            log.warning(f"[{i}/{len(urls)}] Échec: {url}")
        if i < len(urls):
            time.sleep(DELAY)

    log.info(f"Phase 3 : Upsert {len(items)} enchères")
    stats = upsert_encheres_batch(items, dry_run=dry_run)
    log.info(f"Résultat: {json.dumps(stats)}")
    return stats


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scraper Licitor — enchères judiciaires")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()
    stats = run(dry_run=args.dry_run, limit=args.limit)
    print(f"\nTerminé: {json.dumps(stats, indent=2)}")
