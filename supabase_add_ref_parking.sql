-- Table de reference des prix parking/box par ville (calculee via DVF)
CREATE TABLE IF NOT EXISTS ref_prix_parking (
  id SERIAL PRIMARY KEY,
  ville VARCHAR(255) NOT NULL,
  code_postal VARCHAR(5),
  metropole VARCHAR(100),
  prix_median_box INTEGER,
  prix_median_parking INTEGER,
  nb_transactions INTEGER,
  derniere_maj TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ville, code_postal)
);
