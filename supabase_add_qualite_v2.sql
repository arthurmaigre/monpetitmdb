-- Nouveaux champs qualitatifs pour fiabiliser l'estimation
ALTER TABLE biens ADD COLUMN IF NOT EXISTS mitoyennete VARCHAR(20);
ALTER TABLE biens ADD COLUMN IF NOT EXISTS has_grenier BOOLEAN;
ALTER TABLE biens ADD COLUMN IF NOT EXISTS assainissement VARCHAR(20);
