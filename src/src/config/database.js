const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/expense_tracker.db');
const DATA_DIR = path.dirname(DB_PATH);

let _db = null;
let _lastId = null;

function saveDb() {
  if (!_db) return;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function getDb() {
  if (_db) return _db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
  }

  _initSchema();
  return _db;
}

function _initSchema() {
  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      user_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income','expense')),
      amount REAL NOT NULL,
      category_id INTEGER,
      date TEXT NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS invalidated_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT NOT NULL,
      invalidated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Seed default categories once
  const res = _db.exec(`SELECT COUNT(*) FROM categories WHERE is_default = 1`);
  const count = res[0]?.values[0][0];
  if (!count || count === 0) {
    ['Food','Transport','Bills','Health','Shopping','Travel','Leisure','Other'].forEach(name => {
      _db.run(`INSERT INTO categories (name, is_default, user_id) VALUES (?, 1, NULL)`, [name]);
    });
  }

  saveDb();
}

// Run INSERT/UPDATE/DELETE — captures last insert rowid BEFORE saving
function run(sql, params = []) {
  if (!_db) throw new Error('DB not initialized. Call getDb() first.');
  _db.run(sql, params);
  // Capture last insert rowid NOW, before export() resets it
  const ridRes = _db.exec('SELECT last_insert_rowid()');
  _lastId = ridRes[0]?.values[0][0] ?? null;
  saveDb();
}

function get(sql, params = []) {
  if (!_db) throw new Error('DB not initialized.');
  const stmt = _db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if (stmt.step()) {
    row = stmt.getAsObject();
  }
  stmt.free();
  return row;
}

function all(sql, params = []) {
  if (!_db) throw new Error('DB not initialized.');
  const rows = [];
  const stmt = _db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

// Returns the last inserted row ID (from most recent run() call)
function lastInsertRowId() {
  return _lastId;
}

module.exports = { getDb, run, get, all, lastInsertRowId, saveDb };
