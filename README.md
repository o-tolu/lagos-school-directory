# Lagos Schools CRM

Directory of ~5,100 Lagos private schools with sales-team assignment and outreach tracking.
React (Vite) + Express + PostgreSQL. Runs entirely on your own machine. Changes appear instantly in every open tab (and any device on your network) through a live Server-Sent Events stream.

## Requirements
- Node.js 20.11 or newer
- PostgreSQL (any recent version, 13+)

## First-time setup
1. Create an empty database, e.g. in psql: `CREATE DATABASE lagos_schools_crm;`
2. `npm install`
3. Copy `.env.example` to `.env` and set `DATABASE_URL` (e.g. `postgresql://postgres:PASSWORD@localhost:5432/lagos_schools_crm`).
4. `npm run seed`: creates the tables and imports the 5,102 schools from `data/lagos_schools.xlsx`.
5. `npm run dev`: starts the API (port 3001) and the web app. Open the URL Vite prints (normally http://localhost:5173).

## Everyday commands
| Command | What it does |
|---|---|
| `npm run dev` | API (auto-restart) + Vite dev server together |
| `npm run build` then `npm start` | Production style: one server on http://localhost:3001 serving the built app + API |
| `npm run seed` | (Re)import schools from the Excel file. Safe to repeat: existing schools are updated by School ID, assignments, contact edits and manually added schools are kept |
| `npm run seed -- path/to/new.xlsx` | Import a different/updated Excel file (same columns) |
| `npm run migrate` | Apply new schema files in `server/migrations/` (also runs automatically at start-up) |
| `npm run lint` | Lint the code |

## Using it from other devices (optional)
Set `HOST=0.0.0.0` in `.env`, run `npm run build && npm start`, allow port 3001 through the Windows firewall, and open `http://<your-PC-IP>:3001` from the other device. Note there is no login yet: anyone on your network could use it.

## Backups
`pg_dump -U postgres lagos_schools_crm > backup.sql` and restore with `psql -U postgres lagos_schools_crm < backup.sql`.

## Project layout
```
server/                 Express API
  index.js              app start-up, SSE endpoint, static serving of dist/
  entities.js           the tables/fields the API exposes (add new ones here)
  routes/entities.js    generic CRUD, bulk insert, bulk delete, cascades, live events
  middleware/auth.js    auth hook (open access today)
  migrations/*.sql      database schema
scripts/seed.js         Excel -> PostgreSQL import
src/                    React app (src/api/client.js is the only place that talks to the API)
data/                   source Excel file
```

## Adding login / roles later
The pieces are already in place and switched off:
- `users` table (with `role` admin/user) exists in the first migration.
- `server/middleware/auth.js`: implement `authenticate` (verify a session cookie/JWT, set `req.user`) and set `AUTH_ENABLED=true`. Routes already call `requireRole(...)`.
- Frontend: `src/lib/AuthContext.jsx` already loads `/api/auth/me`; add a `/login` page and wrap the routes in `<ProtectedRoute>` (`src/components/ProtectedRoute.jsx`).

## Notes and limitations
- Live updates are in-process: run a single API server instance (fine for a small team). Scaling to several instances would need PostgreSQL LISTEN/NOTIFY.
- The "Export Excel" button writes an HTML-table `.xls` file (unchanged from the original build); Excel may show a format warning when opening it.
