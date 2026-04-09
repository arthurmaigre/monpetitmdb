"""
scraper_vench.py — Scraper pour Vench (enchères judiciaires)
Source : https://www.vench.fr
~431 annonces, abo requis (40€/an) pour descriptions + PDFs + avocat.
Login par session POST.
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

log = logging.getLogger("vench")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")

BASE_URL = "https://www.vench.fr"
SOURCE = "vench"
DELAY = 1.5

# Credentials (depuis .env ou en dur pour le moment)
VENCH_EMAIL = os.getenv("VENCH_EMAIL", "vestamdb@gmail.com")
VENCH_PASSWORD = os.getenv("VENCH_PASSWORD", "Fcn@vench44")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9",
}


# ══════════════════════════════════════════════════════════════════════════════
# Authentification
# ══════════════════════════════════════════════════════════════════════════════

def login(session: requests.Session) -> bool:
    """Se connecter à Vench avec les credentials.

    Le vrai formulaire de login est sur /mon-compte-vench.html (pas /connexion.html).
    Champs : app (hidden), logMeIn (hidden), login (email), password.
    """
    log.info("Connexion à Vench...")

    try:
        # Charger la page mon-compte pour récupérer les champs hidden
        login_page = session.get(f"{BASE_URL}/mon-compte-vench.html", headers=HEADERS, timeout=15)
        soup = BeautifulSoup(login_page.text, "html.parser")

        # Trouver le formulaire de login (celui avec logMeIn)
        form = soup.find("input", {"name": "logMeIn"})
        if not form:
            log.warning("Formulaire de login non trouvé")
            return False

        # Récupérer le formulaire parent
        form_tag = form.find_parent("form")

        # Construire les données POST
        data = {
            "login": VENCH_EMAIL,
            "password": VENCH_PASSWORD,
            "logMeIn": "1",
        }

        # Ajouter les champs hidden
        if form_tag:
            for hidden in form_tag.find_all("input", {"type": "hidden"}):
                name = hidden.get("name")
                if name and name not in data:
                    data[name] = hidden.get("value", "")

        # POST login
        r = session.post(f"{BASE_URL}/mon-compte-vench.html", data=data, headers={
            **HEADERS,
            "Content-Type": "application/x-www-form-urlencoded",
            "Referer": f"{BASE_URL}/mon-compte-vench.html",
        }, timeout=15, allow_redirects=True)

        # Vérifier si connecté : la page détail ne devrait plus afficher "vous devez être abonné"
        check = session.get(f"{BASE_URL}/prochaines-ventes-aux-encheres.html", headers=HEADERS, timeout=15)
        check_text = check.text.lower()

        if "déconnexion" in check_text or "deconnexion" in check_text or "mon compte" in check_text:
            # Vérifier si l'abo est actif en chargeant une page détail
            # Chercher un lien d'annonce pour tester
            detail_soup = BeautifulSoup(check.text, "html.parser")
            detail_link = detail_soup.find("a", href=re.compile(r"vente-\d+-"))
            if detail_link:
                href = detail_link.get("href", "")
                if href.startswith("./"): href = href[2:]
                if not href.startswith("http"): href = BASE_URL + "/" + href
                detail_r = session.get(href, headers=HEADERS, timeout=15)
                if "vous devez être abonné" in detail_r.text.lower() or "vous devez etre abonne" in detail_r.text.lower():
                    log.info("✅ Connecté à Vench (abo NON actif — mode limité)")
                else:
                    log.info("✅ Connecté à Vench (abo actif — accès complet)")
            else:
                log.info("✅ Connecté à Vench")
            return True

        log.warning("⚠️ Login Vench échoué")
        return False

    except Exception as e:
        log.error(f"Erreur login Vench: {e}")
        return False


# ══════════════════════════════════════════════════════════════════════════════
# Phase 1 : Collecte des URLs depuis le listing
# ══════════════════════════════════════════════════════════════════════════════

def collect_listing_urls(session: requests.Session) -> list[str]:
    """Parcourt toutes les pages du listing et collecte les URLs d'annonces."""
    all_urls = []
    page = 1

    while True:
        url = f"{BASE_URL}/prochaines-ventes-aux-encheres.html?p={page}"
        log.info(f"Listing page {page} — {url}")

        try:
            r = session.get(url, headers=HEADERS, timeout=15)
            r.raise_for_status()
        except Exception as e:
            log.warning(f"Page {page} inaccessible: {e}")
            break

        soup = BeautifulSoup(r.text, "html.parser")

        # Pattern URL : ./vente-XXXXX-slug.html ou /vente-XXXXX-slug.html
        links = soup.find_all("a", href=re.compile(r"vente-\d+-"))
        page_urls = []
        for link in links:
            href = link.get("href", "")
            # Normaliser l'URL
            if href.startswith("./"):
                href = href[2:]
            if href.startswith("/"):
                href = BASE_URL + href
            elif not href.startswith("http"):
                href = BASE_URL + "/" + href
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
    """Extrait l'ID numérique de l'URL Vench.
    Ex: /vente-164314-un-batiment-... → '164314'
    """
    m = re.search(r"vente-(\d+)-", url)
    return m.group(1) if m else None


