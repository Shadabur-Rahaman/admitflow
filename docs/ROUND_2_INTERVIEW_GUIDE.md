# Round 2 interview guide

**Why React, FastAPI and PostgreSQL?** React keeps the drawer, directory and navigation reusable. FastAPI provides request validation and OpenAPI documentation from typed endpoint code. PostgreSQL persists the data independently of frontend refreshes or API redeployments and enforces relational constraints.

**What happens when someone admits a patient?** In `frontend/src/forms.tsx`, React Hook Form collects the input and Zod validates it. After that succeeds, `api` in `frontend/src/api.ts` sends JSON to `POST /api/v1/patients`. Pydantic validates the JSON in `backend/app/schemas.py`. The endpoint checks catalog choices and doctor compatibility, then commits with a SQLAlchemy session. A confirmed response closes the drawer and invalidates the patient, dashboard and report queries in `frontend/src/App.tsx`.

**Why validate twice?** The browser provides immediate messages and feedback. The API applies the rules to every caller. Database constraints cover age, gender, foreign keys and discharge consistency even when an operation bypasses the API.

**How do search and filters work?** The directory debounces the name input for 300 ms and stores filters in the URL. `Filters` builds parameterized SQLAlchemy predicates. Search uses a normalized casefolded name column and escapes wildcard characters. Filters combine with AND. Picked sorting is allowlisted, and the list clamps the page after counting matching rows.

**How is discharge different from delete?** Discharge transitions an admitted patient with one conditional SQL update, records a timestamp and retains the patient. A later discharge returns 409. Deletion removes the row only after the user confirms.

**How do migrations and persistence work?** Alembic tracks the schema revision in the database. Run `alembic upgrade head` before serving requests. `app.db` uses an environment-supplied URL or local SQLite. Session commits write to the configured database.

**How do deployment settings stay private?** `DATABASE_URL` is backend-only and stored in the deployment environment. `VITE_API_BASE_URL` is deliberately public. The CORS middleware accepts the configured frontend origins, and production database access is independent of the browser.

**How does the UI adapt?** `frontend/src/style.css` switches the directory to patient cards and enables bottom navigation at tablet widths. The admission drawer gets full-screen treatment on narrow layouts. The native dialog handles modal focus containment and the styles respect reduced-motion preferences.

**What do the checks cover?** `backend/tests/test_api.py` exercises admission, search, filters, validation, discharge, deletion, reporting, seeding and persistence with an isolated SQLite database. Vitest targets the form and Playwright exercises combined workflows and viewport widths.

## Practice changes

| Task | Starting point |
| --- | --- |
| Add a ward or department | Update `backend/app/catalog.py`, then seed lookups. For a new department, add a compatible doctor. |
| Add a patient filter | Add a parameter and SQL predicate to `Filters`, then add the URL key and control in `Directory`. |
| Change the maximum age | Update `PatientInput`, add a database constraint migration, change the Zod rule and input limits, and update boundary tests. |
| Add a dashboard metric | Update `summarize`, the TypeScript `Summary` type and `Metrics`. |
| Add a validation rule | Update the Pydantic schema and Zod schema and add matching tests. |
| Change a directory column | Update `PatientRows`, the header and the mobile label treatment. |
| Change admission-date sorting | Trace the `admission_date` header in `PatientRows` through `Directory` to the allowlist in the patients endpoint. |

For a real hospital deployment, design identity and roles, audit logging, privacy and retention controls, operational recovery and jurisdiction-specific compliance before collecting confidential data.

In production, Vercel runs verify-hosted-api.mjs before compilation. Render requires PostgreSQL and runs Alembic and catalog initialization before Uvicorn starts.
