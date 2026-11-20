'use strict';

const crypto = require('crypto');

const COOKIE = 'bz_admin';
const SESSION_MS = 8 * 60 * 60 * 1000; // 8 hours
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = crypto.scryptSync(String(password), salt, expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

const sign = (value) => crypto.createHmac('sha256', SECRET).update(value).digest('base64url');

function createSessionCookie(username) {
  const payload = Buffer.from(JSON.stringify({ u: username, exp: Date.now() + SESSION_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function readSession(req) {
  const raw = (req.headers.cookie || '')
    .split(';').map((c) => c.trim())
    .find((c) => c.startsWith(COOKIE + '='));
  if (!raw) return null;
  const [payload, sig] = decodeURIComponent(raw.slice(COOKIE.length + 1)).split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

function setSession(res, username) {
  res.cookie(COOKIE, createSessionCookie(username), {
    httpOnly: true,
    sameSite: 'strict',
    // Secure-only in production (HTTPS). COOKIE_SECURE=false allows plain-http testing.
    secure: process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE !== 'false'
      : process.env.NODE_ENV === 'production',
    maxAge: SESSION_MS,
    path: '/',
    encode: String, // value is already URL-safe
  });
}

function clearSession(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

function requireAdmin(req, res, next) {
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: 'Not signed in.' });
  req.admin = session.u;
  next();
}

module.exports = { hashPassword, verifyPassword, setSession, clearSession, readSession, requireAdmin };
