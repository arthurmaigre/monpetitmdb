-- Ajouter la colonne surface terrain pour les maisons
ALTER TABLE biens
ADD COLUMN IF NOT EXISTS surface_terrain FLOAT;
