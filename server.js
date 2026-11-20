const express = require('express');
const path = require('path');

const app = express();

app.use((req, res, next) => { console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`); next(); });
const PORT = process.env.PORT || 3000;

// Serve Three.js library from node_modules for browser ES modules
app.use('/three', express.static(path.join(__dirname, 'node_modules/three')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Serve frontend static assets from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Fallback route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`MYROOM server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
