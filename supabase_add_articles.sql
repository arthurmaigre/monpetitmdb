-- Table articles pour le CMS editorial
CREATE TABLE IF NOT EXISTS articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  category TEXT,
  keyword TEXT,
  tone TEXT DEFAULT 'pedagogique',
  length_target TEXT DEFAULT 'moyen',
  angle TEXT,
  audience TEXT[] DEFAULT '{}',
  content TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'review', 'approved', 'published')),
  author TEXT DEFAULT 'La rédaction Mon Petit MDB',
  seo_score INT,
  word_count INT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table calendrier editorial
CREATE TABLE IF NOT EXISTS editorial_calendar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_number INT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  category TEXT,
  title TEXT,
  keyword TEXT,
  tone TEXT,
  angle TEXT,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in-progress', 'generated', 'published')),
  article_id UUID REFERENCES articles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_editorial_calendar_week ON editorial_calendar(week_start);
