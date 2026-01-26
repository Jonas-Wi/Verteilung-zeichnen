const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Statische Files aus Frontend ausliefern
app.use(express.static(path.join(__dirname, 'frontend/dist')));  // Falls du "npm run build" machst
// ODER:
app.use('/leiterspiel', express.static(path.join(__dirname, 'frontend/public/leiterspiel')));

// Catch-all für Frontend-Routen (falls SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
