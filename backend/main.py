"""Private landslide inference service. Run from the repository root."""
from backend import local_network  # Install loopback-only socket policy before dependencies.
from contextlib import asynccontextmanager
from hashlib import sha256
import hmac
import os
from pathlib import Path

import numpy as np
import pandas as pd
from fastapi import Depends, FastAPI, Header, HTTPException
from starlette.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel, ConfigDict, StrictFloat, StrictInt
from sklearn.ensemble import RandomForestClassifier
from sklearn import __version__ as sklearn_version
from sklearn.metrics import brier_score_loss, roc_auc_score
from sklearn.model_selection import train_test_split

FEATURES = ["Aspect", "Curvature", "Earthquake", "Elevation", "Flow", "Lithology",
            "NDVI", "NDWI", "Plan", "Precipitation", "Profile", "Slope"]


def train(path: Path):
    frame = pd.read_csv(path)
    frame = frame[["Landslide", *FEATURES]].apply(pd.to_numeric, errors="raise")
    if frame.empty or not np.isfinite(frame.to_numpy()).all():
        raise ValueError("Dataset must contain finite numeric values")
    # Identical rows must not leak across the evaluation split.
    conflicts = frame.groupby(FEATURES)["Landslide"].transform("nunique").gt(1)
    excluded = int(conflicts.sum())
    frame = frame.loc[~conflicts]
    frame = frame.drop_duplicates(subset=FEATURES)
    if set(frame.Landslide.unique()) != {0, 1} or frame.Landslide.value_counts().min() < 5:
        raise ValueError("Landslide must contain sufficient examples of both 0 and 1")
    x, y = frame[FEATURES], frame.Landslide.astype(int)
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=.2, stratify=y, random_state=42)
    model = RandomForestClassifier(n_estimators=300, min_samples_leaf=2, random_state=42, n_jobs=-1)
    model.fit(x_train, y_train)
    probabilities = model.predict_proba(x_test)[:, list(model.classes_).index(1)]
    metrics = {"roc_auc": float(roc_auc_score(y_test, probabilities)),
               "brier_score": float(brier_score_loss(y_test, probabilities)),
               "training_rows": len(x_train), "evaluation_rows": len(x_test),
               "excluded_conflicting_rows": excluded}
    # Serving the evaluated model preserves the holdout's independence.
    schema = {name: {"min": float(x[name].min()), "max": float(x[name].max()),
                     "values": sorted(float(v) for v in x[name].unique())} for name in FEATURES}
    version = sha256(path.read_bytes() + b"rf300-leaf2-seed42-v1" + sklearn_version.encode()).hexdigest()[:16]
    return model, schema, metrics, version


@asynccontextmanager
async def lifespan(app: FastAPI):
    key = os.environ.get("HAZARD_API_KEY", "")
    if len(key) < 32:
        raise RuntimeError("HAZARD_API_KEY must contain at least 32 characters")
    path = Path(os.environ.get("HAZARD_DATASET_PATH", str(Path(__file__).resolve().parents[1] / "data/Complete-data.csv")))
    app.state.model, app.state.schema, app.state.metrics, app.state.version = train(path)
    app.state.key = key
    yield


app = FastAPI(title="Rwanda Landslide Prediction", lifespan=lifespan)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=['localhost', '127.0.0.1', '[::1]'])


def authorize(x_api_key: str = Header(default="")):
    if not hmac.compare_digest(x_api_key.encode(), app.state.key.encode()):
        raise HTTPException(401, "Invalid service credential")


class Metrics(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    Aspect: StrictInt | StrictFloat
    Curvature: StrictInt | StrictFloat
    Earthquake: StrictInt | StrictFloat
    Elevation: StrictInt | StrictFloat
    Flow: StrictInt | StrictFloat
    Lithology: StrictInt | StrictFloat
    NDVI: StrictInt | StrictFloat
    NDWI: StrictInt | StrictFloat
    Plan: StrictInt | StrictFloat
    Precipitation: StrictInt | StrictFloat
    Profile: StrictInt | StrictFloat
    Slope: StrictInt | StrictFloat


def risk_level(probability: float):
    return "High Risk" if probability >= .7 else "Elevated" if probability >= .3 else "Low Risk"


@app.get("/health")
def health():
    return {"status": "ready"}


@app.get("/model", dependencies=[Depends(authorize)])
def metadata():
    return {"features": app.state.schema, "metrics": app.state.metrics, "modelVersion": app.state.version,
            "thresholds": {"elevated": 30, "high": 70},
            "inputEncoding": "Dataset feature codes; raw sensor units require an externally validated mapping."}


@app.post("/predict-hazard", dependencies=[Depends(authorize)])
def predict(metrics: Metrics):
    values = metrics.model_dump()
    for name, value in values.items():
        if value not in app.state.schema[name]["values"]:
            raise HTTPException(422, f"{name} must use an observed dataset code")
    row = pd.DataFrame([values], columns=FEATURES)
    probability = float(app.state.model.predict_proba(row)[0, list(app.state.model.classes_).index(1)])
    percentage = round(probability * 100, 2)
    return {"probability": percentage, "riskLevel": risk_level(percentage / 100),
            "modelVersion": app.state.version, "features": values}
