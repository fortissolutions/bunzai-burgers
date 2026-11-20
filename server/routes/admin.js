'use strict';

const express = require('express');
const { db } = require('../db');
const { verifyPassword, setSession, clearSession, readSession, requireAdmin } = require('../auth');
const { cleanOfferName } = require('../validation');
const rateLimit = require('../rate-limit');

const router = express.Router();

const q = {
  admin: db.prepare('SELECT username, password_hash FROM admins WHERE username = ?'),
  offers: db.prepare(`
    SELECT o.*,
           (SELECT COUNT(*) FROM claims c WHERE c.offer_id = o.id) AS claims_count
    FROM offers o ORDER BY o.sort_order, o.id`),
  offer: db.prepare('SELECT * FROM offers WHERE id = ?'),
  maxOrder: db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM offers'),
  insertOffer: db.prepare('INSERT INTO offers (name, visible, selectable, sort_order) VALUES (?, ?, ?, ?)'),
  updateOffer: db.prepare(`UPDATE offers SET name = @name, visible = @visible, selectable = @selectable,
                           sort_order = @sort_order, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = @id`),
  deleteOffer: db.prepare('DELETE FROM offers WHERE id = ?'),
  deleteOfferSpins: db.prepare('DELETE FROM spins WHERE offer_id = ?'),
  offerClaimCount: db.prepare('SELECT COUNT(*) AS n FROM claims WHERE offer_id = ?'),
  claim: db.prepare('SELECT * FROM claims WHERE id = ?'),
  redeem: db.prepare(`UPDATE claims SET redeemed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND redeemed_at IS NULL`),
  unredeem: db.prepare('UPDATE claims SET redeemed_at = NULL WHERE id = ?'),
};

// ---------- Auth ----------
router.post('/login', rateLimit({ windowMs: 15 * 60_000, max: 20 }), (req, res) => {
  const { username, password } = req.body || {};
  const admin = q.admin.get(String(username || ''));
  if (!admin || !verifyPassword(password || '', admin.password_hash)) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }
  setSession(res, admin.username);
  res.json({ username: admin.username });
});

router.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: 'Not signed in.' });
  res.json({ username: session.u });
});

router.use(requireAdmin);
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

// ---------- Offers ----------
const offerOut = (o) => ({
  id: o.id, name: o.name, visible: !!o.visible, selectable: !!o.selectable,
  sortOrder: o.sort_order, claimsCount: o.claims_count ?? 0, updatedAt: o.updated_at,
});

router.get('/offers', (req, res) => res.json({ offers: q.offers.all().map(offerOut) }));

router.post('/offers', (req, res) => {
  const name = cleanOfferName(req.body && req.body.name);
  if (!name) return res.status(400).json({ error: 'Offer name must be 1–24 characters.' });
  const visible = req.body.visible !== false;
  const selectable = visible && req.body.selectable !== false;
  const info = q.insertOffer.run(name, visible ? 1 : 0, selectable ? 1 : 0, q.maxOrder.get().m + 1);
  res.status(201).json({ offer: offerOut(q.offer.get(info.lastInsertRowid)) });
});

router.patch('/offers/:id', (req, res) => {
  const current = q.offer.get(Number(req.params.id));
  if (!current) return res.status(404).json({ error: 'Offer not found.' });
  const body = req.body || {};
  let name = current.name;
  if (body.name !== undefined) {
    name = cleanOfferName(body.name);
    if (!name) return res.status(400).json({ error: 'Offer name must be 1–24 characters.' });
  }
  const visible = body.visible !== undefined ? !!body.visible : !!current.visible;
  // An offer can only be won if it is on the wheel.
  const selectable = visible && (body.selectable !== undefined ? !!body.selectable : !!current.selectable);
  const sortOrder = Number.isInteger(body.sortOrder) ? body.sortOrder : current.sort_order;
  q.updateOffer.run({ id: current.id, name, visible: visible ? 1 : 0, selectable: selectable ? 1 : 0, sort_order: sortOrder });
  res.json({ offer: offerOut(q.offer.get(current.id)) });
});

