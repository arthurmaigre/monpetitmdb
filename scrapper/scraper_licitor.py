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
    # Cibler article.LegalAd qui contient l'annonce complète
    legal_ad = soup.find("article", class_="LegalAd")
    if legal_ad:
        text = legal_ad.get_text("\n", strip=True)
    else:
        # Fallback : div.ResultContent (conteneur parent)
        result = soup.find("div", class_="ResultContent")
        if result:
            text = result.get_text("\n", strip=True)
        else:
            # Dernier recours : tout le texte sans nav/footer
            from copy import copy
            work = copy(soup)
            for tag in work.find_all(["nav", "footer", "script", "style", "noscript"]):
                tag.decompose()
            text = work.get_text("\n", strip=True)
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    # Retirer les lignes "Annonces similaires" et après
    cleaned = []
    for line in lines:
        if "annonces similaires" in line.lower():
            continue
        if "annonce non-officielle" in line.lower():
            break
        cleaned.append(line)
    return "\n".join(cleaned)


def split_into_lots(item: dict, text: str) -> list[dict]:
    """Détecte les pages multi-lots licitor et crée un item par lot.

    Une page licitor peut regrouper N lots d'une même vente judiciaire avec
    N mises à prix distinctes. Vench crée une page par lot.
    Cette fonction permet la déduplication croisée lot par lot.

    Convention id_source : '{base_id}_lot{n}' (ex: '107826_lot2').
    Les anciens records sans suffixe (créés avant ce fix) sont conservés.
    """
    base_id = item.get("id_source", "")
    lot_matches = list(re.finditer(r"\bLot\s+n[°o]?\s*(\d+)\b", text, re.I))
    if len(lot_matches) < 2:
        return [item]  # Page simple, comportement inchangé

    items = []
    for i, m in enumerate(lot_matches):
        lot_num = int(m.group(1))
        start = m.start()
        end = lot_matches[i + 1].start() if i + 1 < len(lot_matches) else len(text)
        segment = text[start:end]

        pm = re.search(r"[Mm]ise\s+[àa]\s+prix\s*:?\s*([\d\s.,]+)\s*€", segment)
        lot_prix = parse_prix(pm.group(1)) if pm else None

        lot_item = dict(item)
        lot_item["id_source"] = f"{base_id}_lot{lot_num}"
        if lot_prix is not None:
            lot_item["mise_a_prix"] = lot_prix
        items.append(lot_item)

    log.info(f"Multi-lots détecté : {base_id} → {len(items)} lots")
    return items


def scrape_detail(url: str, session: requests.Session) -> list[dict]:
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

    # ── Date audience (fiable : pattern jour-de-semaine) ─────────────────
    # Robuste à "Vente aux enchères publiques" ET "Vente sur saisie immobilière"
    lines = [l.strip() for l in soup.get_text("\n", strip=True).split("\n") if l.strip()]
    _JOURS = r"(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)"
    for line in lines:
        m = re.search(rf"{_JOURS}\s+\d{{1,2}}\s+\w+\s+\d{{4}}", line, re.I)
        if m:
            item["date_audience"] = parse_date_fr(m.group(), year=2026)
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

    # ── Avocat (extrait du texte structuré Licitor) ─────────────────────
    # Format typique : "Maître Prénom Nom, membre de la SELARL X, Avocat\nAdresse\nTél.: XX XX XX XX XX"
    m_avocat = re.search(
        r"Ma[îi]tre\s+(.+?)(?:,\s*(?:membre\s+de\s+la\s+|de\s+la\s+)?((?:SELARL|SCP|SELAS|AARPI|Cabinet)\s+[^,\n]+))?(?:,\s*Avocats?)?\s*\n"
        r"([^\n]+)\n"  # adresse
        r"(?:T[ée]l\.?\s*:?\s*([\d\s.+-]+))?",
        raw_text, re.I
    )
    if m_avocat:
        nom = m_avocat.group(1).strip().rstrip(",")
        nom = re.sub(r"\s*,?\s*(?:membre|de la|Avocat).*", "", nom, flags=re.I).strip()
        if nom:
            item["avocat_nom"] = nom
        cab = m_avocat.group(2)
        if cab:
            item["avocat_cabinet"] = cab.strip().rstrip(",.")
        tel = m_avocat.group(4)
        if tel:
            digits = re.sub(r"[^\d]", "", tel)
            if len(digits) == 10:
                item["avocat_tel"] = " ".join([digits[i:i+2] for i in range(0, 10, 2)])

    # Email avocat
    m_email = re.search(r"[\w.+-]+@[\w.-]+\.[a-z]{2,}", raw_text)
    if m_email:
        email = m_email.group()
        # Exclure les emails Licitor/système
        if "licitor" not in email.lower():
            item["avocat_email"] = email

    return split_into_lots(item, text)


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
        lot_items = scrape_detail(url, session)
        if lot_items:
            items.extend(lot_items)
            prix_str = "/".join(str(it.get("mise_a_prix", "?")) for it in lot_items)
            log.info(f"[{i}/{len(urls)}] {prix_str}€ ({len(lot_items)} lot(s)) — {url[-40:]}")
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
