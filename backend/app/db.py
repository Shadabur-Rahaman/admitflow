import os
from datetime import date, datetime
from uuid import uuid4

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, ForeignKeyConstraint, String, UniqueConstraint, create_engine, event
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

database_url = os.getenv("DATABASE_URL", "sqlite:///./admitflow.db")
if database_url.startswith(("postgresql://", "postgres://")):
    database_url = "postgresql+psycopg://" + database_url.split("://", 1)[1]

if os.getenv("REQUIRE_POSTGRES") == "1" and not database_url.startswith("postgresql+psycopg://"):
    raise RuntimeError("Set DATABASE_URL to a PostgreSQL connection string.")

engine = create_engine(database_url, pool_pre_ping=True)
if engine.dialect.name == "sqlite":
    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")

Session = sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class Ward(Base):
    __tablename__ = "wards"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(100))


class Department(Base):
    __tablename__ = "departments"
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(100))


class Doctor(Base):
    __tablename__ = "doctors"
    __table_args__ = (UniqueConstraint("id", "department_id"),)
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    department_id: Mapped[str] = mapped_column(ForeignKey("departments.id"))


class Patient(Base):
    __tablename__ = "patients"
    __table_args__ = (
        CheckConstraint("age BETWEEN 0 AND 120"),
        CheckConstraint("gender IN ('Male', 'Female', 'Other', 'Prefer not to say')"),
        CheckConstraint("(status = 'Admitted' AND discharged_at IS NULL) OR (status = 'Discharged' AND discharged_at IS NOT NULL)"),
        ForeignKeyConstraint(["doctor_id", "department_id"], ["doctors.id", "doctors.department_id"]),
    )
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name: Mapped[str] = mapped_column(String(120), index=True)
    search_name: Mapped[str] = mapped_column(String(360), index=True)
    age: Mapped[int]
    gender: Mapped[str] = mapped_column(String(20))
    ward_id: Mapped[str] = mapped_column(ForeignKey("wards.id"), index=True)
    department_id: Mapped[str] = mapped_column(ForeignKey("departments.id"), index=True)
    doctor_id: Mapped[str] = mapped_column(String(40), index=True)
    admission_date: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(12), index=True, default="Admitted")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    discharged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


    @property
    def patient_code(self):
        return "PT-" + self.id.replace("-", "").upper()
