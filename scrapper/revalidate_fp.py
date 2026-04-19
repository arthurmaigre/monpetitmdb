#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Revalide les biens avec regex_statut IS NULL ou echec_quota via Claude CLI (haiku).
15 biens par batch, 3 workers paralleles.
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
        "(bail d'habitation en cours, loyer actuel mentionn\u00e9, occup\u00e9 par un locataire) ? "
        "R\u00e9ponds uniquement OUI ou NON."
    ),
    "Travaux lourds": (
        "Ce bien immobilier n\u00e9cessite-t-il des travaux importants qui d\u00e9cotent significativement le prix "
        "(r\u00e9novation compl\u00e8te, gros \u0153uvre, inhabitable, tout \u00e0 refaire, v\u00e9tuste, "
        "remise aux normes lourde, ou r\u00e9novation \u00e9nerg\u00e9tique majeure DPE F ou G) "
        "\u2014 et non de simples travaux cosm\u00e9tiques, de peinture ou de finition ? "
        "R\u00e9ponds uniquement OUI ou NON."
    ),
    "Division": (
        "Ce bien immobilier a-t-il un vrai potentiel de division (en plusieurs logements "
        "r\u00e9sidentiels ind\u00e9pendants, ou division parcellaire/terrain permettant de construire) ? "
        "Inclus les maisons avec grand terrain divisible, les immeubles \u00e0 convertir, "
        "les plateaux \u00e0 am\u00e9nager. Exclus les divisions de bureaux ou locaux commerciaux "
        "sans vocation r\u00e9sidentielle. R\u00e9ponds uniquement OUI ou NON."
    ),
    "Immeuble de rapport": (
        "Ce bien immobilier est-il un immeuble de rapport destin\u00e9 \u00e0 l'investissement locatif "
        "(immeuble avec plusieurs logements ou lots locatifs, vendu en bloc ou en monopropri\u00e9t\u00e9, "
        "avec ou sans locataires en place) ? "
        "Inclus les immeubles avec plusieurs lots ind\u00e9pendants m\u00eame s'ils sont vides. "
        "Exclus les maisons individuelles r\u00e9sidentielles, les villas et les appartements seuls. "
        "R\u00e9ponds uniquement OUI ou NON."
    ),
}

QUOTA_KW = ["usage limit", "rate limit", "quota", "overloaded", "too many", "capacity", "error", "unavailable"]
BATCH_SIZE = 15
CONCURRENCY = 3


def validate_one(bien):
    strategie = bien["strategie_mdb"]
    prompt_base = HAIKU_PROMPTS.get(strategie, "")
    if not prompt_base:
        return bien["id"], "valide"
    nl = chr(10)
    title = (bien.get("title") or "").replace(nl, " ")[:200]
    desc = (bien.get("description") or "").replace(nl, " ")[:800]
    text = prompt_base + nl + nl + "Titre : " + title + nl + nl + "Description : " + desc
    try:
        env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_API_KEY"}
        result = subprocess.run(
            ["claude", "-p", text, "--model", "haiku", "--output-format", "text", "--max-turns", "1"],
            capture_output=True, text=True, timeout=60, env=env,
        )
        out = result.stdout.strip().upper()
        err = result.stderr.strip().lower()
        if any(k in err for k in QUOTA_KW) or (not out and result.returncode != 0):
            log.warning("[haiku] quota/erreur -> echec_quota id=" + str(bien["id"]))
            return bien["id"], "echec_quota"
        return bien["id"], "valide" if out.startswith("OUI") else "faux_positif"
    except Exception as e:
        log.error("[haiku] exception id=" + str(bien["id"]) + ": " + str(e))
        return bien["id"], "echec_quota"


def validate_batch(biens):
    results = {}
    for b in biens:
        bid, statut = validate_one(b)
        results[bid] = statut
    return results
def fetch_biens(limit=None):
    all_biens = []
    offset = 0
    page_size = 1000
    while True:
        q = (supabase.from_('biens')
             .select('id, strategie_mdb, moteurimmo_data')
             .or_('regex_statut.is.null,regex_statut.eq.echec_quota')
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

    log.info("Chargement des biens (limit=" + str(args.limit or 'tous') + ")...")
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
