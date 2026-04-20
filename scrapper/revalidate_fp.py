#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Revalide les biens Stream Estate avec regex_statut IS NULL ou echec_quota via Claude CLI (haiku).
5 biens par appel CLI, 5 workers paralleles. Cible uniquement stream_estate_id IS NOT NULL.
"""

import os, sys, subprocess, logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from supabase import create_client

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or os.environ['SUPABASE_KEY']
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

HAIKU_PROMPTS = {
    "Locataire en place": (
        "Ce bien immobilier est-il vendu avec un locataire en place "
        "(bail d'habitation en cours, loyer actuel mentionné, occupé par un locataire) ? "
        "Réponds uniquement OUI ou NON."
    ),
    "Travaux lourds": (
        "Ce bien immobilier nécessite-t-il des travaux importants qui décotent significativement le prix "
        "(rénovation complète, gros oeuvre, inhabitable, tout à refaire, vétuste, "
        "remise aux normes lourde, ou rénovation énergétique majeure DPE F ou G) "
        "— et non de simples travaux cosmétiques, de peinture ou de finition ? "
        "Réponds uniquement OUI ou NON."
    ),
    "Division": (
        "Ce bien immobilier a-t-il un vrai potentiel de division (en plusieurs logements "
        "résidentiels indépendants, ou division parcellaire/terrain permettant de construire) ? "
        "Inclus les maisons avec grand terrain divisible, les immeubles à convertir, "
        "les plateaux à aménager. Exclus les divisions de bureaux ou locaux commerciaux "
        "sans vocation résidentielle. Réponds uniquement OUI ou NON."
    ),
    "Immeuble de rapport": (
        "Ce bien immobilier est-il un immeuble de rapport destiné à l'investissement locatif "
        "(immeuble avec plusieurs logements ou lots locatifs, vendu en bloc ou en monopropriété, "
        "avec ou sans locataires en place) ? "
        "Inclus les immeubles avec plusieurs lots indépendants même s'ils sont vides. "
        "Exclus les maisons individuelles résidentielles, les villas et les appartements seuls. "
        "Réponds uniquement OUI ou NON."
    ),
}

QUOTA_KW = ["usage limit", "rate limit", "quota", "overloaded", "too many", "capacity", "error", "unavailable"]
BATCH_SIZE = 5
CONCURRENCY = 5


def validate_batch(biens):
    """1 appel CLI Haiku pour le batch entier. Tous les biens ont la meme strategie."""
    if not biens:
        return {}
    strategie = biens[0]["strategie_mdb"]
    prompt_base = HAIKU_PROMPTS.get(strategie, "")
    if not prompt_base:
        return {b["id"]: "valide" for b in biens}
    nl = chr(10)
    items = []
    for i, b in enumerate(biens, 1):
        title = (b.get("title") or "").replace(nl, " ")[:200]
        desc = (b.get("description") or "").replace(nl, " ")
        items.append("Bien " + str(i) + ":" + nl + "Titre : " + title + nl + "Description : " + desc)
    text = (
        prompt_base + nl + nl
        + "Evalue les " + str(len(biens)) + " biens suivants. "
        + "Pour chaque bien, reponds uniquement OUI ou NON sur une ligne separee (dans l'ordre)."
        + nl + nl + (nl + nl).join(items)
    )
    try:
        env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_API_KEY"}
        result = subprocess.run(
            ["claude", "-p", text, "--model", "haiku", "--output-format", "text", "--max-turns", "1"],
            capture_output=True, text=True, timeout=120, env=env,
        )
        out = result.stdout.strip().upper()
        err = result.stderr.strip().lower()
        if any(k in err for k in QUOTA_KW) or (not out and result.returncode != 0):
            log.warning("[haiku] quota/erreur batch -> echec_quota x" + str(len(biens)))
            return {b["id"]: "echec_quota" for b in biens}
        lines = [l.strip() for l in out.splitlines() if l.strip()]
        oui_non = [l for l in lines if l.startswith("OUI") or l.startswith("NON")]
        results = {}
        for i, b in enumerate(biens):
            if i < len(oui_non):
                results[b["id"]] = "valide" if oui_non[i].startswith("OUI") else "faux_positif"
            else:
                log.warning("[haiku] reponse manquante bien " + str(b["id"]) + " -> echec_quota")
                results[b["id"]] = "echec_quota"
        return results
    except Exception as e:
        log.error("[haiku] exception batch: " + str(e))
        return {b["id"]: "echec_quota" for b in biens}


def fetch_biens(limit=None):
    all_biens = []
    offset = 0
    page_size = 1000
    while True:
        q = (supabase.from_('biens')
             .select('id, strategie_mdb, moteurimmo_data')
             .not_.is_('stream_estate_id', 'null')
             .or_('regex_statut.is.null,regex_statut.eq.echec_quota')
             .order('created_at', desc=True)
             .range(offset, offset + page_size - 1))
        resp = q.execute()
        rows = resp.data or []
        if not rows:
            break
        for r in rows:
            import json as _json
            raw = r.get("moteurimmo_data") or {}
            md = _json.loads(raw) if isinstance(raw, str) else raw
            all_biens.append({
                'id': r['id'],
                'strategie_mdb': r.get('strategie_mdb') or '',
                'title': md.get('title') or '',
                'description': md.get('description') or '',
            })
        offset += page_size
        if len(rows) < page_size:
            break
        if limit and len(all_biens) >= limit:
            break
    if limit:
        all_biens = all_biens[:limit]
    return all_biens


def update_statuts(updates):
    if not updates:
        return
    for statut in ('valide', 'faux_positif', 'echec_quota'):
        ids = [bid for bid, s in updates.items() if s == statut]
        if ids:
            supabase.from_('biens').update({'regex_statut': statut}).in_('id', ids).execute()
            log.info("  -> " + statut + ": " + str(len(ids)) + " biens mis a jour")


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=None)
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    log.info("Chargement des biens SE (stream_estate_id IS NOT NULL, limit=" + str(args.limit or 'tous') + ")...")
    biens = fetch_biens(limit=args.limit)
    log.info(str(len(biens)) + " biens a revalider")

    by_strat = {}
    for b in biens:
        s = b['strategie_mdb']
        by_strat.setdefault(s, []).append(b)

    total_valide = total_fp = total_echec = 0
    quota_hit = False

    for strat, strat_biens in by_strat.items():
        log.info("\n=== " + strat + " : " + str(len(strat_biens)) + " biens ===")
        batches = [strat_biens[i:i+BATCH_SIZE] for i in range(0, len(strat_biens), BATCH_SIZE)]

        with ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
            futures = {executor.submit(validate_batch, batch): batch for batch in batches}
            for future in as_completed(futures):
                batch = futures[future]
                try:
                    results = future.result()
                except Exception as e:
                    log.error("[worker] exception: " + str(e))
                    results = {b['id']: 'echec_quota' for b in batch}

                v = sum(1 for s in results.values() if s == 'valide')
                fp = sum(1 for s in results.values() if s == 'faux_positif')
                eq = sum(1 for s in results.values() if s == 'echec_quota')
                total_valide += v
                total_fp += fp
                total_echec += eq
                if eq == len(batch):
                    quota_hit = True

                log.info("  batch " + str(len(batch)) + " -> valide:" + str(v) + " faux_positif:" + str(fp) + " echec_quota:" + str(eq))

                if not args.dry_run:
                    update_statuts(results)

        if quota_hit:
            log.warning("Quota epuise detecte - arret")
            break

    log.info("\n=== TOTAL : valide=" + str(total_valide) + " faux_positif=" + str(total_fp) + " echec_quota=" + str(total_echec) + " ===")
    if args.dry_run:
        log.info("[DRY RUN] Aucune mise a jour effectuee")


if __name__ == '__main__':
    main()
