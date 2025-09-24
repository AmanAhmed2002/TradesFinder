-- USERS (email+password)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- SESSIONS (rolling 30 days)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  last_seen_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- PROVIDERS (ensure exists; definition matches what you already use)
CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trade TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  lat REAL,
  lng REAL,
  rating REAL,
  review_count INTEGER,
  source TEXT NOT NULL,
  source_id TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- FAVORITES (base table; columns that may be missing will be added by the script)
CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  user_email TEXT,            -- legacy MVP (nullable)
  user_id TEXT,               -- new (added via script if missing)
  snapshot_json TEXT,         -- new (added via script if missing)
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (provider_id) REFERENCES providers(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- EMAIL TOKENS (verify + reset)
CREATE TABLE IF NOT EXISTS email_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,         -- 'verify' | 'reset'
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_email_tokens_user_id ON email_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_tokens_expires ON email_tokens(expires_at);

