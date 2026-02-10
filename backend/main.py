from level import Level
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
import uuid
from typing import List, Optional
import time
import math
from evaluator import DistributionEvaluator
from zahlenevaluation.zahlen_evaluator import ZahlenEvaluator
from fragen.stufe1 import Stufe1Fragen
from fragen.stufe2 import Stufe2Fragen
from fragen.stufe3 import Stufe3Fragen
from fragen.stufe4 import Stufe4Fragen
from fragen.stufe5 import Stufe5Fragen
from zahlenevaluation.w1s2evaluation import W1S2Evaluation
from zahlenevaluation.w1s3evaluation import W1S3Evaluation
from zahlenevaluation.w1s4evaluation import W1S4Evaluation
from zahlenevaluation.w1s5evaluation import W1S5Evaluation
from fragen.stufe2 import Stufe2Fragen
from zahlenevaluation import W1S1Evaluation
from data_logger import get_data_logger

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Session Store ---
SESSIONS = {}
from verteilung import Verteilung
from verteilungen.verteilungmain import VerteilungMain


class SetDistributionRequest(BaseModel):
    session_id: str
    distribution_type: str
    game_mode: Optional[str] = "color"  # "color" oder "number"


# Erweiterte StartSessionRequest für Zahlenspiel
class StartSessionRequest(BaseModel):
    distribution_type: Optional[str] = "normal"
    game_mode: Optional[str] = "color"
    welt: Optional[int] = None  # Für Zahlenspiel: 1-10
    stufe: Optional[int] = None  # Für Zahlenspiel: 1-6
    n: Optional[int] = None  # Anzahl Werte für die Verteilung

@app.post("/start-session")
def start_session(request: StartSessionRequest):
    """
    Startet eine neue Session mit einer definierten Verteilung.
    game_mode: "color" für Farbverteilung (Standard), "number" für Zahlenverteilung (0-20)
    """
    try:
        print("/start-session called with:", request.dict())
        session_id = str(uuid.uuid4())
        distribution_type = request.distribution_type
        game_mode = request.game_mode if request.game_mode in ["color", "number"] else "color"
        
        print(f"🎮 Starting session with game_mode: {game_mode}, distribution_type: {distribution_type}")
        
        if game_mode == "number":
            # Level-Infos abfragen und speichern
            # Nutze Werte aus Request, sonst Defaults aus Level()
            level_defaults = Level()
            welt = request.welt if request.welt is not None else level_defaults.welt
            stufe = request.stufe if request.stufe is not None else level_defaults.stufe
            print(f"🎮 DEBUG: Level-Defaults: welt={welt}, stufe={stufe}")
            n = getattr(request, "n", None)
            if distribution_type not in VerteilungMain.available():
                distribution_type = "normal"
            # In Welt 1 bestimmt w1.py die Anzahl N intern. Ignoriere externes n.
            if welt == 1:
                samples = VerteilungMain.generate(distribution_type, welt=welt, stufe=stufe)
            else:
                samples = VerteilungMain.generate(distribution_type, N=n if n is not None else 40, welt=welt, stufe=stufe)
            print(f"📊 Generated NUMBER samples (0-20): len={len(samples)} head={samples[:5]}")
            level_info = Level(welt=welt, stufe=stufe)
            # --- NEU: Fragen für Welt 1, Stufe 1/2/3/4/5 generieren ---
            stufe1_fragen = None
            stufe2_fragen = None
            stufe3_fragen = None
            stufe4_fragen = None
            stufe5_fragen = None
            if welt == 1 and stufe == 1:
                stufe1_fragen = Stufe1Fragen(samples).get_fragen()
            if welt == 1 and stufe == 2:
                stufe2_fragen = Stufe2Fragen(samples).get_fragen()
            if welt == 1 and stufe == 3:
                stufe3_obj = Stufe3Fragen(samples)
                stufe3_fragen = stufe3_obj.get_fragen()
            if welt == 1 and stufe == 4:
                stufe4_obj = Stufe4Fragen(samples)
                stufe4_fragen = stufe4_obj.get_fragen()
            if welt == 1 and stufe == 5:
                stufe5_obj = Stufe5Fragen(samples)
                stufe5_fragen = stufe5_obj.get_fragen()
        else:
            # Farbverteilung (Original): Generiere Prozent-Histogramm
            if distribution_type not in Verteilung.available():
                distribution_type = "normal"
            # Entferne feste N=50, nutze Standard-N der Verteilung
            samples = Verteilung.generate(distribution_type)
            print(f"📊 Generated COLOR samples (0-100): len={len(samples)} head={samples[:5]}")
            level_info = None
            stufe1_fragen = None
        
        SESSIONS[session_id] = {
            "level": 1,
            "distribution_type": distribution_type,
            "game_mode": game_mode,
        }
        if level_info:
            SESSIONS[session_id]["level_info"] = level_info.dict()
        SESSIONS[session_id].setdefault("distributions", {})
        SESSIONS[session_id]["distributions"]["generated"] = {"samples": samples, "ts": int(time.time())}
        
        # Speichere stufe4_fragen für spätere Evaluation (damit Optionen gleich bleiben)
        if 'stufe4_fragen' in locals() and stufe4_fragen:
            SESSIONS[session_id]["stufe4_fragen_obj"] = stufe4_fragen
        
        # 📊 LOGGING: Session-Start
        try:
            logger = get_data_logger()
            logger.log_session_start(
                session_id=session_id,
                level_info=level_info.dict() if level_info else {"welt": "N/A", "stufe": "N/A"},
                distribution_info={
                    "type": distribution_type,
                    "n_samples": len(samples),
                    "game_mode": game_mode
                }
            )
        except Exception as log_error:
            print(f"⚠️ Logging-Fehler (Session-Start): {log_error}")
        
        response = {
            "session_id": session_id,
            "current_level": 1,
            "distribution": samples,
            "game_mode": game_mode
        }
        if level_info:
            response["level_info"] = level_info.dict()
        if stufe1_fragen:
            response["stufe1_fragen"] = stufe1_fragen
        if 'stufe2_fragen' in locals() and stufe2_fragen:
            response["stufe2_fragen"] = stufe2_fragen
        if 'stufe5_fragen' in locals() and stufe5_fragen:
            response["stufe5_fragen"] = stufe5_fragen
        if 'stufe3_fragen' in locals() and stufe3_fragen:
            response["stufe3_fragen"] = stufe3_fragen
        if 'stufe4_fragen' in locals() and stufe4_fragen:
            response["stufe4_fragen"] = stufe4_fragen
        return response
    except Exception as e:
        print("Error in start_session:", e)
        raise


