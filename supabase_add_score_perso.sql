-- Score travaux personnel par utilisateur (stocke dans la watchlist)
ALTER TABLE watchlist
ADD COLUMN IF NOT EXISTS score_travaux_perso SMALLINT CHECK (score_travaux_perso BETWEEN 1 AND 5);
