-- Providers discovered via Apple search or future imports
CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trade TEXT,                 -- 'plumber' | 'electrician' | ...
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  lat REAL,
  lng REAL,
  rating REAL,
  review_count INTEGER,
  source TEXT NOT NULL,       -- 'apple'
  source_id TEXT,             -- future: stable place reference if/when available
  created_at TEXT DEFAULT (datetime('now'))
);

-- Users aren't implemented yet; we store favorites by email for MVP
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

-- Leads people send to a provider (we email you/admin for now)
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (provider_id) REFERENCES providers(id)
);

