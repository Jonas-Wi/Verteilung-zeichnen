"""
Exportiert die Excel-Daten in separate CSV-Dateien
CSV ist einfacher zu öffnen und zu bearbeiten
"""

import pandas as pd
from pathlib import Path
from datetime import datetime

# Pfad zur Excel-Datei
excel_file = Path("spieler_daten/spieler_antworten.xlsx")
output_dir = Path("spieler_daten/csv_export")

if not excel_file.exists():
    print("❌ Keine Excel-Datei gefunden!")
    print(f"   Erwartete Datei: {excel_file.absolute()}")
    exit()

# Ausgabeverzeichnis erstellen
output_dir.mkdir(exist_ok=True, parents=True)

# Zeitstempel für den Export
timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

print("=" * 60)
print("📤 CSV-EXPORT")
print("=" * 60)

# Alle Sheets exportieren
sheets_exported = 0
try:
    xls = pd.ExcelFile(excel_file)
    
    for sheet_name in xls.sheet_names:
        try:
            df = pd.read_excel(xls, sheet_name=sheet_name)
            
            # CSV-Dateiname
            csv_file = output_dir / f"{sheet_name}_{timestamp}.csv"
            
            # In CSV speichern (UTF-8 mit BOM für Excel-Kompatibilität)
            df.to_csv(csv_file, index=False, encoding='utf-8-sig', sep=';')
            
            print(f"✅ {sheet_name}: {len(df)} Zeilen → {csv_file.name}")
            sheets_exported += 1
            
        except Exception as e:
            print(f"❌ Fehler bei Sheet '{sheet_name}': {e}")
    
    print("\n" + "=" * 60)
    print(f"✅ {sheets_exported} Sheets erfolgreich exportiert!")
    print(f"📁 Ausgabeverzeichnis: {output_dir.absolute()}")
    print("=" * 60)
    
    print("\n💡 Tipp: CSV-Dateien können mit Excel, Google Sheets oder")
    print("   jedem Texteditor geöffnet werden.")
    
except Exception as e:
    print(f"❌ Fehler beim Export: {e}")
