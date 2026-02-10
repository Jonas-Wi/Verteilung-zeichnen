"""
Einfaches Analyse-Skript für Spielerdaten
Zeigt eine Übersicht über die gesammelten Daten
"""

import pandas as pd
from pathlib import Path

# Pfad zur Excel-Datei
excel_file = Path("spieler_daten/spieler_antworten.xlsx")

if not excel_file.exists():
    print("❌ Keine Daten vorhanden!")
    print(f"   Erwartete Datei: {excel_file.absolute()}")
    print("\n💡 Tipp: Spiele mindestens ein Level, damit Daten gespeichert werden.")
    exit()

print("=" * 60)
print("📊 SPIELERDATEN-ANALYSE")
print("=" * 60)

# Sessions laden
try:
    sessions = pd.read_excel(excel_file, sheet_name='Sessions')
    print(f"\n✅ {len(sessions)} Sessions gefunden")
    print("\nSessions nach Level:")
    if 'welt' in sessions.columns and 'stufe' in sessions.columns:
        level_counts = sessions.groupby(['welt', 'stufe']).size()
        print(level_counts)
except Exception as e:
    print(f"⚠️ Keine Sessions gefunden: {e}")

# Antworten laden
try:
    antworten = pd.read_excel(excel_file, sheet_name='Antworten')
    print(f"\n✅ {len(antworten)} Antwort-Sets gefunden")
    
    if 'score' in antworten.columns:
        # Score-Statistiken
        valid_scores = antworten[antworten['score'] != 'N/A']['score']
        if len(valid_scores) > 0:
            print("\n📈 Score-Statistiken:")
            print(f"   Durchschnitt: {valid_scores.mean():.1f}%")
            print(f"   Minimum:      {valid_scores.min():.1f}%")
            print(f"   Maximum:      {valid_scores.max():.1f}%")
            print(f"   Median:       {valid_scores.median():.1f}%")
        
        # Performance pro Level
        if 'welt' in antworten.columns and 'stufe' in antworten.columns:
            print("\n📊 Durchschnittliche Performance pro Level:")
            performance = antworten[antworten['score'] != 'N/A'].groupby(['welt', 'stufe'])['score'].agg(['mean', 'count'])
            performance.columns = ['Durchschnitt (%)', 'Anzahl']
            print(performance)
    
    # Häufig falsche Antworten
    if 'correct_count' in antworten.columns and 'total_questions' in antworten.columns:
        print("\n❌ Fehlerrate:")
        valid = antworten[(antworten['correct_count'] != 'N/A') & (antworten['total_questions'] != 'N/A')]
        if len(valid) > 0:
            total_questions = valid['total_questions'].sum()
            total_correct = valid['correct_count'].sum()
            total_wrong = total_questions - total_correct
            error_rate = (total_wrong / total_questions * 100) if total_questions > 0 else 0
            print(f"   Richtig:  {total_correct}/{total_questions}")
            print(f"   Falsch:   {total_wrong}/{total_questions}")
            print(f"   Fehlerrate: {error_rate:.1f}%")

except Exception as e:
    print(f"⚠️ Keine Antworten gefunden: {e}")

# Zeichnungen laden
try:
    zeichnungen = pd.read_excel(excel_file, sheet_name='Zeichnungen')
    print(f"\n✅ {len(zeichnungen)} Zeichnungen gefunden")
    
    if 'score' in zeichnungen.columns:
        valid_scores = zeichnungen[zeichnungen['score'] != 'N/A']['score']
        if len(valid_scores) > 0:
            print("\n🎨 Zeichnungs-Scores:")
            print(f"   Durchschnitt: {valid_scores.mean():.1f}%")
            print(f"   Minimum:      {valid_scores.min():.1f}%")
            print(f"   Maximum:      {valid_scores.max():.1f}%")
    
    # MAE-Statistiken
    if 'mae' in zeichnungen.columns:
        valid_mae = zeichnungen[zeichnungen['mae'] != 'N/A']['mae']
        if len(valid_mae) > 0:
            print("\n📏 MAE (Mean Absolute Error):")
            print(f"   Durchschnitt: {valid_mae.mean():.4f}")
            print(f"   Minimum:      {valid_mae.min():.4f}")
            print(f"   Maximum:      {valid_mae.max():.4f}")

except Exception as e:
    print(f"⚠️ Keine Zeichnungen gefunden: {e}")

print("\n" + "=" * 60)
print("✅ Analyse abgeschlossen!")
print("=" * 60)

# Export-Option
print("\n💾 Möchtest du die Daten als CSV exportieren? (Einfacher zu analysieren)")
print("   Führe aus: python export_to_csv.py")
