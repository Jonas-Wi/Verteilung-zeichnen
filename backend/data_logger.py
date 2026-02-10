"""
Data Logger für Spielerdaten
Speichert automatisch alle Spielerantworten und Ergebnisse in einer Excel-Datei.
"""

import pandas as pd
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any
import json
import os


class DataLogger:
    """Logger für Spielerdaten - speichert in Excel-Datei"""
    
    def __init__(self, output_dir: str = "spieler_daten"):
        """
        Args:
            output_dir: Verzeichnis für die Excel-Dateien
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.excel_file = self.output_dir / "spieler_antworten.xlsx"
        
    def log_session_start(self, session_id: str, level_info: Dict[str, Any], distribution_info: Dict[str, Any]):
        """
        Loggt den Start einer neuen Session
        
        Args:
            session_id: Eindeutige Session-ID
            level_info: Informationen über das Level (welt, stufe)
            distribution_info: Informationen über die generierte Verteilung
        """
        data = {
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'session_id': session_id,
            'welt': level_info.get('welt', 'N/A'),
            'stufe': level_info.get('stufe', 'N/A'),
            'distribution_type': distribution_info.get('type', 'N/A'),
            'n_samples': distribution_info.get('n_samples', 'N/A'),
            'event_type': 'session_start'
        }
        self._append_to_excel(data, sheet_name='Sessions')
        
    def log_answers(self, session_id: str, level_info: Dict[str, Any], 
                    antworten: List[str], evaluation_result: Dict[str, Any]):
        """
        Loggt die Antworten eines Spielers und die Evaluierungsergebnisse
        
        Args:
            session_id: Eindeutige Session-ID
            level_info: Informationen über das Level
            antworten: Liste der Spielerantworten
            evaluation_result: Evaluierungsergebnis vom Backend
        """
        # Basis-Daten
        data = {
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'session_id': session_id,
            'welt': level_info.get('welt', 'N/A'),
            'stufe': level_info.get('stufe', 'N/A'),
            'event_type': 'answers',
        }
        
        # Antworten als separate Spalten
        for i, antwort in enumerate(antworten, 1):
            data[f'antwort_{i}'] = str(antwort)
        
        # Evaluierungsergebnisse
        data['score'] = evaluation_result.get('score', 'N/A')
        data['correct_count'] = evaluation_result.get('correct_count', 'N/A')
        data['total_questions'] = evaluation_result.get('total', 'N/A')
        data['questions_score'] = evaluation_result.get('questions_score', 'N/A')
        
        # Detaillierte Ergebnisse als JSON-String
        if 'results' in evaluation_result:
            data['detailed_results'] = json.dumps(evaluation_result['results'], ensure_ascii=False)
        
        self._append_to_excel(data, sheet_name='Antworten')
        
    def log_drawing_evaluation(self, session_id: str, level_info: Dict[str, Any],
                               player_histogram: List[int], evaluation_result: Dict[str, Any]):
        """
        Loggt die Zeichnungs-Evaluierung (für Levels mit Histogram-Drawing)
        
        Args:
            session_id: Eindeutige Session-ID
            level_info: Informationen über das Level
            player_histogram: Vom Spieler gezeichnetes Histogram
            evaluation_result: Evaluierungsergebnis
        """
        data = {
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'session_id': session_id,
            'welt': level_info.get('welt', 'N/A'),
            'stufe': level_info.get('stufe', 'N/A'),
            'event_type': 'drawing',
            'mae': evaluation_result.get('mae', 'N/A'),
            'mse': evaluation_result.get('mse', 'N/A'),
            'wasserstein': evaluation_result.get('wasserstein', 'N/A'),
            'score': evaluation_result.get('score', 'N/A'),
        }
        
        # Histogram als JSON-String
        data['player_histogram'] = json.dumps(player_histogram)
        
        # Details aus Evaluierung
        if 'details' in evaluation_result:
            details = evaluation_result['details']
            data['mae_component'] = details.get('mae_component', 'N/A')
            data['shape_component'] = details.get('shape_component', 'N/A')
            data['wasserstein_component'] = details.get('wasserstein_component', 'N/A')
        
        self._append_to_excel(data, sheet_name='Zeichnungen')
        
    def _append_to_excel(self, data: Dict[str, Any], sheet_name: str = 'Sheet1'):
        """
        Hängt Daten an eine Excel-Datei an
        
        Args:
            data: Dictionary mit den zu speichernden Daten
            sheet_name: Name des Excel-Sheets
        """
        try:
            # DataFrame aus den neuen Daten erstellen
            new_df = pd.DataFrame([data])
            
            # Prüfen ob Datei existiert
            if self.excel_file.exists():
                # Existierende Datei laden
                with pd.ExcelFile(self.excel_file) as xls:
                    # Prüfen ob das Sheet existiert
                    if sheet_name in xls.sheet_names:
                        existing_df = pd.read_excel(xls, sheet_name=sheet_name)
                        # Daten anhängen
                        combined_df = pd.concat([existing_df, new_df], ignore_index=True)
                    else:
                        # Neues Sheet
                        combined_df = new_df
                    
                    # Alle Sheets laden
                    all_sheets = {name: pd.read_excel(xls, sheet_name=name) 
                                 for name in xls.sheet_names if name != sheet_name}
                    all_sheets[sheet_name] = combined_df
            else:
                # Neue Datei - nur das aktuelle Sheet
                all_sheets = {sheet_name: new_df}
            
            # In Excel schreiben (alle Sheets)
            with pd.ExcelWriter(self.excel_file, engine='openpyxl', mode='w') as writer:
                for name, df in all_sheets.items():
                    df.to_excel(writer, sheet_name=name, index=False)
                    
            print(f"✅ Daten gespeichert in {self.excel_file} (Sheet: {sheet_name})")
            
        except Exception as e:
            print(f"❌ Fehler beim Speichern in Excel: {e}")
            # Fallback: Als CSV speichern
            try:
                csv_file = self.output_dir / f"{sheet_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
                new_df = pd.DataFrame([data])
                new_df.to_csv(csv_file, index=False, mode='a', header=not csv_file.exists())
                print(f"✅ Fallback: Daten als CSV gespeichert: {csv_file}")
            except Exception as csv_error:
                print(f"❌ Auch CSV-Speicherung fehlgeschlagen: {csv_error}")


# Globale Logger-Instanz
_logger_instance = None

def get_data_logger() -> DataLogger:
    """Gibt die globale Logger-Instanz zurück (Singleton)"""
    global _logger_instance
    if _logger_instance is None:
        _logger_instance = DataLogger()
    return _logger_instance
