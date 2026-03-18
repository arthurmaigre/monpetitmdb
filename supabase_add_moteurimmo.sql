-- Ajouter la colonne moteurimmo_data pour stocker le JSON brut Moteur Immo
ALTER TABLE biens ADD COLUMN IF NOT EXISTS moteurimmo_data JSONB DEFAULT NULL;

-- Index pour requetes sur moteurimmo_data->>'uniqueId'
CREATE INDEX IF NOT EXISTS idx_biens_moteurimmo_uniqueid ON biens ((moteurimmo_data->>'uniqueId'));
