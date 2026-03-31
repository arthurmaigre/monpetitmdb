-- Table feedbacks : remontées utilisateurs via Memo
CREATE TABLE IF NOT EXISTS feedbacks (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('bug', 'suggestion', 'plainte', 'question')),
  category TEXT NOT NULL CHECK (category IN ('calculs', 'affichage', 'donnees', 'ux', 'fiscalite', 'estimation', 'performance', 'autre')),
  summary TEXT NOT NULL,
  detail TEXT,
  user_id UUID REFERENCES auth.users(id),
  bien_id INT,
  occurrences INT DEFAULT 1,
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now()
);

-- Index pour grouper par summary
CREATE INDEX IF NOT EXISTS idx_feedbacks_summary ON feedbacks (summary);
-- Index pour trier par occurrences
CREATE INDEX IF NOT EXISTS idx_feedbacks_occurrences ON feedbacks (occurrences DESC);
