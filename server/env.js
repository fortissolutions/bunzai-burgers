'use strict';

// Load settings from the project's .env file (if present) before anything
// reads process.env. Variables already set in the real environment (Docker,
// AWS, the shell) take priority over the file.
const path = require('path');

try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}
