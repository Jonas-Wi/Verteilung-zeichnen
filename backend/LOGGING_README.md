# Spielerdaten-Logging System

Dieses System speichert automatisch alle Spielerantworten und Evaluierungsergebnisse in einer Excel-Datei.

## 📊 Wie funktioniert es?

Das System loggt automatisch im Hintergrund folgende Daten:

### 1. Session-Start (Sheet: "Sessions")
- Zeitstempel
- Session-ID
- Welt & Stufe
- Verteilungstyp
- Anzahl der Samples

### 2. Spielerantworten (Sheet: "Antworten")
- Zeitstempel
- Session-ID
- Welt & Stufe
- Alle Antworten des Spielers
- Score und Punkte
- Detaillierte Ergebnisse pro Frage

### 3. Zeichnungs-Evaluierungen (Sheet: "Zeichnungen")
- Zeitstempel
- Session-ID
- Welt & Stufe
- Gezeichnetes Histogram
- MAE, MSE, Wasserstein-Distanz
- Score-Komponenten

## 📁 Wo werden die Daten gespeichert?

Die Daten werden automatisch in folgendem Verzeichnis gespeichert:

```
backend/spieler_daten/spieler_antworten.xlsx
```

Die Excel-Datei enthält drei separate Sheets:
- **Sessions**: Übersicht aller gestarteten Sessions
- **Antworten**: Alle Frageantworten und ihre Bewertungen
- **Zeichnungen**: Histogram-Zeichnungen und deren Evaluierung

## 🚀 Installation

Die benötigten Packages sind bereits in `requirements.txt` enthalten:

```bash
cd backend
pip install -r requirements.txt
```

Die Installation umfasst:
- `pandas`: Für Datenverarbeitung
- `openpyxl`: Für Excel-Export

## 💡 Verwendung

Das System funktioniert vollautomatisch! Sobald das Backend läuft, werden alle Daten gespeichert.

**Keine zusätzliche Konfiguration nötig!**

## 📈 Datenauswertung

Die Excel-Datei kann direkt in Excel, Google Sheets oder mit Python (pandas) geöffnet und analysiert werden:

```python
import pandas as pd

# Sessions laden
sessions = pd.read_excel('backend/spieler_daten/spieler_antworten.xlsx', sheet_name='Sessions')
print(sessions.head())

# Antworten laden
antworten = pd.read_excel('backend/spieler_daten/spieler_antworten.xlsx', sheet_name='Antworten')
print(antworten.head())

# Zeichnungen laden
zeichnungen = pd.read_excel('backend/spieler_daten/spieler_antworten.xlsx', sheet_name='Zeichnungen')
print(zeichnungen.head())

# Durchschnittlichen Score berechnen
avg_score = antworten['score'].mean()
print(f"Durchschnittlicher Score: {avg_score}%")
```

## 🔍 Beispiel-Analysen

### Durchschnittliche Performance pro Level:
```python
import pandas as pd

antworten = pd.read_excel('backend/spieler_daten/spieler_antworten.xlsx', sheet_name='Antworten')

# Gruppiere nach Welt und Stufe
performance = antworten.groupby(['welt', 'stufe'])['score'].agg(['mean', 'count'])
print(performance)
```

### Häufigste Fehler identifizieren:
```python
import pandas as pd
import json

antworten = pd.read_excel('backend/spieler_daten/spieler_antworten.xlsx', sheet_name='Antworten')

# Detaillierte Ergebnisse parsen
for idx, row in antworten.iterrows():
    if pd.notna(row['detailed_results']):
        results = json.loads(row['detailed_results'])
        for r in results:
            if not r.get('is_correct', True):
                print(f"Session {row['session_id']}: Falsch beantwortet: {r.get('frage')}")
```

## 🛠️ Fehlerbehebung

Falls die Excel-Datei nicht erstellt werden kann (z.B. bei fehlenden Berechtigungen), erstellt das System automatisch CSV-Fallback-Dateien mit Zeitstempel.

## 📝 Datenschutz

- Die Daten werden nur lokal auf dem Server gespeichert
- Es werden keine personenbezogenen Daten gesammelt
- Session-IDs sind zufällig generierte UUIDs
- Die Datei kann jederzeit gelöscht werden

## ⚙️ Anpassungen

Die Logging-Konfiguration kann in `backend/data_logger.py` angepasst werden:

```python
# Ausgabeverzeichnis ändern
logger = DataLogger(output_dir="mein_verzeichnis")

# Zugriff auf den globalen Logger
from data_logger import get_data_logger
logger = get_data_logger()
```
