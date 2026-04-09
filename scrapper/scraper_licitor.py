"""
scraper_licitor.py — Scraper pour Licitor (enchères judiciaires)
Source : https://www.licitor.com
~390 annonces, pagination ?p=1..N, HTML statique, pas d'anti-bot.
GPS via embed Google Maps.
"""
import os, sys, re, json, time, logging, argparse
from pathlib import Path
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from encheres_supabase import (
    upsert_encheres_batch, parse_prix, parse_date_fr,
    extract_id_from_url, get_existing_encheres
)

log = logging.getLogger("licitor")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

BASE_URL = "https://www.licitor.com"
SOURCE = "licitor"
DELAY = 1.0  # secondes entre requêtes

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
            log.info(f"Limite {limit} atteinte, arrêt collecte")
            break
        url = f"{BASE_URL}/?p={page}"
        log.info(f"Listing page {page} — {url}")

        soup = fetch_page(url, session)
        if not soup:
            log.warning(f"Page {page} inaccessible, arrêt pagination")
            break

        # Chercher les liens vers les annonces
        # Pattern URL : /annonce/XX/YY/ZZ/vente-aux-encheres/.../XXXXXX.html
        links = soup.find_all("a", href=re.compile(r"/annonce/.*\.html"))
        page_urls = []
        for link in links:
            href = link.get("href", "")
            if href.startswith("/"):
                href = BASE_URL + href
            if href not in all_urls and href not in page_urls:
                page_urls.append(href)

        if not page_urls:
            log.info(f"Page {page} : aucune annonce, fin de pagination")
            break

        all_urls.extend(page_urls)
        log.info(f"Page {page} : {len(page_urls)} annonces (total: {len(all_urls)})")

        page += 1
        time.sleep(DELAY)

    log.info(f"✅ {len(all_urls)} URLs collectées")
    return all_urls


# ══════════════════════════════════════════════════════════════════════════════
# Phase 2 : Scraping des pages détail
# ══════════════════════════════════════════════════════════════════════════════

def extract_id(url: str) -> str | None:
    """Extrait l'ID numérique de l'URL Licitor.
    Ex: /annonce/10/82/67/vente-aux-encheres/.../108267.html → '108267'
    """
    m = re.search(r"/(\d{4,})\.html", url)
    return m.group(1) if m else None


def extract_departement(url: str, soup: BeautifulSoup) -> str | None:
    """Extrait le département depuis l'URL ou le contenu."""
    # Depuis l'URL : .../loiret/108267.html → chercher le code dept dans le texte
    text = soup.get_text(" ", strip=True)
    # Chercher pattern "XX ville" en début de bloc
    m = re.search(r"\b(\d{2,3})\s+[A-ZÀ-Ú]", text)
    if m:
        return m.group(1)
    return None


def extract_gps(soup: BeautifulSoup, html_text: str) -> tuple[float | None, float | None]:
    """Extrait les coordonnées GPS depuis l'embed Google Maps."""
    # Chercher dans les iframes Google Maps
    iframes = soup.find_all("iframe")
    for iframe in iframes:
        src = iframe.get("src", "")
        if "maps" in src.lower() or "google" in src.lower():
            # Pattern: q=LAT,LNG ou ll=LAT,LNG ou @LAT,LNG
            m = re.search(r"[q=@](-?\d+\.?\d*),\s*(-?\d+\.?\d*)", src)
            if m:
                return float(m.group(1)), float(m.group(2))

    # Chercher dans le JS / texte brut de la page
    m = re.search(r"(-?\d{1,3}\.\d{4,}),\s*(-?\d{1,3}\.\d{4,})", html_text)
    if m:
        lat, lng = float(m.group(1)), float(m.group(2))
        # Vérifier que c'est en France métro
        if 41 < lat < 52 and -5.5 < lng < 10:
            return lat, lng

    return None, None


