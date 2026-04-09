"""
scraper_avoventes.py — Scraper pour Avoventes (enchères judiciaires)
Source : https://avoventes.fr
~206 annonces actives (enchères en cours).
Opéré par le Conseil National des Barreaux.

Utilise Playwright (vrai navigateur) car le serveur renvoie 500
sur les requêtes HTTP simples. Le navigateur charge la homepage d'abord
(cookies Cookiebot) puis accède au listing normalement.

Les pages détail sont ensuite scrapées en requests classique (pas besoin de Playwright).
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
    """Charge la page listing avec Playwright et extrait les URLs.

    Le serveur Avoventes renvoie 500 sur les requêtes classiques.
    Playwright lance un vrai Chrome qui charge les cookies nécessaires.
    """
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

        # 1. Charger la homepage pour les cookies
        log.info("Chargement homepage (cookies)...")
        page.goto(f"{BASE_URL}/", timeout=30000, wait_until="domcontentloaded")
        page.wait_for_timeout(2000)

        # Accepter les cookies si banner présent
        try:
            accept_btn = page.locator("#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll")
            if accept_btn.is_visible(timeout=2000):
                accept_btn.click()
                page.wait_for_timeout(1000)
        except Exception:
            pass

        # 2. Naviguer vers ventes-aux-encheres
        log.info("Chargement listing enchères actives...")
        page.goto(f"{BASE_URL}/ventes-aux-encheres", timeout=30000, wait_until="domcontentloaded")
        page.wait_for_timeout(5000)

        html = page.content()
        urls = re.findall(r'data-link="(https://avoventes\.fr/enchere/[^"]+)"', html)

        for u in urls:
            if u not in all_urls:
                all_urls.append(u)

        log.info(f"Page listing: {len(all_urls)} annonces actives")

        # 3. Vérifier s'il y a de la pagination
        page_nums = set()
        for m in re.finditer(r'ventes-aux-encheres\?page=(\d+)', html):
            page_nums.add(int(m.group(1)))

        if page_nums:
            log.info(f"Pagination détectée: pages {sorted(page_nums)}")
            for page_num in sorted(page_nums):
                if limit and len(all_urls) >= limit:
                    break
                page_url = f"{BASE_URL}/ventes-aux-encheres?page={page_num}"
                log.info(f"Listing page {page_num}...")
                page.goto(page_url, timeout=30000, wait_until="domcontentloaded")
                page.wait_for_timeout(3000)
                page_html = page.content()
                page_urls = re.findall(r'data-link="(https://avoventes\.fr/enchere/[^"]+)"', page_html)
                new_count = 0
                for u in page_urls:
                    if u not in all_urls:
                        all_urls.append(u)
                        new_count += 1
                log.info(f"Page {page_num}: +{new_count} (total: {len(all_urls)})")

        browser.close()

    if limit:
        all_urls = all_urls[:limit]

    log.info(f"✅ {len(all_urls)} URLs d'enchères actives collectées")
    return all_urls


# ══════════════════════════════════════════════════════════════════════════════
# Phase 2 : Scraping des pages détail (requests classique — pas besoin de Playwright)
# ══════════════════════════════════════════════════════════════════════════════

def extract_id(url: str) -> str | None:
    """Extrait un ID depuis l'URL Avoventes. Utilise le slug comme ID unique."""
    m = re.search(r"/enchere/(.+?)(?:\?|$)", url.rstrip("/"))
    return m.group(1) if m else None


def scrape_detail(url: str, session: requests.Session) -> dict | None:
    """Scrape une page détail Avoventes."""
    try:
        r = session.get(url, headers=HEADERS, timeout=20)
        if r.status_code != 200:
            log.warning(f"Status {r.status_code} pour {url}")
            return None
    except Exception as e:
        log.warning(f"Erreur fetch détail {url}: {e}")
        return None

    html_text = r.text
    soup = BeautifulSoup(html_text, "html.parser")
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

    # ── Description (section "À propos du bien" uniquement) ────────────────
    # Extraire le texte entre "À propos du bien" et "Cadastre" ou "À proximité"
    m_desc = re.search(r"propos du bien\s*(.+?)(?:Cadastre|proximité|Donnn?ées|valeurs foncières)", text, re.I | re.DOTALL)
    if m_desc:
        item["description"] = m_desc.group(1).strip()
    else:
        # Fallback : titre h1
        h1 = soup.find("h1")
        if h1:
            item["description"] = h1.get_text(strip=True)

    # ── Mise à prix ──────────────────────────────────────────────────────────
    m = re.search(r"[Mm]ise\s+[àa]\s+prix\s*(?:initiale)?\s*:?\s*([\d\s.,]+)\s*€", text)
    if m:
        item["mise_a_prix"] = parse_prix(m.group(1))

    # ── Prix adjugé (exclusif Avoventes) ─────────────────────────────────────
    # Formats : "Adjugé : 101 000 €" ou "Adjudication : 101 000,00 euros"
    for adj_pattern in [
        r"[Aa]djudication\s*:?\s*([\d\s.,]+)\s*(?:€|euros?)",
        r"[Aa]djug[ée]\s*(?:finale)?\s*:?\s*([\d\s.,]+)\s*(?:€|euros?)",
    ]:
        m = re.search(adj_pattern, text)
        if m:
            prix = parse_prix(m.group(1))
            if prix and prix > 0:
                item["prix_adjuge"] = prix
                item["statut"] = "vendu"
            break

    # ── Surenchère ───────────────────────────────────────────────────────────
    if "surenchère" in text.lower() or "surenchere" in text.lower():
        # Date limite surenchère : "Surenchère possible jusqu'au : DD mois YYYY" ou "DD/MM/YYYY"
        m = re.search(r"[Ss]urench[èe]re\s+possible\s+jusqu.*?:\s*(\d{1,2}\s+\w+\s+\d{4}|\d{1,2}/\d{1,2}/\d{4})", text)
        if m:
            item["date_surenchere"] = parse_date_fr(m.group(1))
            if item.get("prix_adjuge"):
                item["statut"] = "surenchere"  # Adjugé mais surenchère encore possible

        # Nouvelle mise à prix surenchère : "la mise à prix sera portée à XXX €"
        m = re.search(r"mise\s+[àa]\s+prix\s+sera\s+port[ée]e\s+[àa]\s+([\d\s.,]+)\s*(?:€|euros?)", text, re.I)
        if m:
            item["mise_a_prix_surenchere"] = parse_prix(m.group(1))

        # Consignation : "consigner la somme de XXX €"
        m = re.search(r"consigner\s+la\s+somme\s+de\s+([\d\s.,]+)\s*(?:€|euros?)", text, re.I)
        if m:
            item["consignation"] = parse_prix(m.group(1))

    # ── Tribunal ─────────────────────────────────────────────────────────────
    m = re.search(r"[Tt]ribunal\s+[Jj]udiciaire\s+(?:de\s+|d')([A-ZÀ-Úa-zà-ú\s\-]+?)(?:\s*,|\s*\d|\s*$)", text)
    if m:
        item["tribunal"] = f"Tribunal Judiciaire de {m.group(1).strip()}"

    # ── Date de vente / audience ─────────────────────────────────────────────
    # Chercher "Vente DD mois YYYY à HHhMM" — AVANT la section DVF
    # Limiter au texte avant "À propos" ou "Estimez vos frais" pour éviter dates DVF
    header_text = text
    m_cut = re.search(r"(?:Donnn?ées|valeurs foncières|DGFiP)", text, re.I)
    if m_cut:
        header_text = text[:m_cut.start()]

    m = re.search(r"[Vv]ente\s+(\d{1,2}\s+\w+\s+\d{4}\s+[àa]\s+\d{1,2}[h:]\d{2})", header_text)
    if m:
        item["date_audience"] = parse_date_fr(m.group(1))
    if not item.get("date_audience"):
        m = re.search(r"(\d{1,2}\s+\w+\s+\d{4}\s+[àa]\s+\d{1,2}[h:]\d{2})", header_text)
        if m:
            item["date_audience"] = parse_date_fr(m.group(1))
    if not item.get("date_audience"):
        m = re.search(r"(\d{1,2}/\d{1,2}/\d{4})\s+[àa]\s+(\d{1,2}[h:]\d{2})", header_text)
        if m:
            item["date_audience"] = parse_date_fr(m.group(0))

    # ── Date de visite ───────────────────────────────────────────────────────
    m = re.search(r"[Vv]isite\s*:?\s*(\d{1,2}\s+\w+\s+\d{4}(?:\s+[àa]\s+\d{1,2}[h:]\d{2})?)", text)
    if m:
        item["date_visite"] = parse_date_fr(m.group(1).strip())

    # ── Adresse / Ville / CP ─────────────────────────────────────────────────
    # Extraire la section "À propos du bien" pour éviter de capter les DVF
    about_section = ""
    m_about = re.search(r"propos du bien\s*(.+?)(?:Cadastre|proximité|Donnn?ées|valeurs foncières)", text, re.I | re.DOTALL)
    if m_about:
        about_section = m_about.group(1)

    # CP + Ville depuis la section "à propos" ou le texte global
    search_text = about_section or text
    m = re.search(r"(\d{5})\s+([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s\-]+?)(?:\s*,|\s*cadastr|\s*$)", search_text)
    if m:
        item["code_postal"] = m.group(1)
        ville = m.group(2).strip()
        # Normaliser : "MENNEVAL" → "Menneval"
        item["ville"] = ville.title() if ville.isupper() else ville

    if not item.get("ville"):
        slug = id_source or ""
        m = re.search(r"-a-(.+)$", slug)
        if m:
            item["ville"] = m.group(1).replace("-", " ").title()

    # Adresse — chercher DANS la section "à propos" uniquement
    if about_section:
        m = re.search(r"(\d+[,]?\s+(?:rue|avenue|boulevard|chemin|impasse|place|allée|route|chaussée)\s+[^,\n]{3,60})", about_section, re.I)
        if m:
            item["adresse"] = m.group(1).strip()

    # ── Surface ──────────────────────────────────────────────────────────────
    m = re.search(r"[Ss]urface\s+(?:[Ll]oi\s+)?[Cc]arrez\s*:?\s*(\d+[,.]?\d*)\s*m", text)
    if m:
        item["surface"] = float(m.group(1).replace(",", "."))
    elif not item.get("surface"):
        m = re.search(r"(\d+[,.]?\d*)\s*m[²2]", text)
        if m:
            item["surface"] = float(m.group(1).replace(",", "."))

    # ── Loyer (si occupé) ────────────────────────────────────────────────────
    m = re.search(r"[Ll]oyer\s*(?:actuel|mensuel)?\s*:?\s*([\d\s.,]+)\s*€", text)
    if m:
        loyer = parse_prix(m.group(1))
        if loyer:
            item["occupation"] = "loue"
            item["description"] = (item.get("description") or "") + f" | Loyer: {loyer}€/mois"

    # ── DPE ──────────────────────────────────────────────────────────────────
    m = re.search(r"DPE\s*:?\s*([A-G])", text, re.I)
    if m:
        item.setdefault("enrichissement_data", {})["dpe"] = m.group(1).upper()

    # ── Année construction ───────────────────────────────────────────────────
    m = re.search(r"[Cc]onstruction\s*:?\s*(\d{4})", text)
    if m:
        item.setdefault("enrichissement_data", {})["annee_construction"] = int(m.group(1))

    # ── Avocat ───────────────────────────────────────────────────────────────
    # Chercher le bloc avocat (souvent dans un div spécifique ou après les infos du bien)
    # Cabinet : souvent en majuscules "DORIA AVOCATS" ou "CABINET XXX"
    m = re.search(r"(?:CABINET|Cabinet)\s*:?\s*([A-ZÀ-Ú][^\n,]{3,50})", text)
    if m:
        item["avocat_cabinet"] = m.group(1).strip()
    else:
        # Chercher les cabinets en majuscules (pattern courant Avoventes)
        m = re.search(r"([A-Z][A-Z\s\-&]{3,30}AVOCATS?)", text)
        if m:
            item["avocat_cabinet"] = m.group(1).strip()

    m = re.search(r"(?:Maître|Ma[îi]tre|Me|Mtre)\s+([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s\-]+?)(?:\s*,|\s*Avocat|\s*$)", text)
    if m:
        item["avocat_nom"] = m.group(1).strip()

    # Téléphone — exclure les numéros DVF et coordonnées GPS
    for m in re.finditer(r"(\+33[\d\s.()-]{8,}|\b0[1-9][\d\s.()-]{8,})", text):
        tel = m.group(0).strip().rstrip(".):")  # Retirer caractères parasites en fin
        digits = re.sub(r"\D", "", tel)
        if 10 <= len(digits) <= 12:
            item["avocat_tel"] = tel
            break

    # ── GPS (coordonnées dans le JS) ─────────────────────────────────────────
    m = re.search(r"(-?\d{1,3}\.\d{4,}),\s*(-?\d{1,3}\.\d{4,})", html_text)
    if m:
        lat, lng = float(m.group(1)), float(m.group(2))
        if 41 < lat < 52 and -5.5 < lng < 10:
            item["latitude"] = lat
            item["longitude"] = lng

    # ── Photos ───────────────────────────────────────────────────────────────
    # Priorité : images du slider (photos du bien) > images /uploads/ génériques
    slider = soup.find(id=re.compile(r"lightSlider|gallery", re.I))
    if slider:
        slider_imgs = slider.find_all("img", src=True)
        if slider_imgs:
            src = slider_imgs[0].get("src", "")
            if src.startswith("/"):
                src = BASE_URL + src
            item["photo_url"] = src

    # Fallback : première image /uploads/ qui n'est pas un logo/cabinet
    if not item.get("photo_url"):
        for img in soup.find_all("img", src=re.compile(r"/uploads/")):
            src = img.get("src", "")
            parent_classes = " ".join(img.parent.get("class", []) if img.parent else [])
            if "text-center" in parent_classes:
                continue
            if not any(x in src.lower() for x in ["logo", "icon", "avatar"]):
                if src.startswith("/"):
                    src = BASE_URL + src
                item["photo_url"] = src
                break

    # ── Documents PDF ────────────────────────────────────────────────────────
    pdf_links = soup.find_all("a", href=re.compile(r"\.pdf", re.I))
    if pdf_links:
        docs = []
        for pdf_link in pdf_links:
            href = pdf_link.get("href", "")
            if href.startswith("/"):
                href = BASE_URL + href
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

    # ── Occupation ───────────────────────────────────────────────────────────
    if not item.get("occupation"):
        text_lower = text.lower()
        if "occupé" in text_lower or "occupe" in text_lower:
            item["occupation"] = "occupe"
        elif "loué" in text_lower or "loue" in text_lower or "bail" in text_lower:
            item["occupation"] = "loue"
        elif "libre" in text_lower or "vacant" in text_lower:
            item["occupation"] = "libre"

    # ── Nb pièces ────────────────────────────────────────────────────────────
    m = re.search(r"[Tt](\d)\b", text)
    if m:
        item["nb_pieces"] = int(m.group(1))
    else:
        m = re.search(r"(\d+)\s*pi[eè]ces?", text, re.I)
        if m:
            item["nb_pieces"] = int(m.group(1))

    # Convertir enrichissement_data en JSON si présent
    if item.get("enrichissement_data"):
        item["enrichissement_data"] = json.dumps(item["enrichissement_data"])

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
    elif "local" in t and "industriel" in t:
        return "Local industriel"
    elif "parking" in t or "garage" in t or "box" in t:
        return "Parking"
    elif "bureau" in t:
        return "Bureau"
    elif "studio" in t:
        return "Appartement"
    elif "propriété" in t or "propriete" in t:
        return "Maison"
    return "Autre"


# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════

def run(dry_run: bool = False, limit: int = None) -> dict:
    """Lance le scraping Avoventes complet.

    Phase 1 : Playwright pour le listing (contourne le 500 serveur)
    Phase 2 : requests pour les pages détail (marchent normalement)
    """
    # Phase 1 : collecter URLs avec Playwright
    log.info("═══ Phase 1 : Collecte URLs (Playwright) ═══")
    urls = collect_listing_urls(limit=limit)

    if not urls:
        log.error("Aucune URL collectée")
        return {"inserted": 0, "updated": 0, "skipped": 0, "errors": 0}

    # Phase 2 : scraper les détails avec requests
    log.info(f"═══ Phase 2 : Scraping {len(urls)} pages détail ═══")
    session = requests.Session()
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
    parser = argparse.ArgumentParser(description="Scraper Avoventes — enchères judiciaires (CNB)")
    parser.add_argument("--dry-run", action="store_true", help="Pas d'écriture DB")
    parser.add_argument("--limit", type=int, help="Limiter le nombre d'annonces")
    args = parser.parse_args()

    stats = run(dry_run=args.dry_run, limit=args.limit)
    print(f"\nTerminé: {json.dumps(stats, indent=2)}")
