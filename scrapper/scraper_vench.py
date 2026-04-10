"""
scraper_vench.py — Scraper minimaliste pour Vench (enchères judiciaires)
Source : https://www.vench.fr
~431 annonces, abo requis (40€/an) pour descriptions + PDFs + avocat.

Pipeline : scraping (données fiables + raw_text) → Sonnet (extraction structurée)
Seules les données FIABLES sont extraites par regex (prix, dates, PDFs).
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

log = logging.getLogger("vench")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

BASE_URL = "https://www.vench.fr"
SOURCE = "vench"
DELAY = 1.5

VENCH_EMAIL = os.getenv("VENCH_EMAIL", "vestamdb@gmail.com")
VENCH_PASSWORD = os.getenv("VENCH_PASSWORD", "Fcn@vench44")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9",
}


# ══════════════════════════════════════��═══════════════════════════════════��═══
# Authentification
# ════��═══════════════════════════════════════════════════��═════════════════════

def login(session: requests.Session) -> bool:
    """Se connecter à Vench avec les credentials."""
    log.info("Connexion à Vench...")
    try:
        login_page = session.get(f"{BASE_URL}/mon-compte-vench.html", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(login_page.text, "html.parser")

        form = soup.find("input", {"name": "logMeIn"})
        if not form:
            log.warning("Formulaire de login non trouvé")
            return False

        form_tag = form.find_parent("form")
        data = {"login": VENCH_EMAIL, "password": VENCH_PASSWORD, "logMeIn": "1"}
        if form_tag:
            for hidden in form_tag.find_all("input", {"type": "hidden"}):
                name = hidden.get("name")
                if name and name not in data:
                    data[name] = hidden.get("value", "")

        session.post(f"{BASE_URL}/mon-compte-vench.html", data=data, headers={
            **HEADERS, "Content-Type": "application/x-www-form-urlencoded",
            "Referer": f"{BASE_URL}/mon-compte-vench.html",
        }, timeout=15, allow_redirects=True)

        check = session.get(f"{BASE_URL}/prochaines-ventes-aux-encheres.html", headers=HEADERS, timeout=15)
        if "déconnexion" in check.text.lower() or "deconnexion" in check.text.lower():
            log.info("Connecté à Vench")
            return True

        log.warning("Login Vench échoué")
        return False
    except Exception as e:
        log.error(f"Erreur login Vench: {e}")
        return False


# ══���═════════════���═════════════════════════════════════════════════════════════
# Phase 1 : Collecte des URLs depuis le listing
# ══════════════════════════════════════════════════════════════════════════════

def collect_listing_urls(session: requests.Session, limit: int = None) -> list[str]:
    """Parcourt toutes les pages du listing et collecte les URLs d'annonces."""
    all_urls = []
    page = 1

    while True:
        if limit and len(all_urls) >= limit:
            break
        url = f"{BASE_URL}/prochaines-ventes-aux-encheres.html?p={page}"
        log.info(f"Listing page {page} — {url}")

        try:
            r = session.get(url, headers=HEADERS, timeout=15)
            r.raise_for_status()
        except Exception as e:
            log.warning(f"Page {page} inaccessible: {e}")
            break

        soup = BeautifulSoup(r.text, "html.parser")
        links = soup.find_all("a", href=re.compile(r"vente-\d+-"))
        page_urls = []
        for link in links:
            href = link.get("href", "")
            if href.startswith("./"): href = href[2:]
            if href.startswith("/"): href = BASE_URL + href
            elif not href.startswith("http"): href = BASE_URL + "/" + href
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


# ════════���═════════════════════════���═════════════════════════════���═════════════
# Phase 2 : Scraping des pages détail — MINIMALISTE
# ═══════════════════════════════════════��══════════════════════════════════════

def extract_id(url: str) -> str | None:
    m = re.search(r"vente-(\d+)-", url)
    return m.group(1) if m else None


def extract_raw_text(soup: BeautifulSoup) -> str:
    """Extrait le texte brut utile de la page."""
    for tag in soup.find_all(["nav", "footer", "script", "style", "noscript"]):
        tag.decompose()
    text = soup.get_text("\n", strip=True)
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    # Retirer les lignes de bruit (cookies, analytics, formulaires)
    filtered = []
    for line in lines:
        ll = line.lower()
        if any(kw in ll for kw in ["cookie", "google analytics", "votre email",
                                     "mot de passe", "s'abonner pour", "tableau de bord"]):
            continue
        filtered.append(line)
    return "\n".join(filtered)


