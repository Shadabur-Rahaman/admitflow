# DScribe final submission checklist

**HOLD — DEPLOYMENT INCOMPLETE**

| Requirement | Implementation | Evidence |
| --- | --- | --- |
| React frontend and Python FastAPI backend | `frontend/src`, `backend/app` | Local build and test suites. |
| Persistent PostgreSQL | SQLAlchemy, Alembic, dedicated Neon project | Neon SQL editor returned revision 0001, 32 patients and 11 discharged. Live API persistence after restart and redeploy pending. |
| Patient fields and validation | Admission form, Pydantic schemas and database constraints | Local valid and invalid age, name, date and lookup tests. |
| Add, list, edit and delete | Directory, form, confirmation dialog, patient API | Local backend tests and Chromium workflow. |
| Case-insensitive search and combined ward, department and doctor filters | URL-backed filter controls and SQLAlchemy predicates | Local backend tests and Chromium workflow. |
| Mark discharged and refresh metrics | Dedicated discharge endpoint and query invalidation | Local backend tests and Chromium workflow. |
| Details, cancel deletion and refresh persistence | Details drawer, dialog and persisted storage | Local Chromium workflow. |
| Mobile and tablet UI | Responsive CSS, patient cards and mobile navigation | Baseline Chromium checks from 320 px to 1920 px, with desktop and mobile captures. |
| Public GitHub repository and source | [AdmitFlow repository](https://github.com/Shadabur-Rahaman/admitflow) | Public repository created. Source push and signed-out access check pending. |
| Live frontend, backend and API documentation | Vercel and Render configurations | Deployment and unauthenticated acceptance pending. |
| README, images, CI and interview guide | Included in the release checkout | Local files reviewed. |
| Reply All submission | `SUBMISSION_EMAIL.md` | Draft only. Verify original sender and insert live URL after acceptance. |
