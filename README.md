# AdmitFlow

AdmitFlow manages a hospital admissions queue for the DScribe Round 1 assignment. It uses React and TypeScript, a FastAPI REST API, and PostgreSQL in production. Local development defaults to SQLite.

**Sample records only. Never enter real patient information.**

[Open AdmitFlow](https://shadabur-rahaman.github.io/admitflow/#/) · [API documentation](https://admitflow-api.onrender.com/docs)

## Features

- Admit, view, edit, discharge and permanently delete fictional patients. Discharge and deletion require confirmation.
- Search names and combine ward, department, doctor, status and admission-date filters. The API handles sorting and pagination.
- View the hospital overview, ward activity and date-filtered reports. Export the matching records as CSV.
- Enter data in a keyboard-accessible drawer with frontend and API validation.
- Use Light, Dark, or System appearance. The preference is stored on your device.

## Screenshots

The screenshots use a freshly seeded SQLite database with fictional admissions.

![AdmitFlow hospital overview](screenshots/desktop-overview.png)

- [Patient directory](screenshots/desktop-patients.png), [date filters](screenshots/admission-filters.png), and [patient details](screenshots/patient-details.png)
- [Ward board](screenshots/ward-management.png) and [reports](screenshots/reports.png)
- [New admission](screenshots/admission-drawer.png) and [confirmation](screenshots/confirmation.png)
- [Tablet overview](screenshots/tablet-overview.png), [mobile overview](screenshots/mobile-overview.png), and [mobile patient directory](screenshots/mobile-patients.png)
- [Dark overview](screenshots/dark-overview.png) and [dark admission drawer](screenshots/dark-admission-drawer.png)

## Local setup

Use Python 3.12 and Node 22 or later. In one terminal:

```powershell
cd backend
python -m pip install -r requirements.txt
alembic upgrade head
python -m app.seed
python -m uvicorn app.main:app --port 8000
```

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open [the local UI](http://localhost:5173) and [OpenAPI docs](http://localhost:8000/docs). The seed command adds 32 deterministic fictional patients and inserts missing catalog records without updating existing patients. Use `python -m app.seed --lookups-only` for catalog initialization.

## Architecture

React Router resolves the page and URL filters. TanStack Query loads API data and invalidates affected query keys following mutations. React Hook Form and Zod validate the drawer. FastAPI independently validates input with Pydantic, then SQLAlchemy runs the database operation. The patient table references wards and departments, and a composite foreign key enforces that the assigned doctor belongs to the selected department. Discharge is an atomic conditional update and retains the record. Alembic owns the schema.

## Checks

Run `python -m pytest -q` from `backend`, then `npm test` and `npm run build` from `frontend`. With both local servers running, run `npx playwright install chromium` and `npx playwright test` from `frontend`. Set `PLAYWRIGHT_BASE_URL` to test a different environment containing fictional data.

## Deploy

GitHub Actions builds the frontend for GitHub Pages under the repository base path. Set the repository Actions variable `VITE_API_BASE_URL` to the public HTTPS Render origin.

Render uses the existing `render.yaml` blueprint. Set its `DATABASE_URL` secret to the AdmitFlow Neon connection string and `ALLOWED_ORIGINS` to the Pages origin without the repository path. The start command runs Alembic and initializes catalog lookups before serving. The seeded patient records are separate from catalog initialization.

Use [API readiness](https://admitflow-api.onrender.com/ready) to check database connectivity. The public demo uses its existing database, so its records may differ from the screenshots.

The public demonstration has no login. Access control, audit trails, retention controls and operational safeguards would be required before a deployment handling real patient information.

See the [Round 2 interview guide](docs/ROUND_2_INTERVIEW_GUIDE.md).
