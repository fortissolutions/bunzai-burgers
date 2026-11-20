'use strict';

/** Tiny in-memory fixed-window rate limiter, keyed by client IP. */
module.exports = function rateLimit({ windowMs, max }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key);
  }, windowMs).unref();

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', Math.ceil((entry.reset - now) / 1000));
      return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
    }
    next();
  };
};
