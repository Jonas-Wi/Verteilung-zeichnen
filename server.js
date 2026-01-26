const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// DEBUG-Route: zeigt alle Dateien
app.get('/debug', (req, res) => {
  const fs = require('fs');
  const files = fs.readdirSync('.');
  const leiter = fs.existsSync('leiterspiel') ? fs.readdirSync('leiterspiel') : [];
  res.json({ rootFiles: files, leiterspiel: leiter });
});

// Statische Files aus allen Ordnern
app.use(express.static(path.join(__dirname, 'frontend/public')));
app.use(express.static(path.join(__dirname, 'frontend')));
app.use(express.static(path.join(__dirname, 'leiterspiel')));  // ← HIER DEIN LEITERSPIEL!
app.use(express.static('.'));  // Alles andere

// Speziell für Leiterspiel
app.get('/leiterspiel/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'leiterspiel/LEITERSPIELFINAL.html'));
});

// Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/public/index.html') || 
               path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});

