'use strict';

require('./env');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD } = require('./db');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT) || 8080;

const app = express();
app.disable('x-powered-by');
// Behind a reverse proxy (Render, Railway, Fly, nginx) so req.ip is the client.
app.set('trust proxy', process.env.TRUST_PROXY === 'false' ? false : 1);

app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Health check for Docker / load balancers.
app.get('/healthz', (req, res) => res.json({ ok: true }));

// ---------- API ----------
app.use('/api', express.json({ limit: '10kb' }));
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// ---------- Pages ----------
const page = (file) => (req, res) => res.sendFile(path.join(ROOT, file));
app.get('/', page('bunzai-burger.html'));
app.get(['/bunzai-run', '/bunzai-run/'], page('bunzai-run.html'));
app.get(['/admin', '/admin/'], (req, res) => {
  res.set('X-Frame-Options', 'DENY');
  res.set('Cache-Control', 'no-store');
  res.sendFile(path.join(ROOT, 'admin.html'));
});

// Phone validation library for the browser (same rules as the server).
const PHONE_LIB = path.join(
  path.dirname(require.resolve('libphonenumber-js/package.json')), 'bundle', 'libphonenumber-max.js');
app.get('/vendor/libphonenumber-max.js', (req, res) => {
  res.set('Cache-Control', 'public, max-age=86400');
  res.sendFile(PHONE_LIB);
});

// ---------- Static files (allowlist only) ----------
// Never serve server/, data/, node_modules/, .git, scripts or package files.
const staticOpts = { maxAge: '1h', dotfiles: 'deny', index: false };
for (const dir of ['assets', 'story-assets', 'animations']) {
  app.use('/' + dir, express.static(path.join(ROOT, dir), staticOpts));
}
const topLevelPages = new Set(fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')));
app.get('/:file', (req, res, next) => {
  if (!topLevelPages.has(req.params.file)) return next();
  res.sendFile(path.join(ROOT, req.params.file));
});

// ---------- 404 / errors ----------
app.use((req, res) => res.status(404).sendFile(path.join(ROOT, '404.html')));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bunzai Burgers server running at http://localhost:${PORT}`);
  console.log(`Spin & Win: http://localhost:${PORT}/bunzai-run   Admin: http://localhost:${PORT}/admin`);
  if (DEFAULT_ADMIN_PASSWORD) {
    console.warn(`[warn] Using the default admin login (${ADMIN_USERNAME} / bunzai-admin). Set ADMIN_PASSWORD before going live.`);
  }
});