// Swap order with the neighbour above/below.
router.post('/offers/:id/move', (req, res) => {
  const dir = req.body && req.body.direction === 'up' ? -1 : 1;
  const list = q.offers.all();
  const idx = list.findIndex((o) => o.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Offer not found.' });
  const swap = list[idx + dir];
  if (swap) {
    db.transaction(() => {
      // Re-number everything so orders are unique, then swap the pair.
      list.forEach((o, i) => { o.sort_order = i + 1; });
      [list[idx].sort_order, swap.sort_order] = [swap.sort_order, list[idx].sort_order];
      for (const o of list) {
        q.updateOffer.run({ id: o.id, name: o.name, visible: o.visible, selectable: o.selectable, sort_order: o.sort_order });
      }
    })();
  }
  res.json({ offers: q.offers.all().map(offerOut) });
});

router.delete('/offers/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!q.offer.get(id)) return res.status(404).json({ error: 'Offer not found.' });
  if (q.offerClaimCount.get(id).n > 0) {
    return res.status(409).json({ error: 'This offer has already been awarded, so it can’t be deleted. Hide it from the wheel instead.' });
  }
  db.transaction(() => { q.deleteOfferSpins.run(id); q.deleteOffer.run(id); })();
  res.json({ ok: true });
});

// ---------- Members (claims) ----------
const claimOut = (c) => ({
  id: c.id, name: c.name, phone: c.phone_display, offerId: c.offer_id, offerName: c.offer_name,
  code: c.code, consent: !!c.consent, createdAt: c.created_at, redeemedAt: c.redeemed_at,
});

function findClaims({ search = '', status = 'all' }) {
  const where = [];
  const params = {};
  const term = String(search).trim();
  if (term) {
    where.push('(name LIKE @like OR phone LIKE @digits OR phone_display LIKE @like OR code LIKE @like)');
    params.like = `%${term}%`;
    // Stored phones are 9715XXXXXXXX: drop a local leading 0 so "050 123…" matches.
    const digits = term.replace(/\D/g, '').replace(/^0+/, '');
    params.digits = `%${digits || term}%`;
  }
  if (status === 'redeemed') where.push('redeemed_at IS NOT NULL');
  if (status === 'pending') where.push('redeemed_at IS NULL');
  const sql = `SELECT * FROM claims ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC, id DESC`;
  return db.prepare(sql).all(params);
}

router.get('/claims', (req, res) => {
  res.json({ claims: findClaims({ search: req.query.q, status: req.query.status }).map(claimOut) });
});

router.get('/claims.csv', (req, res) => {
  const rows = findClaims({ search: req.query.q, status: req.query.status });
  const cell = (v) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // avoid spreadsheet formula injection
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [['Name', 'Phone', 'Offer', 'Code', 'Claimed at', 'Redeemed at'].map(cell).join(',')];
  for (const r of rows) lines.push([r.name, r.phone_display, r.offer_name, r.code, r.created_at, r.redeemed_at].map(cell).join(','));
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="bunzai-spin-claims-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('﻿' + lines.join('\r\n'));
});

router.post('/claims/:id/redeem', (req, res) => {
  const id = Number(req.params.id);
  if (!q.claim.get(id)) return res.status(404).json({ error: 'Member not found.' });
  q.redeem.run(id);
  res.json({ claim: claimOut(q.claim.get(id)) });
});

router.delete('/claims/:id/redeem', (req, res) => {
  const id = Number(req.params.id);
  if (!q.claim.get(id)) return res.status(404).json({ error: 'Member not found.' });
  q.unredeem.run(id);
  res.json({ claim: claimOut(q.claim.get(id)) });
});

// ---------- Statistics ----------
router.get('/stats', (req, res) => {
  const totals = db.prepare(`
    SELECT (SELECT COUNT(*) FROM spins) AS spins,
           (SELECT COUNT(*) FROM claims) AS claims,
           (SELECT COUNT(*) FROM claims WHERE redeemed_at IS NOT NULL) AS redeemed`).get();
  const byOffer = db.prepare(`
    SELECT o.id, o.name, o.visible, o.selectable,
           (SELECT COUNT(*) FROM spins s WHERE s.offer_id = o.id) AS spins,
           COUNT(c.id) AS awarded,
           SUM(CASE WHEN c.redeemed_at IS NOT NULL THEN 1 ELSE 0 END) AS redeemed
    FROM offers o LEFT JOIN claims c ON c.offer_id = o.id
    GROUP BY o.id ORDER BY o.sort_order, o.id`).all();
  const daily = db.prepare(`
    SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS claims,
           SUM(CASE WHEN redeemed_at IS NOT NULL THEN 1 ELSE 0 END) AS redeemed
    FROM claims WHERE created_at >= strftime('%Y-%m-%dT00:00:00Z', 'now', '-13 days')
    GROUP BY day ORDER BY day`).all();
  res.json({
    totals: { ...totals, pending: totals.claims - totals.redeemed },
    byOffer: byOffer.map((o) => ({ id: o.id, name: o.name, visible: !!o.visible, selectable: !!o.selectable, spins: o.spins, awarded: o.awarded, redeemed: o.redeemed || 0 })),
    daily,
  });
});

module.exports = router;
