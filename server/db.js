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
  chance      REAL    NOT NULL DEFAULT 0,   -- win probability in % (relative weight)
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

// The five launch offers and their win chances (%), seeded whenever the
// offers table is empty. Chances are editable in the admin dashboard.
const DEFAULT_OFFERS = [
  { name: '10% OFF', chance: 5 },
  { name: '20% OFF', chance: 30 },
  { name: 'FREE FRIES', chance: 25 },
  { name: 'FREE DRINK', chance: 25 },
  { name: 'FREE BURGER', chance: 15 },
];
function seedOffers() {
  if (db.prepare('SELECT COUNT(*) AS n FROM offers').get().n > 0) return;
  const insert = db.prepare('INSERT INTO offers (name, chance, sort_order) VALUES (?, ?, ?)');
  DEFAULT_OFFERS.forEach((o, i) => insert.run(o.name, o.chance, i + 1));
}

// One-time upgrade for databases created before win chances existed:
// add the column, swap the old FREE MEAL offer for FREE FRIES and apply
// the default chances to the offers that match by name.
const hasChance = db.prepare('PRAGMA table_info(offers)').all().some((c) => c.name === 'chance');
if (!hasChance) {
  db.transaction(() => {
    db.exec('ALTER TABLE offers ADD COLUMN chance REAL NOT NULL DEFAULT 0');
    const byName = (n) => db.prepare('SELECT * FROM offers WHERE upper(name) = ?').get(n);
    const meal = byName('FREE MEAL');
    if (meal && !byName('FREE FRIES')) {
      const awarded = db.prepare('SELECT COUNT(*) AS n FROM claims WHERE offer_id = ?').get(meal.id).n;
      if (awarded === 0) {
        db.prepare("UPDATE offers SET name = 'FREE FRIES' WHERE id = ?").run(meal.id);
      } else {
        // Keep the awarded offer for history, but take it off the wheel.
        db.prepare('UPDATE offers SET visible = 0, selectable = 0 WHERE id = ?').run(meal.id);
        db.prepare("INSERT INTO offers (name, sort_order) VALUES ('FREE FRIES', ?)").run(meal.sort_order);
      }
    }
    const setChance = db.prepare('UPDATE offers SET chance = ? WHERE upper(name) = ?');
    for (const o of DEFAULT_OFFERS) setChance.run(o.chance, o.name);
    // Offers with other names were equally likely before: give them an equal
    // share instead of 0%, so no offer silently stops being winnable.
    const defaultNames = DEFAULT_OFFERS.map((o) => o.name);
    db.prepare(`UPDATE offers SET chance = 20 WHERE upper(name) NOT IN (${defaultNames.map(() => '?').join(',')})`)
      .run(...defaultNames);
  })();
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