def scrape_detail(url: str, session: requests.Session, logged_in: bool = False) -> dict | None:
    """Scrape une page détail Vench."""
    try:
        r = session.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
    except Exception as e:
        log.warning(f"Erreur fetch détail {url}: {e}")
        return None

    html_text = r.text
    soup = BeautifulSoup(html_text, "html.parser")
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

    # ── Titre <title> — mine d'or : "Vente aux enchères ... à VILLE - PRIX € - DATE - Tribunal de VILLE"
    title_tag = soup.find("title")
    if title_tag:
        title_text = title_tag.get_text(strip=True)
        # Parser le titre structuré
        _parse_title(title_text, item)

    # ── Type de bien ─────────────────────────────────────────────────────────
    h1 = soup.find("h1")
    if h1:
        titre = h1.get_text(strip=True)
        if not item.get("type_bien"):
            item["type_bien"] = _extract_type_bien(titre)
        # Ville depuis "à Ville" dans le h1 — couper à Description, Journal, etc.
        m_ville = re.search(r"à\s+([A-ZÀ-Úa-zà-ú\s\-]+?)(?:\s*$|\s+Description|\s+Journal|\s+Vente)", titre)
        if m_ville and not item.get("ville"):
            ville = m_ville.group(1).strip()
            if len(ville) < 40 and "description" not in ville.lower():
                item["ville"] = ville

    # ── Mise à prix ──────────────────────────────────────────────────────────
    if not item.get("mise_a_prix"):
        m = re.search(r"[Mm]ise\s+[àa]\s+prix\s*:?\s*([\d\s.,]+)\s*€", text)
        if m:
            item["mise_a_prix"] = parse_prix(m.group(1))

    # ── Tribunal ─────────────────────────────────────────────────────────────
    if not item.get("tribunal"):
        m = re.search(r"(?:[Tt]ribunal|TJ|TGI)\s+(?:[Jj]udiciaire\s+)?(?:de\s+|d')([A-ZÀ-Úa-zà-ú\s\-]+?)(?:\s*,|\s*\(|\s*$|\s*Place|\s*Rue|\s*Bd)", text)
        if m:
            item["tribunal"] = f"Tribunal Judiciaire de {m.group(1).strip()}"

    # ── Ville / CP depuis le texte (lignes séparées : "37330\nChâteau-la-Vallière")
    if not item.get("code_postal"):
        m = re.search(r"\b(\d{5})\b", text)
        if m:
            item["code_postal"] = m.group(1)

    if not item.get("ville"):
        # Pattern "VILLE, Département" (ex: "Château-la-Vallière, Indre-et-Loire")
        m = re.search(r"([A-ZÀ-Ú][a-zà-ú\-]+(?:[- ][A-Za-zÀ-ú]+)*),\s+([A-ZÀ-Ú][a-zà-ú\-]+(?:[- ][A-Za-zÀ-ú]+)*)", text)
        if m:
            item["ville"] = m.group(1).strip()
            item["departement"] = m.group(2).strip()

    # ── Publication ──────────────────────────────────────────────────────────
    m = re.search(r"[Vv]ente\s+publi[ée]e\s+par\s+(.+?)\s+le\s+(\d{1,2}/\d{1,2}/\d{4})", text)
    if m:
        pub = m.group(1).strip()
        if "email" not in pub.lower() and "mot de passe" not in pub.lower():
            item["publication"] = pub

    # ── Dates ────────────────────────────────────────────────────────────────
    # Date audience / vente
    if not item.get("date_audience"):
        m = re.search(r"[Dd]ate\s+(?:de\s+)?vente\s*:?\s*(\d{1,2}/\d{1,2}/\d{2,4})", text)
        if m:
            item["date_audience"] = parse_date_fr(m.group(1))
    if not item.get("date_audience"):
        # Format "12/05/26" ou "12/05/2026"
        m = re.search(r"(\d{1,2}/\d{1,2}/\d{2,4})\s+[àa]\s+(\d{1,2}[h:]\d{2})", text)
        if m:
            item["date_audience"] = parse_date_fr(m.group(0))

    # Date visite
    m = re.search(r"[Vv]isite\s*:?\s*(\d{1,2}/\d{1,2}/\d{2,4})", text)
    if m:
        item["date_visite"] = parse_date_fr(m.group(1))

    # ── Ville / CP / Département ─────────────────────────────────────────────
    m = re.search(r"(\d{5})\s+([A-ZÀ-Úa-zà-ú\s\-]+?)(?:\s*,|\s*$)", text)
    if m:
        item["code_postal"] = m.group(1)
        item["ville"] = m.group(2).strip()

    # Département depuis le code postal
    if item.get("code_postal"):
        cp = item["code_postal"]
        if cp.startswith("97"):
            item["departement"] = cp[:3]
        elif cp.startswith("20"):
            item["departement"] = "2A" if int(cp) < 20200 else "2B"
        else:
            item["departement"] = cp[:2]

    # ── Description ────────────────────────────────────────────────────────────
    # Chercher la section "Description" dans la page (entre le marqueur et le prochain bloc)
    text_lines = soup.get_text("\n", strip=True)
    lines_list = [l.strip() for l in text_lines.split("\n") if l.strip()]

    # Trouver le bloc description structurel
    idx_desc = None
    idx_desc_end = None
    for i, line in enumerate(lines_list):
        if line == "Description":
            idx_desc = i + 1
        elif idx_desc and line in ("Mise à prix", "Mise a prix", "Avocat poursuivant",
                                    "S'abonner pour consulter", "S'abonner",
                                    "Les photos sont indicatives"):
            idx_desc_end = i
            break

    if idx_desc:
        end = idx_desc_end or min(idx_desc + 15, len(lines_list))
        desc_lines = [lines_list[i] for i in range(idx_desc, end)
                      if not any(kw in lines_list[i].lower() for kw in
                                 ["s'abonner", "mot de passe", "cookie", "google analytics",
                                  "tableau de bord", "non contractuelles", "votre email"])]
        if desc_lines:
            item["description"] = " ".join(desc_lines)

    # Fallback : utiliser le titre h1
    if not item.get("description") or len(item.get("description", "")) < 20:
        h1 = soup.find("h1")
        if h1:
            item["description"] = h1.get_text(strip=True)

    # ── Surface ──────────────────────────────────────────────────────────────
    m = re.search(r"(\d+[,.]?\d*)\s*m[²2]", text)
    if m:
        item["surface"] = float(m.group(1).replace(",", "."))

    # ── Occupation ───────────────────────────────────────────────────────────
    text_lower = text.lower()
    if "occupé" in text_lower or "occupe" in text_lower:
        item["occupation"] = "occupe"
    elif "loué" in text_lower or "loue" in text_lower or "bail" in text_lower:
        item["occupation"] = "loue"
    elif "libre" in text_lower or "vacant" in text_lower:
        item["occupation"] = "libre"

    # ── Avocat ────────────────────────────────────────────────────────────────
    # Chercher "Avocat poursuivant" suivi du nom dans les lignes structurées
    for i, line in enumerate(lines_list):
        if "avocat poursuivant" in line.lower() and i + 1 < len(lines_list):
            next_line = lines_list[i + 1]
            if "abonner" not in next_line.lower():
                # Nettoyer : couper à "Demande d", "Avocat au", etc.
                nom = re.sub(r"\s*(Demande d|Avocat au|Avocat$|Barreau).*", "", next_line).strip()
                if nom and len(nom) > 2:
                    item["avocat_nom"] = nom
            break

    # Fallback regex
    if not item.get("avocat_nom"):
        m = re.search(r"(?:Maître|Me|Mtre)\s+([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s\-]+?)(?:\s*,|\s*Demande|\s*Avocat|\s*$)", text)
        if m:
            item["avocat_nom"] = m.group(1).strip()

        m = re.search(r"(?:SELARL|SCP|AARPI|Cabinet)\s+([^\n,]+)", text)
        if m:
            item["avocat_cabinet"] = m.group(1).strip()

    # ── Téléphone avocat (toujours accessible, même sans abo) ────────────────
    for m in re.finditer(r"(\+33[\d\s.()-]+|0[1-9][\d\s.()-]{8,})", text):
        tel = m.group(0).strip().rstrip(".)")  # Retirer . et ) en fin
        digits = re.sub(r"\D", "", tel)
        if 10 <= len(digits) <= 12 and not digits.startswith("00000"):
            item["avocat_tel"] = tel
            break

    # ── Documents PDF ────────────────────────────────────────────────────────
    if True:  # PDFs accessibles même sans abo complet
        pdf_links = soup.find_all("a", href=re.compile(r"\.pdf", re.I))
        if pdf_links:
            docs = []
            for pdf_link in pdf_links:
                href = pdf_link.get("href", "")
                if href.startswith("/"):
                    href = BASE_URL + href
                elif not href.startswith("http"):
                    href = BASE_URL + "/" + href
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

    # ── Publication (déjà extrait dans _parse_title ou via le texte) ────────
    if not item.get("publication"):
        # Pattern "Vente publiée par JOURNAL le DD/MM/YYYY"
        m = re.search(r"[Vv]ente\s+publi[ée]e\s+par\s+(.+?)\s+le\s+\d{1,2}/\d{1,2}/\d{4}", text)
        if m:
            pub = m.group(1).strip()
            if "email" not in pub.lower() and "mot de passe" not in pub.lower():
                item["publication"] = pub

    # ── Nb pièces ────────────────────────────────────────────────────────────
    m = re.search(r"(\d+)\s*pi[eè]ces?", text, re.I)
    if m:
        item["nb_pieces"] = int(m.group(1))

    return item