# Neuer Endpunkt: Verteilung für eine Session setzen
@app.post("/set-distribution")
def set_distribution(data: SetDistributionRequest):
    """
    Setzt die gewünschte Verteilung für eine bestehende Session.
    """
    session_id = data.session_id
    distribution_type = data.distribution_type
    game_mode = data.game_mode or SESSIONS.get(session_id, {}).get("game_mode", "color")
    
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session nicht gefunden")
    
    if game_mode == "number":
        if distribution_type not in VerteilungMain.available():
            raise HTTPException(status_code=400, detail="Unbekannte Verteilung")
        # Entferne feste N=50, nutze Standard-N von VerteilungMain
        samples = VerteilungMain.generate(distribution_type)
    else:
        if distribution_type not in Verteilung.available():
            raise HTTPException(status_code=400, detail="Unbekannte Verteilung")
        # Entferne feste N=50, nutze Standard-N der Verteilung
        samples = Verteilung.generate(distribution_type)
    
    SESSIONS[session_id]["distribution_type"] = distribution_type
    SESSIONS[session_id]["game_mode"] = game_mode
    SESSIONS[session_id].setdefault("distributions", {})
    SESSIONS[session_id]["distributions"]["generated"] = {"samples": samples, "ts": int(time.time())}
    return {"status": "ok", "distribution_type": distribution_type, "samples": samples, "game_mode": game_mode}

@app.get("/available-distributions")
def available_distributions(game_mode: Optional[str] = "color"):
    """Gibt Liste der verfügbaren Verteilungen zurück"""
    if game_mode == "number":
        return {
            "distributions": VerteilungMain.available(),
            "descriptions": VerteilungMain.descriptions(),
            "game_mode": "number"
        }
    return {
        "distributions": Verteilung.available(),
        "descriptions": Verteilung.descriptions(),
        "game_mode": "color"
    }

# --- Minigame definitions ---
MINIGAMES = {
    "math": {"type": "math"},
    "memory": {"type": "memory"},
    "reaction": {"type": "reaction"},
}

@app.get("/get-minigames/{session_id}")
def get_minigames(session_id: str):
    if session_id not in SESSIONS:
        return {"error": "invalid session"}
    keys = random.sample(list(MINIGAMES.keys()), 2)
    return {"choices": keys}

class SolveData(BaseModel):
    session_id: str
    game: str
    success: bool

