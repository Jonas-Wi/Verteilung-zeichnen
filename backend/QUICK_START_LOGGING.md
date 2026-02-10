# Quick Start: Spielerdaten-Logging aktivieren

## 1. Packages installieren

Öffne ein Terminal im Backend-Verzeichnis und führe aus:

```powershell
cd backend
pip install pandas openpyxl
```

Oder installiere alle Requirements auf einmal:

```powershell
pip install -r requirements.txt
```

## 2. Backend starten

```powershell
python -m uvicorn main:app --reload --host 127.0.0.1 --port 3000
```

## 3. Spielen!

Das wars! Ab jetzt werden automatisch alle Spielerdaten gespeichert.

## 4. Daten anschauen

Die Excel-Datei findest du hier:
```
backend/spieler_daten/spieler_antworten.xlsx
```

Öffne sie mit Excel, Google Sheets oder einem anderen Programm.

## Was wird gespeichert?

✅ Jede gestartete Session (mit Level-Info)
✅ Alle Antworten der Spieler
✅ Evaluierungsergebnisse und Scores
✅ Gezeichnete Histogramme
✅ Zeitstempel für jede Aktion

## Hinweise

- Die Datei wird automatisch im Hintergrund erstellt und aktualisiert
- Du musst nichts manuell speichern
- Die Daten bleiben auch nach Neustart des Servers erhalten
- Pro Sheet (Sessions, Antworten, Zeichnungen) gibt es eine separate Tabelle

Mehr Details siehe: [LOGGING_README.md](LOGGING_README.md)
