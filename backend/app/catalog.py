from datetime import datetime, timezone
from zoneinfo import ZoneInfo

WARDS = dict(general="General Ward", private="Private Ward", icu="ICU",
             emergency="Emergency Ward", pediatric="Pediatric Ward",
             surgical="Surgical Ward", maternity="Maternity Ward")
DEPARTMENTS = dict(medicine="General Medicine", cardiology="Cardiology", neurology="Neurology",
                   orthopedics="Orthopedics", pediatrics="Pediatrics", emergency="Emergency Medicine",
                   surgery="General Surgery", obstetrics="Obstetrics and Gynecology")
DOCTORS = {
    f"doctor-{i}": {"name": f"Dr. {name}", "department_id": department}
    for i, (department, name) in enumerate(zip(DEPARTMENTS, [
        "Mira Sen", "Arjun Rao", "Tara Das", "Dev Shah", "Nila Roy",
        "Sara Khan", "Ravi Jain", "Ira Bose"
    ]), 1)
}
GENDERS = ("Male", "Female", "Other", "Prefer not to say")


def today():
    return datetime.now(ZoneInfo("Asia/Kolkata")).date()


def utc_now():
    return datetime.now(timezone.utc)


def lookups():
    return {"wards": WARDS, "departments": DEPARTMENTS, "doctors": DOCTORS, "genders": GENDERS}
