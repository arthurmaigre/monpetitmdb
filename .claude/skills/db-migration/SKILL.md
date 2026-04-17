---
description: Crée une migration SQL Supabase avec la convention de nommage et les patterns courants
---

# Migration Supabase

## Convention nommage

```
YYYYMMDD_{N}_{description}.sql
Exemple : 20260416_001_add_estimation_cache_encheres.sql
```

Placer dans : `supabase/migrations/` ou le dossier SQL du projet.

## Template migration

```sql
-- 20260416_001_{description}.sql
-- Description : {ce que fait cette migration}

-- ✅ Toujours vérifier si l'objet existe avant de créer
ALTER TABLE biens ADD COLUMN IF NOT EXISTS ma_colonne TEXT;

-- Index optimisé
CREATE INDEX IF NOT EXISTS idx_biens_ma_colonne 
  ON biens (ma_colonne) 
  WHERE ma_colonne IS NOT NULL;

-- RLS (si nouvelle table)
ALTER TABLE ma_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own data" ON ma_table
  FOR SELECT USING (auth.uid() = user_id);
```

## Patterns courants

```sql
-- Ajouter colonne avec défaut
ALTER TABLE biens ADD COLUMN IF NOT EXISTS statut_x TEXT DEFAULT 'pending';

-- Index partiel (performance, evite index sur NULL)
CREATE INDEX IF NOT EXISTS idx_encheres_a_enrichir 
  ON encheres (created_at) 
  WHERE enrichissement_statut IS NULL;

-- Index JSONB (pour lots_data, price_history...)
CREATE INDEX IF NOT EXISTS idx_biens_lots_data 
  ON biens USING gin(lots_data);

-- Contrainte unique
ALTER TABLE biens ADD CONSTRAINT biens_url_unique UNIQUE (url);
```

## Appliquer en prod

Via Supabase dashboard → SQL Editor, ou via Supabase CLI :
```bash
supabase db push  # si CLI configuré
```

## Si $ARGUMENTS contient une description → créer directement le fichier de migration
