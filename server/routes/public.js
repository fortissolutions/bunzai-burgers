'use strict';

const crypto = require('crypto');
const express = require('express');
const { db } = require('../db');
const { cleanName, checkUaeMobile, makeRewardCode } = require('../validation');
const rateLimit = require('../rate-limit');

const router = express.Router();

const q = {
  visibleOffers: db.prepare('SELECT id, name, selectable FROM offers WHERE visible = 1 ORDER BY sort_order, id'),
  selectableOffers: db.prepare('SELECT id, name FROM offers WHERE visible = 1 AND selectable = 1 ORDER BY sort_order, id'),
  insertSpin: db.prepare('INSERT INTO spins (id, offer_id) VALUES (?, ?)'),
  getSpin: db.prepare('SELECT s.id, s.offer_id, s.claimed, o.name AS offer_name FROM spins s JOIN offers o ON o.id = s.offer_id WHERE s.id = ?'),
  markSpinClaimed: db.prepare('UPDATE spins SET claimed = 1 WHERE id = ? AND claimed = 0'),
  claimByPhone: db.prepare('SELECT * FROM claims WHERE phone = ?'),
  claimByCode: db.prepare('SELECT * FROM claims WHERE code = ?'),
  insertClaim: db.prepare(`INSERT INTO claims (name, phone, phone_display, offer_id, offer_name, code, consent, spin_id)
                           VALUES (@name, @phone, @phone_display, @offer_id, @offer_name, @code, 1, @spin_id)`),
};

/** Shape sent to the customer page. */
function publicClaim(row) {
  return {
    code: row.code,
    name: row.name,
    phone: row.phone_display,
    offerName: row.offer_name,
    createdAt: row.created_at,
    redeemedAt: row.redeemed_at,
  };
}

// Wheel segments: every visible offer, in admin order.
router.get('/offers', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ offers: q.visibleOffers.all().map(({ id, name }) => ({ id, name })) });
});

// The server decides the result; the page only animates to it.
router.post('/spin', rateLimit({ windowMs: 60_000, max: 20 }), (req, res) => {
  const pool = q.selectableOffers.all();
  if (pool.length === 0) return res.status(409).json({ error: 'No offers are available right now. Please check back soon.' });
  const offer = pool[crypto.randomInt(pool.length)];
  const spinId = crypto.randomBytes(16).toString('hex');
  q.insertSpin.run(spinId, offer.id);
  res.json({ spinId, offerId: offer.id, offerName: offer.name });
});

const createClaim = db.transaction(({ spin, name, phone }) => {
  if (q.markSpinClaimed.run(spin.id).changes !== 1) return { error: 'used' };
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeRewardCode();
    try {
      q.insertClaim.run({ name, phone: phone.key, phone_display: phone.display, offer_id: spin.offer_id, offer_name: spin.offer_name, code, spin_id: spin.id });
      return { row: q.claimByCode.get(code) };
    } catch (err) {
      if (!/UNIQUE constraint failed: claims\.code/.test(err.message)) throw err;
    }
  }
  throw new Error('Could not generate a unique reward code');
});

router.post('/claims', rateLimit({ windowMs: 60_000, max: 10 }), (req, res) => {
  const { spinId, consent } = req.body || {};
  const name = cleanName(req.body && req.body.name);
  const phoneCheck = checkUaeMobile(req.body && req.body.phone);
  const phone = phoneCheck.error ? null : phoneCheck;
  const errors = {};
  if (!name) errors.name = 'Please enter a valid name (2–60 letters).';
  if (!phone) errors.phone = phoneCheck.error;
  if (consent !== true) errors.consent = 'Please accept the consent to claim your reward.';
  if (Object.keys(errors).length) return res.status(400).json({ error: 'Please check your details.', errors });

  // One reward per phone number: return the reward they already have.
  const existing = q.claimByPhone.get(phone.key);
  if (existing) return res.status(409).json({ alreadyClaimed: true, claim: publicClaim(existing) });

  const spin = typeof spinId === 'string' ? q.getSpin.get(spinId) : null;
  if (!spin) return res.status(400).json({ error: 'Your spin could not be found. Please refresh and spin again.' });
  if (spin.claimed) return res.status(409).json({ error: 'This spin has already been claimed.' });

  try {
    const result = createClaim({ spin, name, phone });
    if (result.error) return res.status(409).json({ error: 'This spin has already been claimed.' });
    res.status(201).json({ claim: publicClaim(result.row) });
  } catch (err) {
    // Lost a race with another request using the same phone number.
    if (/UNIQUE constraint failed: claims\.phone/.test(err.message)) {
      return res.status(409).json({ alreadyClaimed: true, claim: publicClaim(q.claimByPhone.get(phone.key)) });
    }
    throw err;
  }
});

// Status lookup used by the page to show "redeemed" once staff mark it.
router.get('/claims/:code', rateLimit({ windowMs: 60_000, max: 60 }), (req, res) => {
  res.set('Cache-Control', 'no-store');
  const row = q.claimByCode.get(String(req.params.code).toUpperCase());
  if (!row) return res.status(404).json({ error: 'Reward not found.' });
  res.json({ claim: publicClaim(row) });
});

module.exports = router;
module.exports.publicClaim = publicClaim;
