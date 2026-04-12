---
name: Supabase keys migration
description: Les cles Supabase ont migre vers le nouveau format sb_publishable/sb_secret (legacy desactivees 2026-03-18)
type: project
---

Les anciennes cles API Supabase (format JWT eyJhbGci...) ont ete desactivees le 2026-03-18.
Nouvelles cles : sb_publishable_ (anon) et sb_secret_ (service_role).

**Why:** Supabase a migre tous les projets vers le nouveau format de cles.
**How to apply:** Toujours utiliser sb_secret_ pour SUPABASE_KEY (scraper) et SUPABASE_SECRET_KEY (frontend admin). Ne jamais remettre les anciennes cles JWT.
