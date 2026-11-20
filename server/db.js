'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { hashPassword } = require('./auth');

// Relative DATA_DIR values are resolved from the project root, not the shell's cwd.
const DATA_DIR = path.resolve(__dirname, '..', process.env.DATA_DIR || 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'bunzai.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS offers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  visible     INTEGER NOT NULL DEFAULT 1,
  selectable  INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS spins (
  id          TEXT    PRIMARY KEY,
  offer_id    INTEGER NOT NULL REFERENCES offers(id),
  claimed     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS claims (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  phone        TEXT    NOT NULL UNIQUE,   -- normalized digits, used for uniqueness
  phone_display TEXT   NOT NULL,
  offer_id     INTEGER NOT NULL REFERENCES offers(id),
  offer_name   TEXT    NOT NULL,
  code         TEXT    NOT NULL UNIQUE,
  consent      INTEGER NOT NULL DEFAULT 0,
  spin_id      TEXT    REFERENCES spins(id),
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  redeemed_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_claims_offer ON claims(offer_id);

CREATE TABLE IF NOT EXISTS admins (
  username      TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL
);
`);

// The five launch offers, seeded whenever the offers table is empty.
const DEFAULT_OFFERS = ['10% OFF', '20% OFF', 'FREE BURGER', 'FREE DRINK', 'FREE MEAL'];
function seedOffers() {
  if (db.prepare('SELECT COUNT(*) AS n FROM offers').get().n > 0) return;
  const insert = db.prepare('INSERT INTO offers (name, sort_order) VALUES (?, ?)');
  DEFAULT_OFFERS.forEach((name, i) => insert.run(name, i + 1));
}
seedOffers();

// Seed / refresh the admin account from env on every start, so changing
// ADMIN_PASSWORD and restarting is enough to rotate it.
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'bunzai-admin';
const DEFAULT_ADMIN_PASSWORD = !process.env.ADMIN_PASSWORD;
db.prepare(`INSERT INTO admins (username, password_hash) VALUES (?, ?)
            ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash`)
  .run(ADMIN_USERNAME, hashPassword(ADMIN_PASSWORD));

module.exports = { db, DATA_DIR, seedOffers, ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD };
