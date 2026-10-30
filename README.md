# RESQ AI

RESQ AI is a disaster report verification and emergency resource coordination **demonstration prototype**. It is not connected to emergency services, government systems, live maps, or real responder locations. All preloaded incidents, resources, and route changes are synthetic.

## Start the application

Requirements: Node.js 20.19+ (or 22.12+) and Python 3.10+.

Open two PowerShell terminals.

**Backend terminal**

```powershell
cd "C:\Users\AIMON SHAIKH\my-project\backend"
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend terminal**

```powershell
cd "C:\Users\AIMON SHAIKH\my-project"
npm install
npm run dev
```

Open the Vite URL printed in the frontend terminal (normally `http://localhost:5173`). The coordinator dashboard opens at `/dashboard`; citizen reporting is at `/report`. API docs are at `http://localhost:8000/docs`.

If internet access is restricted, the current project dependencies and Vite build are already checked in via `package-lock.json` and `node_modules` in this workspace. Start the frontend directly with `npm run dev`. For an offline citizen report, the browser stores a unique client ID in IndexedDB (and a localStorage fallback); it remains pending on this device until retry succeeds. This is not a delivered emergency report.

## Demo walkthrough

1. Start both servers.
2. Open `/dashboard` and choose **Load demo scenario**. Five synthetic reports and seven simulated resources are created in SQLite.
3. Open **Live Incidents**, select a report, review extracted fields, run duplicate detection, and set its verification status.
4. Open **Resource Allocation**, generate a plan, then explicitly approve an assignment. Availability is checked again by the API before assignment.
5. Open `/report` in a second tab and submit a report. It appears in the dashboard after successful synchronization.
6. From the API, `POST /api/demo/simulate-route-change` with `{ "resource_id": "RES-..." }` marks a resource unavailable; regenerate recommendations. Route data and travel times are not live.
7. Use **Reset demo** to restore the original synthetic dataset.

## Architecture and features

- React/Vite operations dashboard and mobile citizen reporting portal.
- FastAPI REST backend with Pydantic validation and SQLAlchemy/SQLite storage.
- Rule-based extraction; token-set similarity plus category/location/time cues for duplicate candidates; explainable 0–100 priority scoring.
- Greedy priority-ordered resource matching, capability checks, and server-side availability validation. Human approval is always required.
- SHA-256 evidence metadata and file consistency checks; a matching hash does not prove image authenticity or report truth.
- Audit timeline for reports, verification, corrections, scoring, assignments, evidence, and simulation actions.
- IndexedDB/localStorage pending queue, client-generated IDs, idempotent report submission, online retry, and service-worker shell caching.

## Configuration

Copy `.env.example` to `.env` at the project root and `backend/.env.example` to `backend/.env` as needed. Backend environment variables:

- `DATABASE_URL` (defaults to local `backend/resq.db`)
- `CORS_ORIGINS` (comma-separated; defaults to localhost Vite origins)
- `DUPLICATE_THRESHOLD` (defaults to `0.52`)

Frontend variable `VITE_API_BASE_URL` defaults to `http://localhost:8000/api`.

## Tests and build

```powershell
cd "C:\Users\AIMON SHAIKH\my-project\backend"
pytest -q
cd ..
npm run build
```

## Limitations and safety

- This prototype does not contact emergency services. For a real emergency, contact the appropriate official emergency service.
- AI extraction and duplicate detection are deterministic fallbacks. Sentence Transformers and faster-whisper are not enabled; there is no fabricated transcription.
- Map presentation is illustrative and uses a local simulation canvas. OpenStreetMap live tiles, routing, and real geocoding are not connected; travel time remains unknown.
- Offline reports are only on the submitting browser/device until the API acknowledges them. The service worker caches the app shell, not a reliable offline map.
- Evidence uploads are size- and extension-limited and stored privately under the backend folder. A matching hash only means the checked bytes match the recorded hash.
- Audit history is a prototype log and is not tamper-proof. There is no coordinator authentication/authorization, rate limiting, formal retention policy, or production security review.
- The existing Vite starter was JavaScript; the dashboard remains JSX rather than TypeScript. Styling uses a local CSS design system and inline SVG icons to keep the app buildable when package downloads are restricted. React Leaflet and shadcn/ui are not wired into this prototype.
- The priority score and allocation rules are demonstration logic, not operationally validated.

See [docs/architecture.md](docs/architecture.md), [docs/api-contract.md](docs/api-contract.md), and [docs/testing.md](docs/testing.md).
