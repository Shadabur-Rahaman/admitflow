import csv
import io
import os
import subprocess
import sys
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import main, seed
from app.catalog import today
from app.db import Base, Patient

API = "/api/v1"
PATIENTS = API + "/patients"


@pytest.fixture
def database(tmp_path, monkeypatch):
    url = "sqlite:///" + (tmp_path / "isolated.db").as_posix()
    engine = create_engine(url)
    session = sessionmaker(engine, expire_on_commit=False)
    Base.metadata.create_all(engine)
    monkeypatch.setattr(main, "Session", session)
    monkeypatch.setattr(seed, "Session", session)
    seed.seed(demo=False)
    yield url
    engine.dispose()


@pytest.fixture
def client(database):
    with TestClient(main.app) as client:
        yield client


@pytest.fixture
def payload():
    return dict(name="Amara Test", age=24, gender="Female", ward_id="general",
                department_id="medicine", doctor_id="doctor-1", admission_date=today().isoformat())


def test_lifecycle(client, payload, database):
    assert client.get("/ready").json() == {"status": "ready"}
    response = client.post(PATIENTS, json=payload)
    assert response.status_code == 201, response.text
    created = response.json()
    path = PATIENTS + "/" + created["id"]
    assert created["status"] == "Admitted"
    assert created["patient_code"].startswith("PT-")
    assert client.get(path).json()["name"] == payload["name"]
    assert client.patch(path, json=payload | {"age": 25}).json()["age"] == 25
    # Reopen the same file in a separate interpreter with a fresh SQLAlchemy engine.
    probe = subprocess.run([sys.executable, "-c",
                            "from app.db import Session, Patient; import sys; "
                            "with_session = Session(); print(with_session.get(Patient, sys.argv[1]).age)",
                            created["id"]], env=os.environ | {"DATABASE_URL": database},
                           capture_output=True, text=True, check=True)
    assert probe.stdout.strip() == "25"
    assert client.get(API + "/dashboard/summary").json()["admitted"] == 1
    response = client.post(path + "/discharge")
    assert response.status_code == 200
    assert response.json()["status"] == "Discharged"
    assert response.json()["discharged_at"]
    assert client.post(path + "/discharge").status_code == 409
    assert client.get(API + "/dashboard/summary").json()["admitted"] == 0
    assert client.get(API + "/dashboard/summary").json()["discharged"] == 1
    assert client.delete(path).status_code == 204
    assert client.get(path).status_code == 404
    assert client.delete(path).status_code == 404


@pytest.mark.parametrize(("key", "value"), [
    ("name", ""), ("name", "   "), ("name", "Name123"), ("name", "@Amara"), ("name", "Amara\tTest"),
    ("age", -1), ("age", 121), ("age", 1.5), ("age", True), ("age", "8"),
    ("gender", "unknown"), ("ward_id", "unknown"), ("department_id", "unknown"),
    ("doctor_id", "unknown"), ("doctor_id", "doctor-2"), ("status", "Unknown"),
    ("admission_date", "2026-02-30"), ("admission_date", "2026-01-02T00:00:00"),
    ("admission_date", (today() + timedelta(days=1)).isoformat()),
])
def test_reject_invalid_inputs(client, payload, key, value):
    response = client.post(PATIENTS, json=payload | {key: value})
    assert response.status_code == 422, response.text


@pytest.mark.parametrize("age", [0, 120])
def test_age_boundaries(client, payload, age):
    assert client.post(PATIENTS, json=payload | {"age": age}).status_code == 201


@pytest.mark.parametrize("field", ["name", "age", "gender", "ward_id", "department_id", "doctor_id", "admission_date"])
def test_missing_field(client, payload, field):
    payload.pop(field)
    assert client.post(PATIENTS, json=payload).status_code == 422


def test_filter_search_pagination_and_export(client, payload):
    entries = [payload | {"name": "  Élodie Test  "}, payload | {"name": "Amara Second", "ward_id": "icu"},
               payload | {"name": "Amara Third", "department_id": "cardiology", "doctor_id": "doctor-2"}]
    for entry in entries:
        assert client.post(PATIENTS, json=entry).status_code == 201
    assert client.get(PATIENTS, params={"search": "  ÉLO  "}).json()["items"][0]["name"] == "Élodie Test"
    for field in ("ward_id", "department_id", "doctor_id"):
        assert client.get(PATIENTS, params={field: payload[field]}).json()["total"] == 2
    filters = dict(search="amara", ward_id="general", department_id="cardiology", doctor_id="doctor-2")
    assert client.get(PATIENTS, params=filters).json()["total"] == 1
    output = client.get(API + "/reports/patients.csv", params=filters)
    assert list(csv.DictReader(io.StringIO(output.text)))[0]["Name"] == "Amara Third"
    page = client.get(PATIENTS, params={"page": 10, "page_size": 2}).json()
    assert (page["page"], page["total"], len(page["items"])) == (2, 3, 1)
    assert client.get(API + "/dashboard/admission-trends").json()[-1]["count"] == 3


def test_seed_is_repeatable(client, payload):
    assert client.post(PATIENTS, json=payload).status_code == 201
    seed.seed()
    seed.seed()
    assert client.get(PATIENTS).json()["total"] == 33



def test_database_connection_error_keeps_json_and_cors(client, monkeypatch):
    from sqlalchemy.exc import OperationalError

    def unavailable(_):
        raise OperationalError("SELECT 1", {}, OSError("connection closed"))

    monkeypatch.setattr(main, "summarize", unavailable)
    origin = "http://localhost:5173"
    response = client.get(API + "/dashboard/summary", headers={"Origin": origin})
    assert response.status_code == 503
    assert response.json() == {"detail": "Database unavailable. Try again shortly."}
    assert response.headers["access-control-allow-origin"] == origin
