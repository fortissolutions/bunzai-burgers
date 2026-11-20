#!/usr/bin/env node
'use strict';

/*
 * Backup and clear the Spin & Win database.
 *
 *   npm run db:backup                      copy the database to data/backups/
 *   npm run db:clear-members -- --yes      delete all members (claims) and spins, keep offers
 *   npm run db:reset -- --yes              delete everything and restore the 5 default offers
 *
 * A backup is always taken before anything is deleted. Safe to run while the
 * server is running (SQLite handles the locking). In Docker:
 *   docker compose exec app npm run db:clear-members -- --yes
 */
require('./env');
const path = require('path');
const fs = require('fs');
const { db, DATA_DIR, seedOffers } = require('./db');

const [command] = process.argv.slice(2);
const confirmed = process.argv.includes('--yes');

async function backup() {
  const dir = path.join(DATA_DIR, 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `bunzai-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
  await db.backup(file);
  console.log(`Backup saved: ${file}`);
  return file;
}

function counts() {
  return db.prepare(`SELECT (SELECT COUNT(*) FROM offers) AS offers,
                            (SELECT COUNT(*) FROM claims) AS members,
                            (SELECT COUNT(*) FROM spins)  AS spins`).get();
}

function requireConfirmation(what) {
  if (confirmed) return;
  const c = counts();
  console.error(`This will ${what}.`);
  console.error(`Currently: ${c.members} members, ${c.spins} spins, ${c.offers} offers.`);
  console.error('Run the command again with --yes to continue.');
  process.exit(1);
}

async function main() {
  switch (command) {
    case 'backup':
      await backup();
      break;

    case 'clear-members': {
      requireConfirmation('DELETE ALL MEMBERS (name, phone, reward) AND SPINS. Offers are kept');
      await backup();
      const before = counts();
      db.transaction(() => {
        db.prepare('DELETE FROM claims').run();
        db.prepare('DELETE FROM spins').run();
        db.prepare("DELETE FROM sqlite_sequence WHERE name = 'claims'").run();
      })();
      console.log(`Deleted ${before.members} members and ${before.spins} spins. ${before.offers} offers kept.`);
      break;
    }

    case 'reset': {
      requireConfirmation('DELETE EVERYTHING (members, spins and offers) and restore the 5 default offers');
      await backup();
      const before = counts();
      db.transaction(() => {
        db.prepare('DELETE FROM claims').run();
        db.prepare('DELETE FROM spins').run();
        db.prepare('DELETE FROM offers').run();
        db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('claims', 'offers')").run();
        seedOffers();
      })();
      console.log(`Deleted ${before.members} members, ${before.spins} spins and ${before.offers} offers. Default offers restored.`);
      break;
    }

    default:
      console.log('Usage: node server/manage-data.js <backup | clear-members | reset> [--yes]');
      process.exit(command ? 1 : 0);
  }
  // Fold the WAL into the main file so the cleared data is really gone from disk.
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
