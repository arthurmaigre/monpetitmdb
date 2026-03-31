-- Calendrier éditorial SEO — 12 articles sur 3 mois
-- Basé sur l'audit SEO (AUDIT_SEO.md) — stratégie de clusters
-- Colonnes : week_number, week_start, week_end, category, title, keyword, tone, angle, status

-- Nettoyer l'ancien calendrier (optionnel)
-- DELETE FROM editorial_calendar;

-- Mois 1 : Fondations
INSERT INTO editorial_calendar (week_number, week_start, week_end, category, title, keyword, tone, angle, status)
VALUES
(1, '2026-04-06', '2026-04-12', 'Stratégies', 'Investissement locatif : le guide complet 2026', 'investissement locatif', 'expert', 'Article PILIER. Guide exhaustif couvrant toutes les stratégies MDB, les 7 régimes fiscaux, le rendement, le cashflow. Exemples chiffrés. 3000 mots min. Liens vers /biens, /strategies, les articles satellites.', 'planned'),
(2, '2026-04-13', '2026-04-19', 'Stratégies', 'Calcul rendement locatif : méthode complète + simulateur', 'calcul rendement locatif', 'pedagogique', 'SATELLITE. Rendement brut vs net vs net-net. Formules détaillées avec exemples. Mentionner le simulateur Mon Petit MDB. 1500 mots. Lien vers article pilier.', 'planned'),
(3, '2026-04-20', '2026-04-26', 'Stratégies', 'Cashflow immobilier : définition, calcul et optimisation', 'cashflow immobilier', 'pedagogique', 'SATELLITE. Cashflow brut et net. Détailler chaque composant. Comment optimiser. Exemples chiffrés par régime. 1500 mots. Lien vers simulateur MDB.', 'planned'),
(4, '2026-04-27', '2026-05-03', 'Marché', 'Dans quelle ville investir en 2026 ? Top métropoles rentables', 'meilleure ville investissement locatif', 'expert', 'SATELLITE. Classement des 22 métropoles par rendement moyen DVF. Comparer prix/m², loyers, tension locative. 2000 mots. Liens vers biens par ville sur MDB.', 'planned'),

-- Mois 2 : Fiscalité + MdB
(5, '2026-05-04', '2026-05-10', 'Fiscalité', 'Fiscalité immobilière : les 7 régimes comparés (guide 2026)', 'fiscalite immobiliere', 'expert', 'Article PILIER fiscal. Comparer les 7 régimes avec tableau récapitulatif des charges déductibles, taux, abattements. 3000 mots. Lien vers simulateur MDB.', 'planned'),
(6, '2026-05-11', '2026-05-17', 'Fiscalité', 'LMNP : le guide complet du statut (micro vs réel, LFI 2025)', 'LMNP', 'expert', 'SATELLITE. Conditions, micro vs réel, amortissement composants, réintégration LFI 2025. 2000 mots. Lien vers article pilier fiscalité.', 'planned'),
(7, '2026-05-18', '2026-05-24', 'Stratégies', 'Marchand de biens : la méthode accessible aux particuliers', 'marchand de biens', 'expert', 'Article PILIER MdB. TVA sur marge 20/120, frais notaire 2.5%, IS. Comment Mon Petit MDB permet d analyser comme un MdB. Positionnement unique. 2500 mots.', 'planned'),
(8, '2026-05-25', '2026-05-31', 'Fiscalité', 'Déficit foncier : comment réduire ses impôts avec l immobilier', 'deficit foncier', 'pedagogique', 'SATELLITE. Mécanisme, plafond 10 700€, conditions. Travaux déductibles vs non. Stratégie optimisation. 1500 mots. Lien vers article pilier fiscalité.', 'planned'),

-- Mois 3 : IDR + Stratégies
(9, '2026-06-01', '2026-06-07', 'Stratégies', 'Immeuble de rapport : guide complet pour investir dans un immeuble entier', 'immeuble de rapport', 'expert', 'Article PILIER IDR. Monopropriété, création copro, coûts. Rentabilité locative vs revente découpe. 2500 mots. Données MDB.', 'planned'),
(10, '2026-06-08', '2026-06-14', 'Stratégies', 'Locataire en place : opportunité ou piège pour l investisseur ?', 'locataire en place achat', 'pedagogique', 'SATELLITE. Avantages (cashflow, décote) et risques (bail, profil). Analyser avec Mon Petit MDB. 1500 mots. Lien vers /biens.', 'planned'),
(11, '2026-06-15', '2026-06-21', 'Fiscalité', 'SCI à l IS : avantages, inconvénients et simulation complète', 'SCI IS', 'expert', 'SATELLITE. IS 15/25%, amortissement, double imposition IS + PFU 30%. Quand choisir SCI IS vs LMNP. 1500 mots. Lien vers simulateur.', 'planned'),
(12, '2026-06-22', '2026-06-28', 'Travaux', 'Budget travaux rénovation au m² : combien prévoir en 2026 ?', 'budget travaux renovation m2', 'pedagogique', 'SATELLITE. Grille de prix par poste. Score travaux 1-5. Comment MDB estime le budget. 1500 mots. Liens vers biens travaux lourds.', 'planned')
ON CONFLICT DO NOTHING;