@app.post("/solve-minigame")
def solve(data: SolveData):
    if data.session_id not in SESSIONS:
        return {"error": "invalid session"}

    if data.success:
        SESSIONS[data.session_id]["level"] += 1
    else:
        SESSIONS[data.session_id]["level"] = max(1, SESSIONS[data.session_id]["level"] - 1)

    return {"level": SESSIONS[data.session_id]["level"]}


class W1S1EvaluateRequest(BaseModel):

    # --- W1S2 Freitext-Auswertung ---
    class W1S2EvaluateRequest(BaseModel):
        session_id: str
        antworten: list[str]
        frage_indices: list[int] = None  # Optional: Nur bestimmte Fragen evaluieren

    @app.post("/evaluate-w1s2")
    def evaluate_w1s2(data: W1S2EvaluateRequest):
        """Evaluate Welt1 Stufe2 Freitext-Antworten auf dem Backend.
        Verwendet die gespeicherten Samples, erzeugt die Fragen erneut und wertet mit W1S2Evaluation aus.
        Unterstützt Teil-Evaluationen via frage_indices.
        """
        sid = data.session_id
        if sid not in SESSIONS:
            raise HTTPException(status_code=404, detail="Session not found")

        # Get generated samples for this session
        generated = SESSIONS.get(sid, {}).get("distributions", {}).get("generated", {})
        samples = generated.get("samples")
        if not samples:
            raise HTTPException(status_code=400, detail="No generated distribution for session")

        # Recreate the Stufe2 questions
        alle_fragen = Stufe2Fragen(samples).get_fragen()
        
        # Wenn frage_indices angegeben ist, nur diese Fragen evaluieren
        if data.frage_indices is not None:
            fragen_subset = [alle_fragen[i] for i in data.frage_indices if i < len(alle_fragen)]
            evaluator = W1S2Evaluation(fragen_subset, data.antworten)
        else:
            # Alle Fragen evaluieren
            evaluator = W1S2Evaluation(alle_fragen, data.antworten)
        
        result = evaluator.evaluate()
        
        # 📊 LOGGING: Antworten und Ergebnisse
        try:
            logger = get_data_logger()
            level_info = SESSIONS[sid].get("level_info", {"welt": 1, "stufe": 2})
            logger.log_answers(
                session_id=sid,
                level_info=level_info,
                antworten=data.antworten,
                evaluation_result=result
            )
        except Exception as log_error:
            print(f"⚠️ Logging-Fehler (W1S2): {log_error}")
        
        return {"status": "ok", "evaluation": result}
    session_id: str
    antworten: List[int]


@app.post("/evaluate-w1s1")
def evaluate_w1s1(data: W1S1EvaluateRequest):
    """Evaluate Welt1 Stufe1 multiple-choice answers on the backend.

    Uses the stored generated samples for the session to recreate questions
    via `Stufe1Fragen` and then evaluates answers using `W1S1Evaluation`.
    """
    sid = data.session_id
    if sid not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get generated samples for this session
    generated = SESSIONS.get(sid, {}).get("distributions", {}).get("generated", {})
    samples = generated.get("samples")
    if not samples:
        raise HTTPException(status_code=400, detail="No generated distribution for session")

    # Recreate the Stufe1 questions and evaluate
    fragen = Stufe1Fragen(samples).get_fragen()
    evaluator = W1S1Evaluation(fragen, data.antworten)
    result = evaluator.evaluate()
    
    # 📊 LOGGING: Antworten und Ergebnisse
    try:
        logger = get_data_logger()
        level_info = SESSIONS[sid].get("level_info", {"welt": 1, "stufe": 1})
        logger.log_answers(
            session_id=sid,
            level_info=level_info,
            antworten=data.antworten,
            evaluation_result=result
        )
    except Exception as log_error:
        print(f"⚠️ Logging-Fehler (W1S1): {log_error}")
    
    return {"status": "ok", "evaluation": result}


# --- W1S3 Freitext-/Vergleichs-Auswertung vor dem Zeichnen ---
class W1S3EvaluateRequest(BaseModel):
    session_id: str
    antworten: list[str]
    frage_indices: list[int] = None  # Optional: spezifische Fragen evaluieren

