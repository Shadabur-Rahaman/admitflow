import csv
import io
import os
import unicodedata
from collections import Counter
from datetime import date, timedelta
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, select, update
from sqlalchemy.exc import OperationalError, SQLAlchemyError, TimeoutError as DatabaseTimeout
from sqlalchemy.orm import Session as DatabaseSession

from .catalog import DEPARTMENTS, DOCTORS, WARDS, lookups, today, utc_now
from .db import Patient, Session
from .schemas import PatientInput, PatientView, Status

app = FastAPI(title="AdmitFlow", version="1.0")
API = "/api/v1"
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip().rstrip("/") for origin in
                   os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
                   if origin.strip()],
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(OperationalError)
@app.exception_handler(DatabaseTimeout)
async def database_unavailable(_request: Request, _error: Exception):
    return JSONResponse(status_code=503, content={"detail": "Database unavailable. Try again shortly."})


@app.middleware("http")
async def safety_headers(request, call_next):
    size = request.headers.get("content-length")
    if size and (not size.isdecimal() or int(size) > 16384):
        return Response(status_code=413)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Cache-Control"] = "no-store"
    return response


def session_scope():
    with Session() as session:
        yield session


DB = Annotated[DatabaseSession, Depends(session_scope)]


class Filters:
    def __init__(self, search: str = Query("", max_length=120), ward_id: str | None = None,
                 department_id: str | None = None, doctor_id: str | None = None,
                 status: Status | None = None, admission_from: date | None = None,
                 admission_to: date | None = None):
        self.clauses = []
        if admission_from and admission_to and admission_from > admission_to:
            raise HTTPException(422, "Start date must be on or before end date.")
        if search.strip():
            self.clauses.append(Patient.search_name.contains(unicodedata.normalize("NFC", search.strip()).casefold(), autoescape=True))
        for field, value in zip((Patient.ward_id, Patient.department_id, Patient.doctor_id, Patient.status),
                                (ward_id, department_id, doctor_id, status)):
            if value:
                self.clauses.append(field == value)
        if admission_from:
            self.clauses.append(Patient.admission_date >= admission_from)
        if admission_to:
            self.clauses.append(Patient.admission_date <= admission_to)


FilterQuery = Annotated[Filters, Depends()]


def view(row):
    return PatientView.model_validate(row)


def find(db, patient_id):
    row = db.get(Patient, patient_id)
    if row is None:
        raise HTTPException(404, "Patient not found.")
    return row


def fields(data):
    for field, catalog in (("ward_id", WARDS), ("department_id", DEPARTMENTS), ("doctor_id", DOCTORS)):
        if getattr(data, field) not in catalog:
            raise HTTPException(422, [{"loc": ["body", field], "msg": "Choose a valid option."}])
    if DOCTORS[data.doctor_id]["department_id"] != data.department_id:
        raise HTTPException(422, [{"loc": ["body", "doctor_id"], "msg": "Choose a doctor from the selected department."}])
    return data.model_dump() | {"search_name": data.name.casefold(), "updated_at": utc_now()}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/ready")
def ready(db: DB):
    try:
        db.execute(select(Patient.id).limit(1))
    except SQLAlchemyError:
        raise HTTPException(503, "Database unavailable.")
    return {"status": "ready"}


@app.get(API + "/lookups")
def get_lookups():
    return lookups()


@app.get(API + "/patients")
def patients(db: DB, filters: FilterQuery, page: int = Query(1, ge=1, le=100000),
             page_size: int = Query(10, ge=1, le=100),
             sort_by: Literal["name", "admission_date", "created_at", "age"] = "admission_date",
             sort_order: Literal["asc", "desc"] = "desc"):
    total = db.scalar(select(func.count()).select_from(Patient).where(*filters.clauses))
    page = min(page, max(1, (total + page_size - 1) // page_size))
    column = getattr(Patient, sort_by)
    ordering = column.asc() if sort_order == "asc" else column.desc()
    rows = db.scalars(select(Patient).where(*filters.clauses).order_by(
        ordering, Patient.created_at.desc(), Patient.id
    ).offset((page - 1) * page_size).limit(page_size))
    return {"items": [view(row) for row in rows], "total": total, "page": page, "page_size": page_size}


@app.post(API + "/patients", status_code=201, response_model=PatientView)
def create(data: PatientInput, db: DB):
    row = Patient(**fields(data), created_at=utc_now())
    db.add(row)
    db.commit()
    return view(row)


@app.get(API + "/patients/{patient_id}", response_model=PatientView)
def detail(patient_id: str, db: DB):
    return view(find(db, patient_id))


@app.patch(API + "/patients/{patient_id}", response_model=PatientView)
def edit(patient_id: str, data: PatientInput, db: DB):
    row = find(db, patient_id)
    for key, value in fields(data).items():
        setattr(row, key, value)
    db.commit()
    return view(row)


@app.delete(API + "/patients/{patient_id}", status_code=204)
def delete(patient_id: str, db: DB):
    db.delete(find(db, patient_id))
    db.commit()


@app.post(API + "/patients/{patient_id}/discharge", response_model=PatientView)
def discharge(patient_id: str, db: DB):
    instant = utc_now()
    changed = db.execute(update(Patient).where(Patient.id == patient_id, Patient.status == "Admitted")
                         .values(status="Discharged", discharged_at=instant, updated_at=instant))
    if not changed.rowcount:
        find(db, patient_id)
        raise HTTPException(409, "This patient has already been discharged.")
    row = find(db, patient_id)
    db.commit()
    return view(row)


def summarize(db, clauses=(), report=False):
    current = today()
    ward_counts = {key: {"Admitted": 0, "Discharged": 0} for key in WARDS}
    departments, dates, statuses = Counter(), Counter(), Counter()
    groups = db.execute(select(
        Patient.ward_id, Patient.department_id, Patient.status, Patient.admission_date, func.count()
    ).where(*clauses).group_by(Patient.ward_id, Patient.department_id, Patient.status, Patient.admission_date))
    for ward, department, status, day, count in groups:
        ward_counts[ward][status] += count
        departments[department] += count
        dates[day] += count
        statuses[status] += count
    days = sorted(dates) if report else [current - timedelta(days=n) for n in range(6, -1, -1)]
    return {"total": statuses.total(), "admitted": statuses["Admitted"],
            "discharged": statuses["Discharged"], "today": dates[current],
            "wards": ward_counts, "departments": departments,
            "trend": [{"date": day.isoformat(), "count": dates[day]} for day in days]}


@app.get(API + "/dashboard/summary")
def dashboard(db: DB):
    return summarize(db)


@app.get(API + "/dashboard/admission-trends")
def trends(db: DB):
    return summarize(db)["trend"]


@app.get(API + "/reports/summary")
def reports(db: DB, filters: FilterQuery):
    return summarize(db, filters.clauses, report=True)


@app.get(API + "/reports/patients.csv")
def export(db: DB, filters: FilterQuery):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(("Patient ID", "Name", "Age", "Gender", "Ward", "Department", "Doctor", "Admission Date", "Status"))
    rows = db.scalars(select(Patient).where(*filters.clauses).order_by(Patient.admission_date.desc()))
    for row in rows:
        writer.writerow((row.patient_code, row.name, row.age, row.gender, WARDS[row.ward_id],
                         DEPARTMENTS[row.department_id], DOCTORS[row.doctor_id]["name"], row.admission_date, row.status))
    return Response(output.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": 'attachment; filename="admitflow-patients.csv"'})
