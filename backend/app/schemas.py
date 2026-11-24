import re
import unicodedata
from datetime import date, datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .catalog import today

Gender = Literal["Male", "Female", "Other", "Prefer not to say"]
Status = Literal["Admitted", "Discharged"]


class PatientInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    age: int = Field(strict=True, ge=0, le=120)
    gender: Gender
    ward_id: str = Field(max_length=40)
    department_id: str = Field(max_length=40)
    doctor_id: str = Field(max_length=40)
    admission_date: date

    @field_validator("name")
    @classmethod
    def clean_name(cls, value):
        value = unicodedata.normalize("NFC", value.strip())
        if not 1 <= len(value) <= 120 or not all(
            word.isalpha() for word in value.split(" ") if word
        ) or not any(char.isalpha() for char in value):
            raise ValueError("Enter a name with letters and spaces only (up to 120 characters).")
        return value

    @field_validator("admission_date", mode="before")
    @classmethod
    def check_format(cls, value):
        if not isinstance(value, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", value):
            raise ValueError("Use a date in YYYY-MM-DD format.")
        return value

    @field_validator("admission_date")
    @classmethod
    def check_date(cls, value):
        if value > today():
            raise ValueError("Admission date cannot be in the future.")
        return value


class PatientView(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    age: int
    gender: Gender
    ward_id: str
    department_id: str
    doctor_id: str
    admission_date: date
    patient_code: str
    id: str
    status: Status
    created_at: datetime
    updated_at: datetime
    discharged_at: datetime | None



    @field_validator("created_at", "updated_at", "discharged_at")
    @classmethod
    def encode_timestamp(cls, value):
        # SQLite stores wall time without an offset; application writes always use UTC.
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
