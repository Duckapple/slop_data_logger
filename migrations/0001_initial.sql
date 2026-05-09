CREATE TABLE IF NOT EXISTS misspellings (
  id TEXT PRIMARY KEY,
  correct_name TEXT NOT NULL,
  misspelled_name TEXT NOT NULL,
  offender_name TEXT NOT NULL,
  offender_handle TEXT,
  context TEXT NOT NULL,
  source TEXT,
  occurred_at TEXT NOT NULL,
  severity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_misspellings_occurred_at ON misspellings (occurred_at);
CREATE INDEX IF NOT EXISTS idx_misspellings_offender_name ON misspellings (offender_name);
CREATE INDEX IF NOT EXISTS idx_misspellings_misspelled_name ON misspellings (misspelled_name);
CREATE INDEX IF NOT EXISTS idx_misspellings_source ON misspellings (source);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  misspelling_id TEXT NOT NULL REFERENCES misspellings(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'link')),
  url TEXT,
  storage_key TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  caption TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attachments_misspelling_id ON attachments (misspelling_id);
