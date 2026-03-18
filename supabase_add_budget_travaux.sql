-- Ajouter la colonne budget travaux par m2 selon le score (1-5)
-- Format JSONB : {"1": 200, "2": 500, "3": 800, "4": 1200, "5": 1800}
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS budget_travaux_m2 JSONB DEFAULT '{"1": 200, "2": 500, "3": 800, "4": 1200, "5": 1800}';