def _parse_title(title_text: str, item: dict):
    """Parse le <title> Vench qui contient tout :
    'Vente aux enchères XXX à VILLE - PRIX € - DATE - Tribunal de VILLE'
    """
    # Extraire ville depuis "à VILLE -" (max 40 chars, pas de "Description")
    m = re.search(r"à\s+([A-ZÀ-Úa-zà-ú\s\-]{2,40}?)\s*-\s*[\d\s]", title_text)
    if m:
        ville = m.group(1).strip()
        # Vérifier que ce n'est pas pollué
        if "description" not in ville.lower() and len(ville) < 40:
            item["ville"] = ville

    # Extraire prix
    m = re.search(r"([\d\s.,]+)\s*€", title_text)
    if m:
        item["mise_a_prix"] = parse_prix(m.group(1))

    # Extraire date (DD/MM/YYYY)
    m = re.search(r"(\d{1,2}/\d{1,2}/\d{4})", title_text)
    if m:
        item["date_audience"] = parse_date_fr(m.group(1))

    # Extraire tribunal
    m = re.search(r"[Tt]ribunal\s+(?:de\s+|d')([A-ZÀ-Úa-zà-ú\s\-]+?)$", title_text)
    if m:
        item["tribunal"] = f"Tribunal Judiciaire de {m.group(1).strip()}"

    # Type de bien
    item["type_bien"] = _extract_type_bien(title_text)


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
    elif "ferme" in t or "corps de ferme" in t:
        return "Maison"
    elif "commerce" in t and "habitation" in t:
        return "Mixte"
    elif "habitation" in t:
        return "Maison"
    elif "grenier" in t or "cave" in t:
        return "Autre"
    return "Autre"


# ══════════════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════════════

def run(dry_run: bool = False, limit: int = None) -> dict:
    """Lance le scraping Vench complet."""
    session = requests.Session()

    # Login
    logged_in = login(session)

    # Phase 1 : collecter URLs
    log.info("═══ Phase 1 : Collecte URLs listing ═══")
    urls = collect_listing_urls(session)

    if limit:
        urls = urls[:limit]
        log.info(f"Limité à {limit} annonces")

    # Phase 2 : scraper les détails
    log.info(f"═══ Phase 2 : Scraping {len(urls)} pages détail ═══")
    items = []
    for i, url in enumerate(urls, 1):
        item = scrape_detail(url, session, logged_in=logged_in)
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
    parser = argparse.ArgumentParser(description="Scraper Vench — enchères judiciaires (abo)")
    parser.add_argument("--dry-run", action="store_true", help="Pas d'écriture DB")
    parser.add_argument("--limit", type=int, help="Limiter le nombre d'annonces")
    args = parser.parse_args()

    stats = run(dry_run=args.dry_run, limit=args.limit)
    print(f"\nTerminé: {json.dumps(stats, indent=2)}")
