from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
from uuid import NAMESPACE_URL, uuid5

from .catalog import DEPARTMENTS, DOCTORS, GENDERS, WARDS, utc_now
from .db import Department, Doctor, Patient, Session, Ward


def seed(demo=True):
    with Session.begin() as db:
        for model, catalog in ((Ward, WARDS), (Department, DEPARTMENTS), (Doctor, DOCTORS)):
            for key, value in catalog.items():
                if db.get(model, key) is None:
                    db.add(model(id=key, **(value if isinstance(value, dict) else {"name": value})))
            db.flush()
        if not demo:
            return
        names = (
            "Amara Patel", "Jonah Reed", "Maya Singh", "Hugo Martin",
            "Leena Rao", "Nikhil Bose", "Sana Khan", "Elias Brooks",
            "Omar Haddad", "Meera Kulkarni", "Avery Chen", "Tara Iyer",
            "Rohan Das", "Amina Yusuf", "Kiran Desai", "Nora Mendes",
            "Manu Nair", "Ishaan Bhat", "Elena Cruz", "Riya Sethi",
            "Noah Kim", "Anvi Shah", "Nadia Malik", "Kavya Joshi",
            "Sam Rivera", "Zoya Ansari", "Aditya Menon", "Mira Dsouza",
            "Nina Banerjee", "Arun Lewis", "Lina Thomas", "Dara Sen",
        )
        ward_departments = (
            ("general", "medicine"), ("private", "cardiology"), ("icu", "neurology"),
            ("emergency", "emergency"), ("pediatric", "pediatrics"), ("surgical", "surgery"),
            ("maternity", "obstetrics"), ("general", "orthopedics"),
            ("icu", "cardiology"), ("private", "medicine"), ("surgical", "orthopedics"),
        )
        day_offsets = (
            41, 38, 34, 32, 28, 26, 24, 23, 21, 19, 17, 16, 14, 13, 11, 10,
            9, 9, 8, 7, 6, 6, 5, 5, 4, 4, 4, 3, 2, 2, 1, 0,
        )
        doctors = {doctor["department_id"]: key for key, doctor in DOCTORS.items()}
        now = utc_now()
        local_zone = ZoneInfo("Asia/Kolkata")
        for index, (name, offset) in enumerate(zip(names, day_offsets, strict=True)):
            identifier = str(uuid5(NAMESPACE_URL, f"admitflow/demo/{index}"))
            if db.get(Patient, identifier):
                continue
            ward, department = ward_departments[index % len(ward_departments)]
            age = 2 + index % 15 if ward == "pediatric" else (
                22 + index % 14 if ward == "maternity" else 20 + index * 13 % 65
            )
            admission_date = now.astimezone(local_zone).date() - timedelta(days=offset)
            created_at = min(now, datetime.combine(admission_date, time(8, index), local_zone).astimezone(timezone.utc))
            discharged = offset >= 2 and (index % 3 == 0 or (ward == "emergency" and offset >= 10))
            discharged_at = created_at + timedelta(days=min(offset - 1, 1 + index % 5)) if discharged else None
            db.add(Patient(id=identifier, name=name, search_name=name.casefold(), age=age,
                           gender=GENDERS[index % len(GENDERS)], ward_id=ward,
                           department_id=department, doctor_id=doctors[department],
                           admission_date=admission_date, status="Discharged" if discharged else "Admitted",
                           created_at=created_at, updated_at=discharged_at or created_at,
                           discharged_at=discharged_at))



if __name__ == "__main__":
    import sys
    seed(demo="--lookups-only" not in sys.argv)
