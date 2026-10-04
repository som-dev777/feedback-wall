import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// DATA_DIR lets the host point at a persistent volume; defaults to server/data/
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');

// Make sure server/data/ exists before SQLite tries to create the file
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'feedback.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS feedbacks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL DEFAULT 'Anonymous',
    message    TEXT    NOT NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

const insertStmt = db.prepare('INSERT INTO feedbacks (name, message) VALUES (?, ?)');
const getByIdStmt = db.prepare('SELECT * FROM feedbacks WHERE id = ?');
const listStmt = db.prepare('SELECT * FROM feedbacks ORDER BY created_at DESC, id DESC');

export function createFeedback(name, message) {
  const result = insertStmt.run(name, message);
  return getByIdStmt.get(result.lastInsertRowid);
}

export function listFeedbacks() {
  return listStmt.all();
}
