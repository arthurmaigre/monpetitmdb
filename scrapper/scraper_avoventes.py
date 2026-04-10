"""
scraper_avoventes.py — Scraper minimaliste pour Avoventes (enchères judiciaires)
Source : https://avoventes.fr
~206 annonces actives, opéré par le Conseil National des Barreaux.

Playwright (vrai navigateur) requis pour le listing (le serveur renvoie 500
sur les requêtes HTTP simples). Les pages détail marchent en requests classique.

Pipeline : scraping (données fiables + raw_text) → Sonnet (extraction structurée)
"""
import os, sys, re, json, time, logging, argparse
from pathlib import Path
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from encheres_supabase import upsert_encheres_batch, parse_prix, parse_date_fr

log = logging.getLogger("avoventes")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

BASE_URL = "https://avoventes.fr"
SOURCE = "avoventes"
DELAY = 2.0

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9",
}


# ══════════════════════════════════════════════════════════════════════════════
# Phase 1 : Collecte des URLs via Playwright (vrai navigateur)
# ══════════════════════════════════════════════════════════════════════════════

def collect_listing_urls(limit: int = None) -> list[str]:
    """Charge la page listing avec Playwright et extrait les URLs."""
    from playwright.sync_api import sync_playwright

    all_urls = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            locale="fr-FR",
        )
        page = ctx.new_page()

        # Homepage pour les cookies
        log.info("Chargement homepage (cookies)...")
        page.goto(f"{BASE_URL}/", timeout=30000, wait_until="domcontentloaded")
        page.wait_for_timeout(2000)

        # Accepter les cookies
        try:
            accept_btn = page.locator("#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll")
            if accept_btn.is_visible(timeout=2000):
                accept_btn.click()
                page.wait_for_timeout(1000)
        except Exception:
            pass

        # Listing
        log.info("Chargement listing enchères actives...")
        page.goto(f"{BASE_URL}/ventes-aux-encheres", timeout=30000, wait_until="domcontentloaded")
        page.wait_for_timeout(5000)

        html = page.content()
        urls = re.findall(r'data-link="(https://avoventes\.fr/enchere/[^"]+)"', html)
        for u in urls:
            if u not in all_urls:
                all_urls.append(u)

        log.info(f"Page listing: {len(all_urls)} annonces")

        # Pagination
        page_nums = set()
        for m in re.finditer(r'ventes-aux-encheres\?page=(\d+)', html):
            page_nums.add(int(m.group(1)))

        for page_num in sorted(page_nums):
            if limit and len(all_urls) >= limit:
                break
            page.goto(f"{BASE_URL}/ventes-aux-encheres?page={page_num}",
                      timeout=30000, wait_until="domcontentloaded")
            page.wait_for_timeout(3000)
            page_html = page.content()
            for u in re.findall(r'data-link="(https://avoventes\.fr/enchere/[^"]+)"', page_html):
                if u not in all_urls:
                    all_urls.append(u)

        browser.close()

    log.info(f"{len(all_urls)} URLs collectées")
    return all_urls[:limit] if limit else all_urls


# ══════════════════════════════════════════════════════════════════════════════
# Phase 2 : Scraping des pages détail — MINIMALISTE
# ══════════════════════════════════════════════════════════════════════════════

def extract_id(url: str) -> str | None:
    m = re.search(r"/enchere/(.+?)(?:\?|$)", url.rstrip("/"))
    return m.group(1) if m else None


def extract_raw_text(soup: BeautifulSoup) -> str:
    """Extrait le texte brut utile de la page."""
    for tag in soup.find_all(["nav", "footer", "script", "style", "noscript"]):
        tag.decompose()
    text = soup.get_text("\n", strip=True)
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    # Couper avant la section DVF/données foncières (pas pertinent pour l'enchère)
    cutoff = len(lines)
    for i, line in enumerate(lines):
        if re.search(r"donn[ée]es?\s+fonci[eè]res?|DGFiP|valeurs fonci", line, re.I):
            cutoff = i
            break
    return "\n".join(lines[:cutoff])