@app.post("/evaluate-w1s3")
def evaluate_w1s3(data: W1S3EvaluateRequest):
    """Evaluate Welt1 Stufe3 fünf Fragen vor dem Zeichnen.

    Rekonstruiert Fragen und bewertet nur die Fragen-Komponente.
    Unterstützt partielle Evaluierung via frage_indices.
    """
    sid = data.session_id
    if sid not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found")

    generated = SESSIONS.get(sid, {}).get("distributions", {}).get("generated", {})
    samples = generated.get("samples")
    if not samples:
        raise HTTPException(status_code=400, detail="No generated distribution for session")

    stufe3_obj = Stufe3Fragen(samples)
    fragen = stufe3_obj.get_fragen()
    ground_truth_histogram = stufe3_obj.get_ground_truth_histogram()
    # Player drawn histogram ist vor dem Zeichnen leer -> gleiche Länge mit Nullen
    player_drawn_histogram = [0] * len(ground_truth_histogram)

    # Wenn frage_indices angegeben, nur diese Fragen evaluieren
    if data.frage_indices is not None:
        filtered_fragen = [fragen[i] for i in data.frage_indices if i < len(fragen)]
        evaluator = W1S3Evaluation(filtered_fragen, data.antworten, ground_truth_histogram, player_drawn_histogram)
    else:
        evaluator = W1S3Evaluation(fragen, data.antworten, ground_truth_histogram, player_drawn_histogram)
    
    result = evaluator.evaluate()
    # Nur Fragen-Ergebnis zurückgeben (Frontend zeigt Fragenbewertung)
    filtered = {
        "results": result.get("results"),
        "correct_count": result.get("correct_count"),
        "total": result.get("total"),
        "questions_score": result.get("questions_score"),
    }
    
    # 📊 LOGGING: Antworten und Ergebnisse
    try:
        logger = get_data_logger()
        level_info = SESSIONS[sid].get("level_info", {"welt": 1, "stufe": 3})
        logger.log_answers(
            session_id=sid,
            level_info=level_info,
            antworten=data.antworten,
            evaluation_result=filtered
        )
    except Exception as log_error:
        print(f"⚠️ Logging-Fehler (W1S3): {log_error}")
    
    return {"status": "ok", "evaluation": filtered}


class W1S4EvaluateRequest(BaseModel):
    session_id: str
    antworten: list[str]

@app.post("/evaluate-w1s4")
def evaluate_w1s4(data: W1S4EvaluateRequest):
    """Evaluate Welt1 Stufe4 drei Fragen (nur Fragen, ohne Zeichnung).

    Rekonstruiert Fragen und bewertet nur die Fragen-Komponente.
    """
    sid = data.session_id
    if sid not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found")

    generated = SESSIONS.get(sid, {}).get("distributions", {}).get("generated", {})
    samples = generated.get("samples")
    if not samples:
        raise HTTPException(status_code=400, detail="No generated distribution for session")

    # Verwende gespeicherte Fragen statt neu zu generieren (damit Optionen gleich bleiben!)
    fragen = SESSIONS.get(sid, {}).get("stufe4_fragen_obj")
    if not fragen:
        # Fallback: Generiere neu (sollte nicht passieren)
        stufe4_obj = Stufe4Fragen(samples)
        fragen = stufe4_obj.get_fragen()

    # Evaluiere nur die 3 Fragen (ohne Zeichnung)
    results = []
    correct_count = 0
    total = len(fragen)

    for idx, frage in enumerate(fragen):
        korrekt = frage.get("korrekt")
        selected_value = data.antworten[idx].strip() if idx < len(data.antworten) and data.antworten[idx] is not None else None
        is_correct = False

        if korrekt is not None and selected_value is not None:
            # Für Frage 3 und 5: Ja/Nein Vergleich
            if idx == 2 or idx == 4:
                sv = str(selected_value).strip().lower()
                kv = str(korrekt).strip().lower()
                yes = {'ja', 'yes', 'y', 'true', '1'}
                no = {'nein', 'no', 'n', 'false', '0'}
                if kv in yes:
                    is_correct = sv in yes
                elif kv in no:
                    is_correct = sv in no
                else:
                    is_correct = str(selected_value) == str(korrekt)
            # Frage 4: Welche Zahl nicht gesehen (exakter String-Vergleich)
            elif idx == 3:
                is_correct = str(selected_value) == str(korrekt)
            else:
                # Numerische Fragen: Erlaubt kleine Abweichungen
                try:
                    sv_num = float(selected_value)
                    kv_num = float(korrekt)
                    # Für Frage 1 (peak_value): Exakte Übereinstimmung
                    if idx == 0:
                        is_correct = abs(sv_num - kv_num) < 0.01
                    # Für Frage 2 (peak_frequency): Toleranz von 20%
                    elif idx == 1:
                        tolerance = max(1, kv_num * 0.2)
                        is_correct = abs(sv_num - kv_num) <= tolerance
                except (ValueError, TypeError):
                    is_correct = False

        if is_correct:
            correct_count += 1

        results.append({
            "frage": frage.get("frage"),
            "selected_value": selected_value,
            "korrekt": korrekt,
            "is_correct": is_correct
        })

    questions_score = correct_count / total if total > 0 else 0

    filtered = {
        "results": results,
        "correct_count": correct_count,
        "total": total,
        "questions_score": questions_score,
    }
    
    # 📊 LOGGING: Antworten und Ergebnisse
    try:
        logger = get_data_logger()
        level_info = SESSIONS[sid].get("level_info", {"welt": 1, "stufe": 4})
        logger.log_answers(
            session_id=sid,
            level_info=level_info,
            antworten=data.antworten,
            evaluation_result=filtered
        )
    except Exception as log_error:
        print(f"⚠️ Logging-Fehler (W1S4): {log_error}")
    
    return {"status": "ok", "evaluation": filtered}


