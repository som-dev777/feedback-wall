# Database

- Engine: SQLite via `better-sqlite3` (synchronous API)
- File: `server/data/feedback.db` (gitignored). In production the folder comes from the `DATA_DIR` env var (a Railway volume).
- On server startup, `db.js` creates `server/data/` if it's missing and runs the schema below.

## Schema
```sql
CREATE TABLE IF NOT EXISTS feedbacks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL DEFAULT 'Anonymous',
  message    TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

| Column | Notes |
|--------|-------|
| `id` | Auto-increment primary key; also used by the UI for the note accent colour and de-duplication |
| `name` | Already trimmed and defaulted by the backend before insert |
| `message` | Already validated (1–280 chars) by the backend before insert |
| `created_at` | UTC timestamp set by SQLite |

## Queries
```sql
-- insert (then read back the row using lastInsertRowid)
INSERT INTO feedbacks (name, message) VALUES (?, ?);
SELECT * FROM feedbacks WHERE id = ?;

-- list
SELECT * FROM feedbacks ORDER BY created_at DESC, id DESC;
```

## Rules
- Always use prepared statements with `?` placeholders. Never concatenate user input into SQL.
- Schema changes must be backwards-safe for an existing `feedback.db` (e.g. `ALTER TABLE ... ADD COLUMN`), or you must tell me the DB file needs deleting.
