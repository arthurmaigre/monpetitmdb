-- ============================================================================
-- Table encheres — Ventes aux enchères judiciaires immobilières
-- Sources : Licitor, Avoventes, Vench
-- ============================================================================

CREATE TABLE encheres (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- Source primaire (première source ayant créé le bien)
  source        text NOT NULL,              -- 'licitor' | 'avoventes' | 'vench'
  id_source     text NOT NULL,              -- ID unique de la source primaire

  -- Multi-source : toutes les sources ayant contribué au bien
  -- [{source, id_source, url, scraped_at}]
  sources       jsonb DEFAULT '[]'::jsonb,

  -- Statut cycle de vie
  -- a_venir : date audience future, annonce visible sur au moins 1 listing
  -- adjuge  : date audience passée, encore visible (informatif, surenchère possible 10j)
  -- vendu   : prix adjugé confirmé (Avoventes)
  -- surenchere : surenchère déposée, nouvelle mise à prix
  -- retire  : vente retirée avant l'audience (badge Avoventes ou disparition)
  -- expire  : annonce disparue de TOUS les listings sources
  statut        text DEFAULT 'a_venir'
                CHECK (statut IN ('a_venir','adjuge','vendu','surenchere','retire','expire')),

  -- Bien
  type_bien     text,
  adresse       text,
  ville         text,
  code_postal   text,
  departement   text,
  surface       float,
  nb_pieces     int,
  nb_lots       int,
  description   text,
  occupation    text,                       -- libre | occupe | loue | NC

  -- Enchère
  tribunal      text,
  mise_a_prix   float,
  prix_adjuge   float,                      -- Avoventes exclusif
  frais_preemption float,
  date_audience timestamptz,
  date_visite   timestamptz,
  publication   text,                       -- journal de publication légale

  -- Avocat poursuivant
  avocat_nom    text,
  avocat_cabinet text,
  avocat_tel    text,
  avocat_email  text,

  -- Geo
  latitude      float,
  longitude     float,

  -- Photos & docs
  photo_url     text,
  -- [{type: "ccv"|"pv"|"diag"|"affiche"|"autre", url, label}]
  documents     jsonb,

  -- Estimation DVF (cache, même logique que table biens)
  estimation_prix_m2    float,
  estimation_prix_total float,
  estimation_confiance  text,               -- A/B/C/D
  estimation_nb_comparables int,
  estimation_rayon_m    int,
  estimation_date       timestamptz,
  estimation_details    jsonb,

  -- Pipeline IA (enrichissement Sonnet)
  enrichissement_statut text,               -- ok | no_data | echec | null
  enrichissement_date   timestamptz,
  enrichissement_data   jsonb,              -- données extraites par Sonnet

  -- Dates
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),

  -- Dedup intra-source
  UNIQUE(source, id_source)
);

-- Index pour matching cross-source (fusion)
CREATE INDEX idx_encheres_ville_date ON encheres (ville, date_audience);

-- Index statut (filtres fréquents)
CREATE INDEX idx_encheres_statut ON encheres (statut);

-- Index source
CREATE INDEX idx_encheres_source ON encheres (source);

-- Index geo (carte)
CREATE INDEX idx_encheres_geo ON encheres (latitude, longitude) WHERE latitude IS NOT NULL;

-- Index estimation (décote)
CREATE INDEX idx_encheres_estimation ON encheres (estimation_prix_total) WHERE estimation_prix_total IS NOT NULL;

-- Index enrichissement (batch IA)
CREATE INDEX idx_encheres_enrichissement ON encheres (enrichissement_statut);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_encheres_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_encheres_updated_at
  BEFORE UPDATE ON encheres
  FOR EACH ROW
  EXECUTE FUNCTION update_encheres_updated_at();
