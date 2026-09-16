#!/usr/bin/env node
'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 8080;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css' : 'text/css',
  '.js'  : 'application/javascript',
  '.webp': 'image/webp',
  '.png' : 'image/png',
  '.jpg' : 'image/jpeg',
  '.svg' : 'image/svg+xml',
  '.json': 'application/json',
  '.ico' : 'image/x-icon',
  '.woff2': 'font/woff2',
  '.gltf': 'model/gltf+json',
  '.glb' : 'model/gltf-binary',
};

function serveFile(filePath, res) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found: ' + filePath);
    }
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type' : mime,
      'Cache-Control': 'public, max-age=3600',
      'Content-Length': stat.size,
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];

  if (url === '/' || url === '/bunzai-burger.html') {
    return serveFile(path.join(ROOT, 'bunzai-burger.html'), res);
  }

  const filePath = path.join(ROOT, url);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return serveFile(filePath, res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🔥 Bunzai Burgers server running at http://localhost:${PORT}`);
});
