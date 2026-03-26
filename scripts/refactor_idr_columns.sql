-- ============================================================
-- Refactoring IDR : colonnes agrégées + lots_data propre
-- ============================================================

-- 1. Nouvelles colonnes sur biens
ALTER TABLE biens ADD COLUMN IF NOT EXISTS nb_lots INT DEFAULT NULL;
ALTER TABLE biens ADD COLUMN IF NOT EXISTS monopropriete BOOLEAN DEFAULT NULL;
ALTER TABLE biens ADD COLUMN IF NOT EXISTS compteurs_individuels BOOLEAN DEFAULT NULL;

-- 2. Migration : extraire les données agrégées depuis lots_data existant
UPDATE biens
SET
  nb_lots = (lots_data->>'nb_lots')::int,
  monopropriete = (lots_data->>'monopropriete')::boolean,
  compteurs_individuels = (lots_data->>'compteurs_individuels')::boolean
WHERE lots_data IS NOT NULL
  AND strategie_mdb = 'Immeuble de rapport';

-- 3. Migration : stocker loyer_total dans loyer si pas déjà fait
UPDATE biens
SET loyer = (lots_data->>'loyer_total_mensuel')::numeric
WHERE lots_data IS NOT NULL
  AND strategie_mdb = 'Immeuble de rapport'
  AND loyer IS NULL
  AND lots_data->>'loyer_total_mensuel' IS NOT NULL;

-- 4. Migration : stocker taxe_fonc dans taxe_fonc_ann si pas déjà fait
-- (déjà fait par l'extraction, mais au cas où)

-- 5. Nettoyer lots_data : ne garder que le tableau de lots
-- On garde la structure actuelle pour l'instant, le front lira lots_data.lots

-- 6. Vérification
-- SELECT nb_lots, monopropriete, compteurs_individuels, loyer, lots_data->>'nb_lots' as json_nb
-- FROM biens WHERE strategie_mdb = 'Immeuble de rapport' AND lots_data IS NOT NULL LIMIT 10;
