from datetime import timedelta
from uuid import NAMESPACE_URL, uuid5

from .catalog import DEPARTMENTS, DOCTORS, GENDERS, WARDS, today, utc_now
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
        first_names = ("Amara", "Jonah", "Maya", "Hugo", "Leena", "Nikhil", "Sana", "Elias")
        last_names = ("Patel", "Reed", "Singh", "Kapoor")
        now = utc_now()
        for index in range(32):
            identifier = str(uuid5(NAMESPACE_URL, f"admitflow/demo/{index}"))
            if db.get(Patient, identifier):
                continue
            name = f"{first_names[index % 8]} {last_names[index // 8]}"
            discharged = index % 3 == 0
            db.add(Patient(id=identifier, name=name, search_name=name.casefold(), age=5 + index * 2,
                           gender=GENDERS[index % 4], ward_id=list(WARDS)[index % len(WARDS)],
                           department_id=list(DEPARTMENTS)[index % 8], doctor_id=f"doctor-{index % 8 + 1}",
                           admission_date=today() - timedelta(days=index % 13),
                           status="Discharged" if discharged else "Admitted",
                           created_at=now, updated_at=now, discharged_at=now if discharged else None))


if __name__ == "__main__":
    import sys
    seed(demo="--lookups-only" not in sys.argv)
