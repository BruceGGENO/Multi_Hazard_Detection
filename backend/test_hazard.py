from pathlib import Path

from fastapi.testclient import TestClient
import pytest

from backend.main import app, risk_level


@pytest.fixture(scope="module")
def client():
    import os
    previous = os.environ.get("HAZARD_API_KEY")
    os.environ["HAZARD_API_KEY"] = "test-only-service-key-32-characters-long"
    with TestClient(app, base_url='http://127.0.0.1') as session:
        yield session
    if previous is None:
        os.environ.pop("HAZARD_API_KEY", None)
    else:
        os.environ["HAZARD_API_KEY"] = previous


HEADERS = {"X-API-Key": "test-only-service-key-32-characters-long"}


def sample():
    import csv
    with (Path(__file__).resolve().parents[1] / "data/Complete-data.csv").open() as file:
        row = next(csv.DictReader(file))
    return {k: float(v) for k, v in row.items() if k != "Landslide"}


def test_auth_and_model(client):
    assert client.get("/health").json() == {"status": "ready"}
    assert client.get("/model").status_code == 401
    assert client.post("/predict-hazard", json=sample()).status_code == 401
    model = client.get("/model", headers=HEADERS).json()
    assert len(model["features"]) == 12
    assert 0 <= model["metrics"]["roc_auc"] <= 1
    assert model["metrics"]["evaluation_rows"] > 0
    assert model["metrics"]["excluded_conflicting_rows"] > 0


def test_prediction_and_validation(client):
    row = sample()
    result = client.post("/predict-hazard", headers=HEADERS, json=row)
    assert result.status_code == 200
    data = result.json()
    assert 0 <= data["probability"] <= 100
    assert data["riskLevel"] in {"Low Risk", "Elevated", "High Risk"}
    assert data["features"] == row
    assert client.post("/predict-hazard", headers=HEADERS, json=row).json() == data
    for invalid in [{}, {**row, "Landslide": 1}, {**row, "Slope": 99999},
                    {**row, "Slope": True}, {**row, "Slope": "2"}]:
        assert client.post("/predict-hazard", headers=HEADERS, json=invalid).status_code == 422


def test_thresholds():
    assert risk_level(0) == "Low Risk"
    assert risk_level(.29999) == "Low Risk"
    assert risk_level(.3) == "Elevated"
    assert risk_level(.69999) == "Elevated"
    assert risk_level(.7) == "High Risk"
    assert risk_level(1) == "High Risk"


def test_outbound_network_blocked():
    import socket
    with socket.socket() as connection:
        with pytest.raises(PermissionError):
            connection.connect(("8.8.8.8", 443))
    with pytest.raises(PermissionError):
        socket.getaddrinfo("example.com", 443)