def scrape_detail(url: str, session: requests.Session) -> dict | None:
    """Scrape une page détail Licitor et retourne un dict normalisé.

    Structure HTML Licitor (lignes clés) :
      L21: Tribunal Judiciaire de XXX (Département)
      L22: Vente aux enchères publiques
      L23: vendredi 29 mai 2026 à 14h          ← date_audience
      L24-29: Description du bien               ← description propre
      L31: Mise à prix : 15 000 €
      L32: Ville
      L33: Adresse
      L36: Visite sur place ...                 ← date_visite
      L37: Maître XXX, de la SELARL YYY
      L38: Adresse avocat - CP Ville avocat     ← NE PAS confondre avec CP du bien
    """
    try:
        r = session.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
    except Exception as e:
        log.warning(f"Erreur fetch détail {url}: {e}")
        return None

    html_text = r.text
    soup = BeautifulSoup(html_text, "html.parser")

    # Texte en lignes pour parsing structurel
    text_lines = soup.get_text("\n", strip=True)
    lines = [l.strip() for l in text_lines.split("\n") if l.strip()]
    text = soup.get_text(" ", strip=True)

    id_source = extract_id(url)
    if not id_source:
        log.warning(f"Impossible d'extraire l'ID de {url}")
        return None

    item = {
        "source": SOURCE,
        "id_source": id_source,
        "url": url,
    }

    # ── Ville / Département depuis l'URL ─────────────────────────────────────
    # .../vente-aux-encheres/slug/ville/departement/ID.html
    url_parts = url.rstrip("/").split("/")
    if len(url_parts) >= 4:
        item["ville"] = url_parts[-3].replace("-", " ").title()
        item["departement"] = url_parts[-2].replace("-", " ").title()

    # ── Parsing structurel ligne par ligne ────────────────────────────────────
    # Trouver les marqueurs clés
    idx_tribunal = None
    idx_vente = None
    idx_mise_a_prix = None
    idx_visite = None
    idx_maitre = None
    idx_annonces_sim = None

    for i, line in enumerate(lines):
        ll = line.lower()
        if "tribunal judiciaire" in ll or "tribunal de grande instance" in ll:
            idx_tribunal = i
        elif ll.startswith("vente aux enchères publiques") or ll.startswith("vente aux encheres publiques"):
            idx_vente = i
        elif "mise à prix" in ll or "mise a prix" in ll:
            idx_mise_a_prix = i
        elif "visite sur place" in ll or "visite :" in ll:
            idx_visite = i
        elif line.startswith("Maître") or line.startswith("Maitre") or line.startswith("Me "):
            if not idx_maitre:
                idx_maitre = i
        elif "annonces similaires" in ll:
            idx_annonces_sim = i
        elif "annonce non-officielle" in ll:
            break  # Fin du contenu utile

    # ── Tribunal ─────────────────────────────────────────────────────────────
    if idx_tribunal is not None:
        m = re.search(r"[Tt]ribunal\s+[Jj]udiciaire\s+(?:de\s+|d')(.+?)(?:\s*\(|$)", lines[idx_tribunal])
        if m:
            item["tribunal"] = f"Tribunal Judiciaire de {m.group(1).strip()}"

    # ── Date audience (ligne après "Vente aux enchères publiques") ────────────
    if idx_vente is not None and idx_vente + 1 < len(lines):
        date_line = lines[idx_vente + 1]
        item["date_audience"] = parse_date_fr(date_line, year=2026)

    # ── Type de bien + Description (entre date audience et mise à prix) ──────
    if idx_vente is not None and idx_mise_a_prix is not None:
        # Le type de bien est la première ligne après la date
        desc_start = idx_vente + 2  # Après "Vente aux enchères" + date
        desc_end = idx_mise_a_prix
        desc_lines = [lines[i] for i in range(desc_start, desc_end) if i < len(lines)]

        if desc_lines:
            item["type_bien"] = _extract_type_bien(desc_lines[0])
            # Description = toutes les lignes entre date et mise à prix
            item["description"] = " ".join(desc_lines)

    # Si pas de type_bien via structure, fallback sur le h1
    if not item.get("type_bien"):
        h1 = soup.find("h1")
        if h1:
            item["type_bien"] = _extract_type_bien(h1.get_text(strip=True))

    # ── Mise à prix ──────────────────────────────────────────────────────────
    m = re.search(r"[Mm]ise\s+[àa]\s+prix\s*:?\s*([\d\s.,]+)\s*€", text)
    if m:
        item["mise_a_prix"] = parse_prix(m.group(1))

    # ── Adresse (lignes entre mise à prix et "Afficher le plan") ─────────────
    if idx_mise_a_prix is not None:
        for i in range(idx_mise_a_prix + 1, min(idx_mise_a_prix + 4, len(lines))):
            line = lines[i]
            if "afficher le plan" in line.lower():
                break
            # Première ligne = ville (déjà depuis URL), deuxième = adresse
            if re.match(r"\d+", line) and ("rue" in line.lower() or "avenue" in line.lower()
                    or "route" in line.lower() or "chemin" in line.lower()
                    or "allée" in line.lower() or "place" in line.lower()
                    or "boulevard" in line.lower() or "impasse" in line.lower()
                    or "," in line):
                item["adresse"] = line

    # ── Date visite ──────────────────────────────────────────────────────────
    if idx_visite is not None:
        visite_text = lines[idx_visite]
        # "Visite sur place mardi 19 mai 2026 à 11h15"
        m = re.search(r"(\d{1,2}\s+\w+\s+\d{4}(?:\s+[àa]\s+\d{1,2}[h:]\d{2})?)", visite_text)
        if m:
            item["date_visite"] = parse_date_fr(m.group(1))
        # Aussi chercher format "de Xh à Yh"
        if not item.get("date_visite"):
            m = re.search(r"(\d{1,2}\s+\w+\s+\d{4})", visite_text)
            if m:
                item["date_visite"] = parse_date_fr(m.group(1))

    # ── Avocat (ligne "Maître XXX, de la SELARL YYY") ───────────────────────
    if idx_maitre is not None:
        maitre_line = lines[idx_maitre]
        # Nom complet après Maître — couper à ", de la" / ", membre de" / ", Avocat"
        m = re.search(r"(?:Maître|Maitre|Me)\s+(.+?)(?:,\s*(?:de\s+la|membre|Avocat)|$)", maitre_line)
        if m:
            nom = m.group(1).strip().rstrip(",")
            # Retirer "membre de la SELAS..." si resté
            nom = re.sub(r",?\s*membre\s+de\s+.*", "", nom)
            item["avocat_nom"] = nom
        # Cabinet
        m = re.search(r"(?:SELARL|SCP|AARPI)\s+(.+?)(?:,|\s*Avocat)", maitre_line)
        if m:
            item["avocat_cabinet"] = m.group(1).strip()

        # Téléphone (ligne suivante ou même ligne)
        for j in range(idx_maitre, min(idx_maitre + 3, len(lines))):
            m = re.search(r"(?:Tél|Tel)\s*\.?\s*:?\s*([\d\s.+()-]{10,})", lines[j])
            if m:
                item["avocat_tel"] = m.group(1).strip()
                break

    # ── Code postal du BIEN (PAS celui de l'avocat) ──────────────────────────
    # Le CP du bien est entre la mise à prix et le bloc avocat
    if idx_mise_a_prix is not None:
        end_search = idx_maitre if idx_maitre else idx_mise_a_prix + 5
        for i in range(idx_mise_a_prix, min(end_search, len(lines))):
            if "afficher le plan" in lines[i].lower():
                break
            m = re.search(r"\b(\d{5})\b", lines[i])
            if m:
                item["code_postal"] = m.group(1)
                break

    # ── Surface ──────────────────────────────────────────────────────────────
    desc = item.get("description", "")
    m = re.search(r"(\d+[,.]?\d*)\s*m[²2]", desc)
    if m:
        item["surface"] = float(m.group(1).replace(",", "."))

    # ── GPS ───────────────────────────────────────────────────────────────────
    lat, lng = extract_gps(soup, html_text)
    if lat and lng:
        item["latitude"] = lat
        item["longitude"] = lng

    # ── Occupation ───────────────────────────────────────────────────────────
    desc_lower = (item.get("description") or "").lower()
    if "occupé" in desc_lower or "occupée" in desc_lower:
        item["occupation"] = "occupe"
    elif "loué" in desc_lower or "louée" in desc_lower or "locataire" in desc_lower:
        item["occupation"] = "loue"
    elif "libre" in desc_lower or "vacant" in desc_lower:
        item["occupation"] = "libre"

    # ── Nb pièces ────────────────────────────────────────────────────────────
    m = re.search(r"(\d+)\s*pièces?", desc, re.I)
    if m:
        item["nb_pieces"] = int(m.group(1))

    return item


