# Configuration MCPs — Credentials requis

Ce fichier explique comment activer chaque MCP qui nécessite un token/clé API.
Les MCPs sans credentials (Context7, Sequential Thinking) fonctionnent déjà.

---

## MCPs déjà actifs (0 action requise)

| MCP | Statut | Utilité |
|---|---|---|
| **context7** | ✅ Actif | Docs Next.js/Stripe/Supabase à jour |
| **sequential-thinking** | ✅ Actif | Raisonnement structuré pour problèmes complexes |

---

## MCPs à activer (credentials requis)

### 1. Supabase MCP — Schéma DB en temps réel

**Ce que ça permet** : Claude interroge directement tes tables sans lire CLAUDE.md.

**Action** :
1. Aller sur [supabase.com](https://supabase.com) → Settings → Access Tokens
2. Créer un nouveau Personal Access Token (nom : "Claude Code MCP")
3. Ajouter dans `.env.local` du projet :
   ```
   SUPABASE_ACCESS_TOKEN=sbp_...
   ```
4. Relancer Claude Code — le MCP Supabase sera actif

---

### 2. GitHub MCP — Gestion PRs et Issues

**Ce que ça permet** : créer des issues et des PRs directement depuis Claude Code.

**Action** :
1. Aller sur [github.com/settings/tokens](https://github.com/settings/tokens)
2. "Generate new token (classic)" — scopes : `repo`, `read:org`
3. Ajouter dans `.env.local` :
   ```
   GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...
   ```

---

### 3. Brave Search MCP — Recherche web

**Ce que ça permet** : rechercher la concurrence, les lois fiscales récentes, les tendances marché immobilier.

**Action** :
1. S'inscrire sur [brave.com/search/api](https://brave.com/search/api/) — plan gratuit : 2000 req/mois
2. Récupérer la clé API
3. Ajouter dans `.env.local` :
   ```
   BRAVE_API_KEY=BSA...
   ```

---

### 4. Stripe MCP — Debug abonnements en direct

**Ce que ça permet** : chercher un client Stripe, vérifier un webhook, diagnostiquer un checkout raté.

**Action** :
1. Ta clé Stripe est déjà dans `.env.local` comme `STRIPE_SECRET_KEY`
2. Le MCP utilise cette même clé → **déjà configuré** si `STRIPE_SECRET_KEY` est dans l'env
3. Vérifier que la variable s'appelle exactement `STRIPE_SECRET_KEY`

---

### 5. Vercel MCP — Monitoring déploiements

**Ce que ça permet** : voir le statut des builds, les logs edge, les variables d'env depuis Claude.

**Action** :
1. Aller sur [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Créer un token (nom : "Claude Code MCP")
3. Ajouter dans `.env.local` :
   ```
   VERCEL_TOKEN=...
   ```

---

## Comment fonctionnent les env vars pour les MCPs

Le fichier `.mcp.json` référence `${VARIABLE}`. Claude Code charge automatiquement ces variables depuis :
1. Les variables d'environnement système Windows
2. Le fichier `.env.local` du projet (si Claude Code le lit)

**Recommandation** : ajouter les tokens dans les variables d'environnement Windows :
```
Panneau de configuration → Système → Variables d'environnement → Nouveau
```
Ou via PowerShell :
```powershell
[System.Environment]::SetEnvironmentVariable("SUPABASE_ACCESS_TOKEN", "sbp_...", "User")
[System.Environment]::SetEnvironmentVariable("BRAVE_API_KEY", "BSA...", "User")
[System.Environment]::SetEnvironmentVariable("GITHUB_PERSONAL_ACCESS_TOKEN", "ghp_...", "User")
[System.Environment]::SetEnvironmentVariable("VERCEL_TOKEN", "...", "User")
```

Redémarrer Claude Code après avoir ajouté les variables.
