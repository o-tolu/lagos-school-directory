# AGENTS.md

Lagos Schools CRM: React (Vite) frontend + Express API + PostgreSQL. Fully local; no third-party backend.

- `src/` frontend. Data access goes through `src/api/client.js`; app state lives in `src/lib/CrmContext.jsx`.
- `server/` Express API. `server/entities.js` declares every table the API exposes; `server/routes/entities.js` is the generic CRUD + live-update (SSE) layer; `server/migrations/*.sql` is the schema (add a new numbered file for any schema change).
- `scripts/seed.js` imports `data/lagos_schools.xlsx` (idempotent upsert).
- Auth is open access; the hooks for login/roles are `server/middleware/auth.js`, `src/lib/AuthContext.jsx`, `src/components/ProtectedRoute.jsx`.
- Run: `npm run dev` (API + web). Checks: `npm run lint`, `npm run build`.
