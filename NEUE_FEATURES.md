# Neue Features - Zahlenverteilungsspiel & Zeiten-Anpassung

## ✅ Änderungen

### 1. **Spielzeit von 30 auf 5 Sekunden reduziert** ⏱️
- Timer in `PhraserGame.jsx` von 30 auf **5 Sekunden** geändert
- Schnelleres, intensiveres Spielerlebnis

### 2. **Neuer Spielmodus: Zahlenverteilung (0-20)** 🔢

#### Backend-Erweiterungen:
- **`backend/zahlenverteilung.py`** - Neue Verteilungsklasse für Zahlenwerte
  - Generiert konkrete Zahlen (0-20) statt Prozent-/Farbwerte
  - 6 Verteilungstypen: `normal`, `uniform`, `bimodal`, `exponential`, `left_skewed`, `right_skewed`
  
- **`backend/zahlen_evaluator.py`** - Spezialisierter Evaluator
  - Metriken: `exact_match_rate`, `mae`, `rmse`, `distribution_similarity`
  - Score-Berechnung (0-100) mit Schwellwert 85 für "bestanden"
  
- **`backend/main.py`** - API-Erweiterungen
  - `game_mode` Parameter in allen Endpoints (`"color"` oder `"number"`)
  - Automatische Evaluator-Auswahl basierend auf Modus

#### Frontend-Erweiterungen:
- **`frontend/src/App.jsx`** - Modus-Auswahl beim Start
  - Zwei Buttons: "Farbspiel" (Original) oder "Zahlenspiel" (Neu)
  - Anzeige des aktiven Modus während des Spiels
  
- **`frontend/src/PhraserGame.jsx`** - Angepasste Darstellung
  - **Zahlenmodus**: Ballons zeigen Zahlen (0-20) in goldener Farbe
  - **Farbmodus**: Original-Grauton-Darstellung
  - Vorab-Fragen nur im Farbmodus
  
- **`frontend/src/DistributionVisualizer.js`** - Achsenbeschriftung
  - Zahlenmodus: X-Achse "0-20" (keine Farbskala)
  - Farbmodus: X-Achse "Weiß-Schwarz" mit Farbverlauf

## 🎮 Verwendung

### API-Beispiele:

```javascript
// Zahlenspiel starten
POST http://localhost:3000/start-session
{
  "distribution_type": "normal",
  "game_mode": "number"  // ← NEU!
}

// Response:
{
  "session_id": "...",
  "distribution": [5, 12, 8, 10, 15, ...],  // 50 Zahlen von 0-20
  "game_mode": "number"
}

// Verfügbare Verteilungen abfragen
GET http://localhost:3000/available-distributions?game_mode=number

// Spieler-Verteilung einreichen (automatische Evaluierung nach Modus)
POST http://localhost:3000/submit-player-distribution
{
  "session_id": "...",
  "samples": [...]
}
```

### Frontend-Nutzung:

1. **Spiel starten** → Modus wählen (Farbe oder Zahlen)
2. **5 Sekunden** Blöcke abschießen und Ballons beobachten
3. **Verteilung zeichnen** basierend auf beobachteten Werten
4. **Evaluierung** mit spezialisierten Metriken

## 📊 Unterschiede der Modi

| Feature | Farbmodus (Original) | Zahlenmodus (Neu) |
|---------|---------------------|-------------------|
| Werte | 0-100 (Grautöne) | 0-20 (Zahlen) |
| Balloon-Farbe | Graustufen | Gold/Gelb |
| Anzeige auf Balloon | Optional | Immer |
| Vorab-Fragen | Ja (Farbe, Prozent) | Nein |
| X-Achse | Weiß-Schwarz | 0-20 |
| Evaluator | DistributionEvaluator | ZahlenEvaluator |
| Score-Schwelle | 90% | 85% |

## 🚀 Start

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 3000

# Frontend
cd frontend
npm install
npm run dev
```

## 📝 Dateien geändert/erstellt

### Neu erstellt:
- `backend/zahlenverteilung.py`
- `backend/zahlen_evaluator.py`
- `NEUE_FEATURES.md` (diese Datei)

### Geändert:
- `backend/main.py` - game_mode Support
- `frontend/src/App.jsx` - Modus-Auswahl
- `frontend/src/PhraserGame.jsx` - Timer (5s), Zahlen-Darstellung
- `frontend/src/DistributionVisualizer.js` - Achsen-Beschriftung

---
Erstellt: 5. Januar 2026