def scrape_detail(url: str, session: requests.Session) -> dict | None:
    """Scrape une page détail Avoventes — extraction minimaliste."""
    try:
        r = session.get(url, headers=HEADERS, timeout=20)
        if r.status_code != 200:
            log.warning(f"Status {r.status_code} pour {url}")
            return None
    except Exception as e:
        log.warning(f"Erreur fetch {url}: {e}")
        return None

    html_text = r.text
    soup = BeautifulSoup(html_text, "html.parser")
    text = soup.get_text(" ", strip=True)

    id_source = extract_id(url)
    if not id_source:
        return None

    raw_text = extract_raw_text(soup)

    item = {
        "source": SOURCE,
        "id_source": id_source,
        "url": url,
        "description": raw_text,
    }

    # ── Mise à prix (fiable) ─────────────────────────────────────────────
    m = re.search(r"[Mm]ise\s+[àa]\s+prix\s*(?:initiale)?\s*:?\s*([\d\s.,]+)\s*€", text)
    if m:
        item["mise_a_prix"] = parse_prix(m.group(1))

    # ── Prix adjugé (exclusif Avoventes — fiable) ────────────────────────
    for pattern in [
        r"[Aa]djudication\s*:?\s*([\d\s.,]+)\s*(?:€|euros?)",
        r"[Aa]djug[ée]\s*(?:finale)?\s*:?\s*([\d\s.,]+)\s*(?:€|euros?)",
    ]:
        m = re.search(pattern, text)
        if m:
            prix = parse_prix(m.group(1))
            if prix and prix > 0:
                item["prix_adjuge"] = prix
                item["statut"] = "adjuge"
            break

    # ── Surenchère (fiable : montants structurels) ───────────────────────
    if "surenchère" in text.lower() or "surenchere" in text.lower():
        m = re.search(r"[Ss]urench[èe]re\s+possible\s+jusqu.*?:\s*(\d{1,2}\s+\w+\s+\d{4}|\d{1,2}/\d{1,2}/\d{4})", text)
        if m:
            item["date_surenchere"] = parse_date_fr(m.group(1))
            if item.get("prix_adjuge"):
                item["statut"] = "surenchere"
        m = re.search(r"mise\s+[àa]\s+prix\s+sera\s+port[ée]e\s+[àa]\s+([\d\s.,]+)\s*(?:€|euros?)", text, re.I)
        if m:
            item["mise_a_prix_surenchere"] = parse_prix(m.group(1))
        m = re.search(r"consigner\s+la\s+somme\s+de\s+([\d\s.,]+)\s*(?:€|euros?)", text, re.I)
        if m:
            item["consignation"] = parse_prix(m.group(1))

    # ── Date audience (fiable : format "Vente DD mois YYYY à HHhMM") ────
    # Limiter au header (avant la section DVF)
    header_text = text
    m_cut = re.search(r"(?:donn[ée]es?\s+fonci|DGFiP)", text, re.I)
    if m_cut:
        header_text = text[:m_cut.start()]

    m = re.search(r"[Vv]ente\s+(\d{1,2}\s+\w+\s+\d{4}\s+[àa]\s+\d{1,2}[h:]\d{2})", header_text)
    if m:
        item["date_audience"] = parse_date_fr(m.group(1))
    if not item.get("date_audience"):
        m = re.search(r"(\d{1,2}\s+\w+\s+\d{4}\s+[àa]\s+\d{1,2}[h:]\d{2})", header_text)
        if m:
            item["date_audience"] = parse_date_fr(m.group(1))

    # ── Date visite ──────────────────────────────────────────────────────
    m = re.search(r"[Vv]isite\s*:?\s*(\d{1,2}\s+\w+\s+\d{4}(?:\s+[àa]\s+\d{1,2}[h:]\d{2})?)", text)
    if m:
        item["date_visite"] = parse_date_fr(m.group(1).strip())

    # ── GPS (fiable : coordonnées dans le JS) ────────────────────────────
    m = re.search(r"(-?\d{1,3}\.\d{4,}),\s*(-?\d{1,3}\.\d{4,})", html_text)
    if m:
        lat, lng = float(m.group(1)), float(m.group(2))
        if 41 < lat < 52 and -5.5 < lng < 10:
            item["latitude"] = lat
            item["longitude"] = lng

    # ── Photos (fiable : URL directe) ────────────────────────────────────
    slider = soup.find(id=re.compile(r"lightSlider|gallery", re.I))
    if slider:
        slider_imgs = slider.find_all("img", src=True)
        if slider_imgs:
            src = slider_imgs[0].get("src", "")
            if src.startswith("/"): src = BASE_URL + src
            item["photo_url"] = src
    if not item.get("photo_url"):
        for img in soup.find_all("img", src=re.compile(r"/uploads/")):
            src = img.get("src", "")
            if not any(x in src.lower() for x in ["logo", "icon", "avatar"]):
                if src.startswith("/"): src = BASE_URL + src
                item["photo_url"] = src
                break

    # ── Documents PDF (fiable : liens directs) ───────────────────────────
    pdf_links = soup.find_all("a", href=re.compile(r"\.pdf", re.I))
    if pdf_links:
        docs = []
        for pdf_link in pdf_links:
            href = pdf_link.get("href", "")
            if href.startswith("/"): href = BASE_URL + href
            label = pdf_link.get_text(strip=True).lower()
            doc_type = "autre"
            if "cahier" in label or "ccv" in label or "condition" in label:
                doc_type = "ccv"
            elif "pvd" in label or "descriptif" in label:
                doc_type = "pv"
            elif "ddt" in label or "diagnostic" in label or "diag" in label:
                doc_type = "diag"
            elif "affiche" in label:
                doc_type = "affiche"
            docs.append({"type": doc_type, "url": href, "label": pdf_link.get_text(strip=True)})
        if docs:
            item["documents"] = docs

    return item


# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════

def run(dry_run: bool = False, limit: int = None) -> dict:
    """Lance le scraping Avoventes complet."""
    log.info("Phase 1 : Collecte URLs (Playwright)")
    urls = collect_listing_urls(limit=limit)

    if not urls:
        log.error("Aucune URL collectée")
        return {"inserted": 0, "updated": 0, "skipped": 0, "errors": 0}

    log.info(f"Phase 2 : Scraping {len(urls)} pages détail")
    session = requests.Session()
    items = []
    for i, url in enumerate(urls, 1):
        item = scrape_detail(url, session)
        if item:
            items.append(item)
            log.info(f"[{i}/{len(urls)}] {item.get('mise_a_prix', '?')}€ — {url[-50:]}")
        else:
            log.warning(f"[{i}/{len(urls)}] Échec: {url}")
        if i < len(urls):
            time.sleep(DELAY)

    log.info(f"Phase 3 : Upsert {len(items)} enchères")
    stats = upsert_encheres_batch(items, dry_run=dry_run)
    log.info(f"Résultat: {json.dumps(stats)}")
    return stats


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scraper Avoventes — enchères judiciaires")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()
    stats = run(dry_run=args.dry_run, limit=args.limit)
    print(f"\nTerminé: {json.dumps(stats, indent=2)}")
