'use strict';

const crypto = require('crypto');
// "max" metadata is needed to tell mobile numbers apart from landlines.
const { parsePhoneNumberFromString } = require('libphonenumber-js/max');

/** Returns a cleaned name, or null if invalid. */
function cleanName(value) {
  const v = String(value || '').trim().replace(/\s+/g, ' ');
  if (v.length < 2 || v.length > 60) return null;
  return /^[\p{L}][\p{L}\p{M}' .-]*$/u.test(v) ? v : null;
}

/**
 * Validates a UAE mobile number with libphonenumber-js (the same rules run in
 * the browser). Accepts "050 123 4567", "+971 50 123 4567", "00971501234567".
 *
 * Returns { key, display } when valid, or { error } when not.
 * `key` is what uniqueness is enforced on: E.164 digits without "+"
 * (e.g. 971501234567), so every format of the same number matches.
 */
function checkUaeMobile(value) {
  const raw = String(value || '').trim();
  if (!raw) return { error: 'Please enter your mobile number.' };
  if (!/^[+\d\s()-]+$/.test(raw)) return { error: 'Use digits only, e.g. 050 123 4567.' };
  const phone = parsePhoneNumberFromString(raw, 'AE');
  if (!phone || phone.country !== 'AE') return { error: 'Please enter a UAE mobile number (+971).' };
  if (!phone.isValid()) return { error: 'This UAE number doesn’t look right. Check the digits, e.g. 050 123 4567.' };
  const type = phone.getType();
  if (type !== 'MOBILE' && type !== 'FIXED_LINE_OR_MOBILE') return { error: 'Please enter a UAE mobile number, not a landline.' };
  return { key: phone.number.slice(1), display: phone.formatInternational() };
}

/** Returns { key, display } for a valid UAE mobile number, or null. */
function normalizePhone(value) {
  const result = checkUaeMobile(value);
  return result.error ? null : result;
}

function cleanOfferName(value) {
  const v = String(value || '').trim().replace(/\s+/g, ' ');
  return v.length >= 1 && v.length <= 24 ? v : null;
}

function makeRewardCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  return 'BZ-' + Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

module.exports = { cleanName, checkUaeMobile, normalizePhone, cleanOfferName, makeRewardCode };
