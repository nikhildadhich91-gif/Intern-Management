import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiApp from './api/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const server = express();
const PORT = process.env.PORT || 3000;

// Mount full REST API & Security Suite
server.use(apiApp);

// Serve static assets from public/ and dist/ if built
const publicDir = path.join(__dirname, 'public');
const distDir = path.join(__dirname, 'dist');

if (fs.existsSync(publicDir)) {
  server.use(express.static(publicDir));
}
if (fs.existsSync(distDir)) {
  server.use(express.static(distDir));
  server.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`====================================================================`);
  console.log(`⚡ Qubenix AI — Intern Management System + RAG Copilot + Security Suite`);
  console.log(`🌐 REST API & Production Server running at: http://localhost:${PORT}`);
  console.log(`====================================================================`);
});