def _extract_type_bien(titre: str) -> str:
    """Déduit le type de bien depuis le titre."""
    t = titre.lower()
    if "appartement" in t:
        return "Appartement"
    elif "maison" in t:
        return "Maison"
    elif "immeuble" in t:
        return "Immeuble"
    elif "terrain" in t:
        return "Terrain"
    elif "local" in t and "commercial" in t:
        return "Local commercial"
    elif "local" in t:
        return "Local"
    elif "parking" in t or "garage" in t or "box" in t:
        return "Parking"
    elif "bureau" in t:
        return "Bureau"
    elif "commerce" in t and "habitation" in t:
        return "Mixte"
    elif "commerce" in t:
        return "Local commercial"
    elif "ferme" in t or "corps de ferme" in t:
        return "Maison"
    elif "habitation" in t:
        return "Maison"
    return "Autre"


# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════

def run(dry_run: bool = False, limit: int = None) -> dict:
    """Lance le scraping Licitor complet.
    Retourne les stats d'upsert.
    """
    session = requests.Session()

    # Phase 1 : collecter URLs
    log.info("═══ Phase 1 : Collecte URLs listing ═══")
    urls = collect_listing_urls(session, limit=limit)

    if limit:
        urls = urls[:limit]
        log.info(f"Limité à {limit} annonces")

    # Phase 2 : scraper les détails
    log.info(f"═══ Phase 2 : Scraping {len(urls)} pages détail ═══")
    items = []
    for i, url in enumerate(urls, 1):
        item = scrape_detail(url, session)
        if item:
            items.append(item)
            log.info(f"[{i}/{len(urls)}] ✅ {item.get('ville', '?')} — "
                     f"{item.get('mise_a_prix', '?')}€ — {item.get('type_bien', '?')}")
        else:
            log.warning(f"[{i}/{len(urls)}] ❌ Échec: {url}")

        if i < len(urls):
            time.sleep(DELAY)

    # Phase 3 : upsert
    log.info(f"═══ Phase 3 : Upsert {len(items)} enchères ═══")
    stats = upsert_encheres_batch(items, dry_run=dry_run)
    log.info(f"Résultat: {json.dumps(stats)}")

    return stats


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scraper Licitor — enchères judiciaires")
    parser.add_argument("--dry-run", action="store_true", help="Pas d'écriture DB")
    parser.add_argument("--limit", type=int, help="Limiter le nombre d'annonces")
    args = parser.parse_args()

    stats = run(dry_run=args.dry_run, limit=args.limit)
    print(f"\nTerminé: {json.dumps(stats, indent=2)}")
