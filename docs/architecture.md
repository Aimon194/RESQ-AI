# Architecture

The Vite client calls the FastAPI service through `src/App.jsx` and uses IndexedDB for retryable local reports. SQLite stores immutable report narratives, extracted JSON, human corrections, resources, assignments, evidence metadata, and audit events. API mutations create audit entries in the same transaction where practical.

```text
Citizen browser ── IndexedDB queue / service worker
        │ REST + idempotent report ID
        ▼
React/Vite ── FastAPI + Pydantic ── SQLAlchemy ── SQLite
                                      ├─ extraction + scoring
                                      ├─ duplicate candidates
                                      ├─ resource allocation
                                      ├─ evidence SHA-256
                                      └─ audit history
```

Extraction and priority are deterministic rules. Duplicate detection uses token Jaccard similarity with category, proximity, and time cues; it flags candidates for a coordinator and never merges reports. Resource matching sorts open incidents by priority and greedily reserves compatible available resources for recommendations. Approval rechecks live database availability. A route change is simulated, and no routing/travel time is inferred.

All demo scenario records and coordinates are fictional examples. This is a decision-support prototype, not an emergency dispatch system.