class W1S5EvaluateRequest(BaseModel):
    session_id: str
    histogram_inputs: list[int]  # Array mit 21 Werten (für 0-20)

@app.post("/evaluate-w1s5")
def evaluate_w1s5(data: W1S5EvaluateRequest):
    """Evaluate Welt1 Stufe5 Histogramm-Eingaben.

    Vergleicht die User-Eingaben mit der echten Verteilung.
    """
    sid = data.session_id
    if sid not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found")

    generated = SESSIONS.get(sid, {}).get("distributions", {}).get("generated", {})
    samples = generated.get("samples")
    if not samples:
        raise HTTPException(status_code=400, detail="No generated distribution for session")

    # Berechne echtes Histogramm
    true_histogram = [0] * 21
    for value in samples:
        val = max(0, min(20, round(value)))
        true_histogram[val] += 1

    # Vergleiche mit User-Eingaben
    user_histogram = data.histogram_inputs
    if len(user_histogram) != 21:
        raise HTTPException(status_code=400, detail="Invalid histogram length")

    # Nutze die komposite Bewertung aus W1S5Evaluation
    evaluator = W1S5Evaluation(true_histogram, user_histogram)
    ev = evaluator.evaluate()
    
    # 📊 LOGGING: Histogram-Eingaben und Ergebnisse
    try:
        logger = get_data_logger()
        level_info = SESSIONS[sid].get("level_info", {"welt": 1, "stufe": 5})
        logger.log_drawing_evaluation(
            session_id=sid,
            level_info=level_info,
            player_histogram=user_histogram,
            evaluation_result=ev
        )
    except Exception as log_error:
        print(f"⚠️ Logging-Fehler (W1S5): {log_error}")

    return {
        "status": "ok",
        "evaluation": ev
    }


# --- Distribution endpoints (scaffold) ---
class DistributionSave(BaseModel):
    session_id: str
    distribution: List[int]
    source: Optional[str] = "ground_truth"


@app.post("/save-distribution")
def save_distribution(data: DistributionSave):
    if data.session_id not in SESSIONS:
        return {"error": "invalid session"}

    # store raw samples and timestamp
    SESSIONS[data.session_id].setdefault("distributions", {})
    SESSIONS[data.session_id]["distributions"][data.source] = {
        "samples": data.distribution,
        "ts": int(time.time())
    }

    return {"status": "ok"}


@app.get("/get-distribution/{session_id}")
def get_distribution(session_id: str, source: Optional[str] = None):
    if session_id not in SESSIONS:
        return {"error": "invalid session"}

    distributions = SESSIONS[session_id].get("distributions", {})
    if source:
        if source not in distributions:
            return {"error": "not found"}
        return {"distribution": distributions[source]}

    return {"distributions": distributions}


class PlayerDistribution(BaseModel):
    session_id: str
    samples: List[int]
    pre_reveal_answers: Optional[dict] = None  # Für Zahlenmodus: {peak_value, peak_frequency, additional_peaks}


def histogram_0_100(samples: List[int]) -> List[int]:
    bins = [0] * 101
    for v in samples:
        if v is None:
            continue
        try:
            vi = int(round(v))
        except Exception:
            continue
        vi = max(0, min(100, vi))
        bins[vi] += 1
    return bins


@app.post("/submit-player-distribution")
def submit_player_distribution(data: PlayerDistribution):
    if data.session_id not in SESSIONS:
        return {"error": "invalid session"}

    # store player samples
    SESSIONS[data.session_id].setdefault("submissions", [])
    SESSIONS[data.session_id]["submissions"].append({"samples": data.samples, "ts": int(time.time())})

    # Keine Bewertung mehr - nur speichern
    return {"status": "ok", "message": "saved"}
