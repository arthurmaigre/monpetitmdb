-- Ajouter garage_attenant dans la config parking
UPDATE estimation_config
SET config = jsonb_set(
  config,
  '{correcteurs,parking,garage_attenant}',
  '{"valeur_defaut": 15000, "description": "Garage attenant a une maison"}'
)
WHERE id = 1;
