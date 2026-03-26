-- Ajouter la colonne lots_data pour stocker les lots des immeubles de rapport
-- Format JSONB : { nb_lots, loyer_total_mensuel, loyer_total_annuel, monopropriete, compteurs_individuels, lots: [...] }

ALTER TABLE biens ADD COLUMN IF NOT EXISTS lots_data JSONB DEFAULT NULL;

-- Ajouter le cron config pour extraction IDR
INSERT INTO cron_config (id, enabled, schedule, params)
VALUES ('extraction_idr', false, '*/2 * * * *', '{}')
ON CONFLICT (id) DO NOTHING;
