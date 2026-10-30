# Testing

Run backend tests with `cd backend; pytest -q`. They exercise health disclaimer, report creation/retrieval/idempotency, duplicate prompts, scoring, corrections, verification, audit, demo reset/load, and assignment availability checks. Run the production frontend compiler with `npm run build` from the project root.

The offline queue uses IndexedDB with localStorage fallback and client report IDs. Browser automation is not configured, so offline mode, service-worker behavior, and the coordinator workflow still need manual browser QA. Test fixture data is synthetic and uses the local SQLite database configured by `DATABASE_URL`.
