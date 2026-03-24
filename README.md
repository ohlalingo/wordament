CyberWordament Backend (Production)
===================================

Overview
--------
- Location: `backend_prod`
- Stack: Node.js + Express (ESM), TypeScript -> `dist`; PostgreSQL via `pg` and TypeORM entities (for AdminJS) alongside raw SQL.
- Port: 4000 (hardcoded in `src/server.ts`).
- Assets: bundled fallback puzzles under `backend_prod/puzzles/{crossword,wordsearch,unjumble}/demo.json`.
- Backups/dumps: `backend_prod/db` (local artifacts), root-level `backup.sql` and `schema.sql`.

Environment
-----------
- DB: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`
- Admin: `ADMIN_EMAIL` (required for email check), `ADMIN_PASSWORD` (default "password123" if unset), `ADMIN_TOKEN` (shared header), `ADMIN_COOKIE_SECRET` (session)

Server behavior
---------------
- Entry: `src/server.ts`
  - Middleware: CORS, JSON body, `trust proxy`, rate limits on `/auth` (100/15m) and `/attempt` (200/15m).
  - Routes: `/puzzle`, `/auth`, `/attempt`, `/leaderboard`, `/admin` (REST), AdminJS UI at `/admin`.
  - Health: `GET /` -> `{ message: "CyberWordament backend is running" }`.
  - AdminJS bootstrapped via `buildAdminRouter` (see below).

Routes (REST)
-------------
- Auth (`src/routes/auth.ts`)
  - `POST /auth/signup` – create user with scrypt hash; accepts name/email/password and optional region/language.
  - `POST /auth/signin` – verify scrypt hash; returns user (no JWT).
  - `POST /auth/set-password` – one-time password set for legacy accounts missing a hash.
  - `PATCH /auth/profile/:id` – update name/region/language.
- Puzzles (`src/routes/puzzle.ts`)
  - `GET /puzzle/today?lang=` – today (UTC) puzzles grouped by type; supports multiple slots per type.
  - `GET /puzzle/:date?lang=` – puzzles for a specific YYYY-MM-DD date.
  - `GET /puzzle/export?date=&lang=` – export grouped by date/type/lang.
  - `GET /puzzle/demo?lang=` – latest available day, falling back to bundled JSON.
  - `POST /puzzle/upload` (adminAuth) – upsert by date/type/lang/slot; strips reserved fields from content.
- Attempts (`src/routes/attempt.ts`)
  - `POST /attempt` – body `{ userId, puzzleContentId, correctWords, timeTaken }`; enforces single attempt per (user, puzzle_content), validates optional `timeLimit` in content; score = correctWords.
- Leaderboard (`src/routes/leaderboard.ts`)
  - `GET /leaderboard` – top 20 global (correct_words desc, time asc).
  - `GET /leaderboard/regional-champions` – top per region for today, past 7 days, all time (uses puzzle_date and attempt created_at).
  - `GET /leaderboard/user-stats/:userId` – puzzles completed, best time, current streak (consecutive days ending today).
- Admin REST (`src/routes/admin.ts`, guarded by adminAuth)
  - Users: list (`/admin/users?page=&limit=`), delete (`/admin/users/:id`).
  - Puzzles: list days/types, get/update/delete by contentId, bulk import (`/admin/import-puzzle`), patch puzzle metadata/content.
  - Attempts: list paged (`/admin/attempts?page=&limit=`).

AdminJS
-------
- Implementation: `src/admin/admin.ts` with entities in `src/admin/entities.ts`.
- Features: custom dashboard stats, custom create-puzzle form, custom login page; branding/theme set.
- Boot-time DB hardening: adds/normalizes `language`/`slot` columns, unique indexes, and import_requests table/columns.
- Auth:
  - UI at `/admin` using email/password (`ADMIN_EMAIL` + `ADMIN_PASSWORD`, default pw is weak).
  - API guards also allow `x-admin-token` or `x-user-id` whose email matches `ADMIN_EMAIL` (via `adminAuth` middleware).

Database schema
---------------
From `schema.sql` plus runtime migrations:
- `users(id PK, name, email UNIQUE, region, language, created_at, password_hash added at runtime)`
- `puzzles(id PK, puzzle_date UNIQUE date)`
- `puzzle_types(id PK, type_name UNIQUE)`
- `puzzle_content(id PK, puzzle_id FK, puzzle_type_id FK, content jsonb, language varchar default 'en', external_id varchar, slot int default 1, UNIQUE (puzzle_id, puzzle_type_id, language, slot))`
- `puzzle_attempts(id PK, user_id FK, puzzle_content_id FK, correct_words int, score int, time_taken int, created_at timestamp default now())`
- `import_requests` (admin import payload storage; columns for date and crossword/wordsearch/unjumble JSON)

Scripts
-------
- `npm run dev` – `tsx watch src/server.ts`
- `npm run build` – `tsc` -> `dist`
- `npm start` – `node dist/server.js`
- `npm run import:puzzles path/to/file.json` – `src/scripts/import-puzzle-content.ts` (TypeORM upsert, language normalization, stores `sourceId`)
- SQL helper: `src/scripts/backfill-scores.sql` (manual migration)

Local development
-----------------
1) `cd backend_prod && npm install`
2) Ensure Postgres running; create DB via `schema.sql` (or rely on AdminJS to add missing columns/indexes).
3) Export env vars (DB + ADMIN_*).
4) `npm run dev` (port 4000). Production: `npm run build && npm start`.

Deployment notes
----------------
- Reverse proxy should forward `X-Forwarded-*` (app sets `trust proxy`).
- Rate limits on `/auth` and `/attempt` are enabled; adjust in `src/server.ts` if necessary.
- Time handling: “today” uses UTC; uploads normalize dates to YYYY-MM-DD; leaderboard streaks use UTC date slices.
- Content sanitation: reserved keys (id/date/language) stripped before persistence to avoid collisions.
- Security gaps: no JWT/CSRF; client expiry is honored only client-side; default `ADMIN_PASSWORD` is weak—set real secrets in production.

Handy commands
--------------
- Import puzzles (admin token):  
  `curl -XPOST http://localhost:4000/admin/import-puzzle -H "x-admin-token: $ADMIN_TOKEN" -H "Content-Type: application/json" -d @puzzles.json`
- Export puzzles:  
  `curl "http://localhost:4000/puzzle/export?date=2025-01-01&lang=en"`
- Set legacy password:  
  `curl -XPOST http://localhost:4000/auth/set-password -H "Content-Type: application/json" -d '{"email":"user@example.com","password":"NewPass123"}'`

Open issues / TODO
------------------
- Replace default admin password; consider JWT-based auth and CSRF protection.
- Add formal migrations (e.g., via TypeORM migrations or drizzle); current schema changes rely on bootstrap SQL.
- Clarify canonical backup (`backup.sql` vs `backend_prod.zip`) for prod restores. 
