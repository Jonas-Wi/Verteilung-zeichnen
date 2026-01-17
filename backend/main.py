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
from zahlenevaluation import W1S1Evaluation

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
from zahlenverteilung import ZahlenVerteilung


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
            # Zahlenverteilung: Generiere Zahlenwerte 0-20
            if distribution_type not in ZahlenVerteilung.available():
                distribution_type = "normal"
            samples = ZahlenVerteilung.generate(distribution_type, N=50)
            print(f"📊 Generated NUMBER samples (0-20): {samples[:5]}")
            # Level-Infos abfragen und speichern
            # Immer die Werte aus der Klasse Level verwenden
            level_defaults = Level()
            welt = level_defaults.welt
            stufe = level_defaults.stufe
            level_info = Level(welt=welt, stufe=stufe)
            # --- NEU: Fragen für Welt 1, Stufe 1 generieren ---
            stufe1_fragen = None
            if welt == 1 and stufe == 1:
                stufe1_fragen = Stufe1Fragen(samples).get_fragen()
        else:
            # Farbverteilung (Original): Generiere Prozent-Histogramm
            if distribution_type not in Verteilung.available():
                distribution_type = "normal"
            samples = Verteilung.generate(distribution_type, N=50)
            print(f"📊 Generated COLOR samples (0-100): {samples[:5]}")
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
        if distribution_type not in ZahlenVerteilung.available():
            raise HTTPException(status_code=400, detail="Unbekannte Verteilung")
        samples = ZahlenVerteilung.generate(distribution_type, N=50)
    else:
        if distribution_type not in Verteilung.available():
            raise HTTPException(status_code=400, detail="Unbekannte Verteilung")
        samples = Verteilung.generate(distribution_type, N=50)
    
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
            "distributions": ZahlenVerteilung.available(),
            "descriptions": ZahlenVerteilung.descriptions(),
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
    return {"status": "ok", "evaluation": result}


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

    # attempt comparison with ground_truth if available
    distributions = SESSIONS[data.session_id].get("distributions", {})
    gt = distributions.get("ground_truth") or distributions.get("generated")
    if not gt:
        return {"status": "ok", "message": "saved, no ground truth available for comparison yet"}

    # Prüfe game_mode
    game_mode = SESSIONS[data.session_id].get("game_mode", "color")
    
    if game_mode == "number":
        # Verwende ZahlenEvaluator für Zahlenwerte
        evaluator = ZahlenEvaluator(
            ground_truth=gt["samples"],
            player_values=data.samples,
            pre_reveal_answers=data.pre_reveal_answers
        )
        result = evaluator.evaluate()
        return {
            "status": "ok",
            "game_mode": "number",
            **result  # Alle Metriken und Scores
        }
    else:
        # Verwende DistributionEvaluator für Farbverteilung (Original)
        evaluator = DistributionEvaluator(
            ground_truth=gt["samples"],
            player_distribution=data.samples
        )
        result = evaluator.evaluate()

        # Kombiniere Score aus Wasserstein, MAE und TVD
        wasserstein = result.get("wasserstein", 0.0)
        mae = result.get("mae", 0.0)
        tvd = result.get("tvd", 0.0)
        # Gewichte: Wasserstein 0.5, MAE 0.3, TVD 0.2
        a, b, c = 0.5, 0.3, 0.2
        # Alle Metriken sind in [0,1] (MAE ist bereits normalisiert)
        combined = a * wasserstein + b * mae + c * tvd
        score = max(0, min(100, int(round((1.0 - combined) * 100))))

        # Bestanden, wenn Score >= 90
        passed = score >= 90

        return {
            "status": "ok",
            "game_mode": "color",
            "mse": result.get("mse"),
            "mae": result.get("mae"),
            "wasserstein": result.get("wasserstein"),
            "tvd": result.get("tvd"),
            "abs_mean_error": result.get("abs_mean_error"),
            "abs_std_error": result.get("abs_std_error"),
            "passed": passed,
            "score": score,
            "debug": {
                "wasserstein": wasserstein,
                "mae": mae,
                "tvd": tvd,
                "combined": combined
            }
        }
