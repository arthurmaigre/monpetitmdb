-- Backfill type_bien from moteurimmo_data.category
-- Les biens ingérés via l'API Next.js n'avaient pas le mapping category -> type_bien
-- Ce script corrige les données historiques

UPDATE biens
SET type_bien = CASE
  WHEN moteurimmo_data->>'category' = 'flat' THEN 'Appartement'
  WHEN moteurimmo_data->>'category' = 'house' THEN 'Maison'
  WHEN moteurimmo_data->>'category' = 'block' THEN 'Immeuble'
  WHEN moteurimmo_data->>'category' = 'land' THEN 'Terrain'
  WHEN moteurimmo_data->>'category' = 'parking/garage/box' THEN 'Parking'
  WHEN moteurimmo_data->>'category' = 'office' THEN 'Bureau'
  WHEN moteurimmo_data->>'category' = 'premises' THEN 'Local'
  WHEN moteurimmo_data->>'category' = 'shop' THEN 'Commerce'
  WHEN moteurimmo_data->>'category' = 'misc' THEN 'Autre'
  ELSE type_bien
END
WHERE type_bien IS NULL
  AND moteurimmo_data->>'category' IS NOT NULL;

-- Vérification : combien de biens restent sans type_bien après le backfill
-- SELECT count(*) FROM biens WHERE type_bien IS NULL;

-- Pour les biens dont moteurimmo_data est stocké en double-string (JSON dans un string),
-- il faut d'abord parser. Vérifions s'il y en a :
-- SELECT count(*) FROM biens WHERE type_bien IS NULL AND moteurimmo_data::text LIKE '"{%';

-- Si oui, utiliser cette variante :
UPDATE biens
SET type_bien = CASE
  WHEN (moteurimmo_data::text)::jsonb->>'category' = 'flat' THEN 'Appartement'
  WHEN (moteurimmo_data::text)::jsonb->>'category' = 'house' THEN 'Maison'
  WHEN (moteurimmo_data::text)::jsonb->>'category' = 'block' THEN 'Immeuble'
  WHEN (moteurimmo_data::text)::jsonb->>'category' = 'land' THEN 'Terrain'
  WHEN (moteurimmo_data::text)::jsonb->>'category' = 'parking/garage/box' THEN 'Parking'
  WHEN (moteurimmo_data::text)::jsonb->>'category' = 'office' THEN 'Bureau'
  WHEN (moteurimmo_data::text)::jsonb->>'category' = 'premises' THEN 'Local'
  WHEN (moteurimmo_data::text)::jsonb->>'category' = 'shop' THEN 'Commerce'
  WHEN (moteurimmo_data::text)::jsonb->>'category' = 'misc' THEN 'Autre'
  ELSE type_bien
END
WHERE type_bien IS NULL
  AND moteurimmo_data IS NOT NULL;
