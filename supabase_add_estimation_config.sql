-- Table de configuration du moteur d'estimation (1 seule ligne)
CREATE TABLE IF NOT EXISTS estimation_config (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertion de la config par defaut
INSERT INTO estimation_config (id, config) VALUES (1, '{
  "periodes": {
    "principale": { "annee_min": 2022, "annee_max": null, "label": "Marche actuel (2022+)", "poids": 1.0 },
    "reference_pre_covid": { "annee_min": 2018, "annee_max": 2020, "label": "Reference pre-COVID (2018-2020)", "poids": 0.7 },
    "decay_lambda": 0.04,
    "description": "Ponderation temporelle exponentielle : poids = e^(-lambda x mois). Les transactions recentes pesent plus. La periode pre-COVID sert de reference car le marche est revenu a ce niveau."
  },
  "rayons_recherche": {
    "etapes_degres": [0.003, 0.005, 0.007, 0.01],
    "etapes_metres_approx": [330, 550, 770, 1100],
    "seuil_min_transactions": 10,
    "description": "Rayon adaptatif : commence a 330m, elargit jusqua 1.1km ou 10+ transactions trouvees."
  },
  "filtres_surface": {
    "appartement": { "tolerance_pct": 30, "description": "Surface cible +/- 30%" },
    "maison": { "tolerance_pct": 40, "description": "Surface cible +/- 40% (plus de variabilite)" },
    "studio": { "tolerance_pct": 50, "description": "Surface cible +/- 50% (petites surfaces, peu de comparables)" }
  },
  "filtres_prix_m2": {
    "min": 500,
    "max": 15000,
    "description": "Transactions hors de cette fourchette sont exclues (aberrations)"
  },
  "correcteurs": {
    "etage_sans_ascenseur": {
      "0": 0.88, "1": 1.00, "2": 0.98, "3": 0.95, "4": 0.91, "5+": 0.86,
      "description": "RDC penalise (bruit, vis-a-vis). 1er = reference. La peinibilite augmente avec les etages sans ascenseur."
    },
    "etage_avec_ascenseur": {
      "0": 0.88, "1": 0.97, "2-3": 1.00, "4-5": 1.03, "6+": 1.06,
      "description": "RDC toujours penalise. Etages eleves valorises (vue, calme, luminosite)."
    },
    "dpe": {
      "A": 1.08, "B": 1.06, "C": 1.03, "D": 1.00, "E": 0.95, "F": 0.88, "G": 0.80,
      "description": "D = reference. Impact croissant F/G avec obligations renovation energetique 2025+. A/B = prime verte."
    },
    "exterieur": {
      "terrasse_grande": 1.06,
      "balcon": 1.03,
      "jardin_privatif_appartement": 1.04,
      "loggia": 1.02,
      "aucun": 1.00,
      "description": "Espaces exterieurs privatifs. Terrasse > balcon > loggia."
    },
    "score_travaux": {
      "1": 1.00, "2": 0.95, "3": 0.85, "4": 0.75, "5": 0.60,
      "description": "1=etat correct (reference). 5=ruine/rehabilitation complete. Decote progressive pour cout des travaux."
    },
    "parking": {
      "box_ferme": { "valeur_defaut": 18000, "description": "Valeur absolue ajoutee, pas de %. Varie selon la ville." },
      "parking_ouvert": { "valeur_defaut": 10000, "description": "Decote ~45% vs box ferme." },
      "description": "Le parking sajoute en valeur absolue car quasi-independant de la surface habitable."
    },
    "piscine": {
      "grande_ville": 30000,
      "ville_moyenne": 18000,
      "zone_rurale": 8000,
      "description": "Valeur absolue selon la zone. Appliquer 60-70% en cas de doute."
    },
    "terrain_maison": {
      "methode": "logarithmique",
      "description": "Valeur marginale decroissante : les premiers m2 valent plus que les suivants. f(terrain) = log(surface_terrain). A calibrer par zone via DVF."
    },
    "jardin_etat": {
      "soigne_sud": 1.03,
      "standard": 1.00,
      "a_amenager": 0.97,
      "friche": 0.93,
      "description": "Detecte par NLP sur la description ou analyse photos (futur)."
    },
    "vue_exposition": {
      "vue_degagee": 1.04,
      "exposition_sud": 1.02,
      "vis_a_vis": 0.97,
      "description": "Signaux faibles detectes dans la description."
    }
  },
  "confiance": {
    "A": { "marge_pct": 5, "conditions": "Adresse precise + N>=15 dans 500m + surface + DPE + etage + nb_pieces" },
    "B": { "marge_pct": 10, "conditions": "N>=8 + 2 variables qualitatives" },
    "C": { "marge_pct": 20, "conditions": "N>=5 transactions" },
    "D": { "marge_pct": 30, "conditions": "Peu de transactions ou beaucoup de donnees manquantes" },
    "description": "Le niveau de confiance determine la fourchette affichee. Il depend du nombre de comparables, de la precision de ladresse et des variables qualitatives disponibles."
  }
}') ON CONFLICT (id) DO NOTHING;
