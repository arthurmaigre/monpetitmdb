-- Table referentiel des communes francaises avec codes postaux et metropoles
CREATE TABLE IF NOT EXISTS ref_communes (
  id SERIAL PRIMARY KEY,
  code_insee VARCHAR(5) NOT NULL,
  nom_commune VARCHAR(255) NOT NULL,
  code_postal VARCHAR(5) NOT NULL,
  libelle_acheminement VARCHAR(255),
  metropole VARCHAR(100)
);

-- Index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_ref_communes_code_postal ON ref_communes(code_postal);
CREATE INDEX IF NOT EXISTS idx_ref_communes_nom_commune ON ref_communes(nom_commune);
CREATE INDEX IF NOT EXISTS idx_ref_communes_metropole ON ref_communes(metropole);
CREATE INDEX IF NOT EXISTS idx_ref_communes_code_insee ON ref_communes(code_insee);

-- Ajouter code_postal dans la table biens
ALTER TABLE biens ADD COLUMN IF NOT EXISTS code_postal VARCHAR(5);
CREATE INDEX IF NOT EXISTS idx_biens_code_postal ON biens(code_postal);
