# RESQ AI – Command Dashboard (UI prototype)
All data is simulated (`src/data/mock.ts`). Recommendations come from a transparent rule in `src/lib/recommend.ts`, not a trained model.
    npm install && npm run dev
FastAPI hook-up: replace the functions in `src/services/api.ts` and load state in `App.tsx` from them. Types in `src/types.ts` map to Pydantic models.
