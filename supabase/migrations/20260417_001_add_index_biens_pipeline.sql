-- Index pipeline extraction IA
-- Couvre : Locataire en place, IDR, Travaux lourds (et toute future stratégie)
-- Résout : timeout Supabase 57014 sur pagination cursor-based (id > last_id ORDER BY id)
--
-- Avant d'appliquer, vérifier les indexes existants :
--   SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'biens' ORDER BY indexname;
-- Si idx_biens_pipeline existe déjà avec une définition différente :
--   DROP INDEX CONCURRENTLY idx_biens_pipeline;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_biens_pipeline
ON biens (strategie_mdb, regex_statut, id ASC)
WHERE statut = 'Toujours disponible';
