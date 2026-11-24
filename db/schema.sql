-- Reference SQLite schema (3.37+) for the item model; the default runtime stores items in a JSON file.
CREATE TABLE IF NOT EXISTS items (
  id          TEXT PRIMARY KEY CHECK (length(id) = 36),
  name        TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120 AND name = trim(name)),
  description TEXT NOT NULL DEFAULT '' CHECK (length(description) <= 2000),
  created_at  TEXT NOT NULL CHECK (julianday(created_at) IS NOT NULL),
  updated_at  TEXT NOT NULL CHECK (julianday(updated_at) IS NOT NULL),
  CHECK (julianday(updated_at) >= julianday(created_at))
) STRICT, WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_items_created_at ON items (created_at, id);