def scrape_detail(url: str, session: requests.Session) -> dict | None:
    """Scrape une page détail Vench — extraction minimaliste."""
    try:
        r = session.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
    except Exception as e:
        log.warning(f"Erreur fetch {url}: {e}")
        return None

    soup = BeautifulSoup(r.text, "html.parser")
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

    # ── Mise à prix (fiable) ─────────────────────────────��───────────────
    m = re.search(r"[Mm]ise\s+[àa]\s+prix\s*:?\s*([\d\s.,]+)\s*€", text)
    if m:
        item["mise_a_prix"] = parse_prix(m.group(1))

    # ── Prix adjugé (fiable : format structurel Vench) ───────────────────
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

    # ── Dates (fiable : format DD/MM/YYYY structurel) ────────────────────
    # Date depuis le <title> qui a un format fiable
    title_tag = soup.find("title")
    if title_tag:
        title_text = title_tag.get_text(strip=True)
        m = re.search(r"(\d{1,2}/\d{1,2}/\d{4})", title_text)
        if m:
            item["date_audience"] = parse_date_fr(m.group(1))

    if not item.get("date_audience"):
        m = re.search(r"[Dd]ate\s+(?:de\s+)?vente\s*:?\s*(\d{1,2}/\d{1,2}/\d{2,4})", text)
        if m:
            item["date_audience"] = parse_date_fr(m.group(1))

    m = re.search(r"[Vv]isite\s*:?\s*(\d{1,2}/\d{1,2}/\d{2,4})", text)
    if m:
        item["date_visite"] = parse_date_fr(m.group(1))

    # ── Documents PDF (fiable : liens directs) ───────────────────────────
    pdf_links = soup.find_all("a", href=re.compile(r"\.pdf", re.I))
    if pdf_links:
        docs = []
        for pdf_link in pdf_links:
            href = pdf_link.get("href", "")
            if href.startswith("/"): href = BASE_URL + href
            elif not href.startswith("http"): href = BASE_URL + "/" + href
            label = pdf_link.get_text(strip=True).lower()
            doc_type = "autre"
            if "cahier" in label or "ccv" in label or "condition" in label:
                doc_type = "ccv"
            elif "pvd" in label or "descriptif" in label:
                doc_type = "pv"
            elif "ddt" in label or "diagnostic" in label:
                doc_type = "diag"
            docs.append({"type": doc_type, "url": href, "label": pdf_link.get_text(strip=True)})
        if docs:
            item["documents"] = docs

    # ── Photo (fiable : URL directe) ─��───────────────────────────────────
    img = soup.find("img", src=re.compile(r"/uploads/|/images/|/photos/"))
    if img:
        src = img.get("src", "")
        if src.startswith("/"): src = BASE_URL + src
        elif not src.startswith("http"): src = BASE_URL + "/" + src
        item["photo_url"] = src

    return item


# ══════��═══════════════════════════════════════════════════���═══════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════

def run(dry_run: bool = False, limit: int = None) -> dict:
    """Lance le scraping Vench complet."""
    session = requests.Session()
    login(session)

    log.info("Phase 1 : Collecte URLs listing")
    urls = collect_listing_urls(session, limit=limit)

    log.info(f"Phase 2 : Scraping {len(urls)} pages détail")
    items = []
    for i, url in enumerate(urls, 1):
        item = scrape_detail(url, session)
        if item:
            items.append(item)
            log.info(f"[{i}/{len(urls)}] {item.get('mise_a_prix', '?')}��� — {url[-40:]}")
        else:
            log.warning(f"[{i}/{len(urls)}] Échec: {url}")
        if i < len(urls):
            time.sleep(DELAY)

    log.info(f"Phase 3 : Upsert {len(items)} enchères")
    stats = upsert_encheres_batch(items, dry_run=dry_run)
    log.info(f"Résultat: {json.dumps(stats)}")
    return stats


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scraper Vench — enchères judiciaires")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()
    stats = run(dry_run=args.dry_run, limit=args.limit)
    print(f"\nTerminé: {json.dumps(stats, indent=2)}")
