const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'solace.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS content (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection TEXT NOT NULL,
  slug TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  sort INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS items_coll ON items(collection, published, sort);
CREATE UNIQUE INDEX IF NOT EXISTS items_slug ON items(collection, slug);
CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  name TEXT NOT NULL, email TEXT, phone TEXT, notes TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  name TEXT, email TEXT, phone TEXT, subject TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  files TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'new',
  note TEXT,
  emailed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER, ref TEXT, source TEXT, page TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS subscribers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE, name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

function parse(row) {
  if (!row) return null;
  let data = {};
  try { data = JSON.parse(row.data || '{}'); } catch (e) {}
  return { ...data, id: row.id, slug: row.slug, sort: row.sort, published: !!row.published, created_at: row.created_at, updated_at: row.updated_at };
}

const Items = {
  list(collection, { all = false } = {}) {
    const rows = db.prepare(`SELECT * FROM items WHERE collection = ? ${all ? '' : 'AND published = 1'} ORDER BY sort ASC, id DESC`).all(collection);
    return rows.map(parse);
  },
  get(id) { return parse(db.prepare('SELECT * FROM items WHERE id = ?').get(id)); },
  bySlug(collection, slug) { return parse(db.prepare('SELECT * FROM items WHERE collection = ? AND slug = ?').get(collection, slug)); },
  uniqueSlug(collection, base, id) {
    let slug = base || 'item', n = 1;
    while (db.prepare('SELECT id FROM items WHERE collection = ? AND slug = ? AND id != ?').get(collection, slug, id || 0)) slug = `${base}-${++n}`;
    return slug;
  },
  create(collection, data, { slug, published = true, sort = 0 } = {}) {
    const info = db.prepare('INSERT INTO items (collection, slug, data, published, sort) VALUES (?,?,?,?,?)')
      .run(collection, this.uniqueSlug(collection, slug), JSON.stringify(data), published ? 1 : 0, sort);
    return this.get(info.lastInsertRowid);
  },
  update(id, data, { slug, published, sort } = {}) {
    const cur = db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    if (!cur) return null;
    db.prepare(`UPDATE items SET data = ?, slug = ?, published = ?, sort = ?, updated_at = datetime('now') WHERE id = ?`).run(
      JSON.stringify(data),
      slug ? this.uniqueSlug(cur.collection, slug, id) : cur.slug,
      published === undefined ? cur.published : (published ? 1 : 0),
      sort === undefined ? cur.sort : sort,
      id);
    return this.get(id);
  },
  patch(id, partial) {
    const cur = this.get(id); if (!cur) return null;
    const { id: _i, slug, sort, published, created_at, updated_at, ...data } = cur;
    return this.update(id, { ...data, ...partial });
  },
  remove(id) { db.prepare('DELETE FROM items WHERE id = ?').run(id); },
  setPublished(id, on) { db.prepare(`UPDATE items SET published = ?, updated_at = datetime('now') WHERE id = ?`).run(on ? 1 : 0, id); },
  setSort(id, sort) { db.prepare('UPDATE items SET sort = ? WHERE id = ?').run(sort, id); },
};

const Settings = {
  all() { const o = {}; for (const r of db.prepare('SELECT * FROM settings').all()) o[r.key] = r.value; return o; },
  get(k) { const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(k); return r ? r.value : undefined; },
  set(k, v) { db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(k, v == null ? '' : String(v)); },
};

const Content = {
  all() { const o = {}; for (const r of db.prepare('SELECT key, value FROM content').all()) o[r.key] = r.value; return o; },
  set(k, v) { db.prepare(`INSERT INTO content (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).run(k, v == null ? '' : String(v)); },
  reset(k) { db.prepare('DELETE FROM content WHERE key = ?').run(k); },
};

module.exports = { db, Items, Settings, Content, DATA_DIR, UPLOAD_DIR };
