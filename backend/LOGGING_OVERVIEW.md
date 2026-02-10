# 📊 Spielerdaten-Logging System - Übersicht

## Neue Dateien im Backend-Verzeichnis:

### 🔧 Hauptkomponenten

1. **`data_logger.py`**
   - Kernmodul für das Logging-System
   - Speichert automatisch alle Spielerdaten in Excel
   - Enthält die `DataLogger`-Klasse

2. **`requirements.txt`** (aktualisiert)
   - Neue Dependencies: `pandas` und `openpyxl`

### 📚 Dokumentation

3. **`LOGGING_README.md`**
   - Ausführliche Dokumentation des Systems
   - Erklärung der Datenstruktur
   - Beispiele für Datenanalyse

4. **`QUICK_START_LOGGING.md`**
   - Schnellstart-Anleitung
   - Installation in 4 Schritten
   - Übersicht was gespeichert wird

### 🛠️ Analyse-Tools

5. **`analyse_daten.py`**
   - Python-Skript zur schnellen Datenanalyse
   - Zeigt Statistiken und Übersichten
   - Aufruf: `python analyse_daten.py`

6. **`export_to_csv.py`**
   - Exportiert Excel-Daten als CSV
   - Einfacher für weitere Analysen
   - Aufruf: `python export_to_csv.py`

### 📁 Datenverzeichnis (wird automatisch erstellt)

7. **`spieler_daten/`**
   - Wird beim ersten Start automatisch erstellt
   - Enthält `spieler_antworten.xlsx`
   - Optional: `csv_export/` für CSV-Exporte

## 🚀 Schnellstart

```powershell
# 1. Packages installieren
pip install pandas openpyxl

# 2. Backend starten
python -m uvicorn main:app --reload --host 127.0.0.1 --port 3000

# 3. Spielen und Daten sammeln!

# 4. Daten analysieren
python analyse_daten.py

# 5. Optional: Als CSV exportieren
python export_to_csv.py
```

## 📊 Datenstruktur der Excel-Datei

Die Excel-Datei enthält 3 Sheets:

### Sheet: "Sessions"
- Zeitstempel
- Session-ID
- Welt & Stufe
- Verteilungstyp
- Anzahl Samples

### Sheet: "Antworten"
- Zeitstempel
- Session-ID
- Welt & Stufe
- Alle Antworten (antwort_1, antwort_2, ...)
- Score, correct_count, total_questions
- Detaillierte Ergebnisse (JSON)

### Sheet: "Zeichnungen"
- Zeitstempel
- Session-ID
- Welt & Stufe
- Player Histogram (JSON)
- MAE, MSE, Wasserstein
- Score-Komponenten

## 🎯 Was wurde im Backend geändert?

In `main.py` wurden folgende Logging-Aufrufe hinzugefügt:

1. **Session-Start**: Loggt jede neue Session
2. **W1S1 Evaluation**: Loggt Multiple-Choice-Antworten (Level 1)
3. **W1S2 Evaluation**: Loggt Freitext-Antworten (Level 2)
4. **W1S3 Evaluation**: Loggt Vergleichs-Antworten (Level 3)
5. **W1S4 Evaluation**: Loggt erweiterte Fragen (Level 4)
6. **W1S5 Evaluation**: Loggt Histogram-Zeichnungen (Level 5)

## 🔍 Beispiel-Analysen

### Python:
```python
import pandas as pd

# Daten laden
antworten = pd.read_excel('spieler_daten/spieler_antworten.xlsx', sheet_name='Antworten')

# Durchschnittlicher Score
print(antworten['score'].mean())

# Performance pro Level
print(antworten.groupby(['welt', 'stufe'])['score'].mean())
```

### Excel:
1. Datei öffnen: `spieler_daten/spieler_antworten.xlsx`
2. Pivot-Tabellen erstellen
3. Diagramme zeichnen
4. Filter anwenden

## ⚠️ Wichtige Hinweise

- Das System funktioniert **vollautomatisch** im Hintergrund
- Es werden **keine personenbezogenen Daten** gespeichert
- Die Daten sind **nur lokal** verfügbar
- Bei Fehlern wird ein **CSV-Fallback** erstellt
- Die Excel-Datei wird **kontinuierlich erweitert**

## 📞 Support

Bei Fragen oder Problemen:
1. Siehe `LOGGING_README.md` für Details
2. Prüfe ob `pandas` und `openpyxl` installiert sind
3. Prüfe ob das Verzeichnis `spieler_daten/` schreibbar ist
