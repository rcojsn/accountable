# Plan: building the Accountable MVP

This plan builds what `docs/spec.md` describes, for the outcome in `docs/intent.md`. The spec says *what*; this plan says *in what order, with which files, and how we know it works*. Requirement numbers (REQ-n) refer to the spec. The visual reference is `docs/mockups/b-open-plan/`.

The work runs in 10 phases (0 to 9). Each phase ends with `npm test` passing, `docs/STATUS.md` updated and a commit on the `mvp` branch. No phase starts until the one before it is done.

## Files that change

### Existing files

| File | Change |
|---|---|
| `.gitignore` | Add `backend/data/` and `e2e/.data/` (databases), and `frontend/dist/` |
| `docs/STATUS.md` | After each phase: what's done. From phase 0: prerequisites and how to run, test and reset |
| `docs/spec.md` | Only if the build finds a gap; any change is noted in `docs/STATUS.md` |
| `README.md`, `course/`, `AGENTS.md`, `docs/intent.md` | No change |

### New files: root and tooling

| File | Purpose |
|---|---|
| `package.json` | Root scripts `dev`, `seed`, `test` (plus `test:web`, `test:api`, `test:e2e`); workspace `frontend`; dev dependency `@playwright/test` |
| `package-lock.json` | Locked npm dependencies |
| `pyproject.toml` | Python project `accountable`, Python `>=3.12,<3.13`; dependencies FastAPI, Uvicorn, SQLAlchemy 2, Pydantic 2; dev group pytest, httpx; built with hatchling from `backend/accountable` so `python -m accountable.seed` works from anywhere; pytest settings (`testpaths = ["backend/tests"]`) |
| `uv.lock` | Locked Python dependencies |
| `.python-version` | `3.12`, so uv installs and uses the right Python |
| `scripts/dev.mjs` | The `npm run dev` launcher, Node built-ins only (REQ-1): run `npm install` if `node_modules` is missing, run `uv sync`, start the backend and frontend, wait until both answer, open the browser, stop both on Ctrl+C on every platform |
| `scripts/test.mjs` | The `npm test` runner: Vitest, then pytest, then Playwright; stops at the first failure and exits non-zero (REQ-5) |

### New files: backend (`backend/accountable/`)

| File | Purpose |
|---|---|
| `__init__.py` | Package marker |
| `config.py` | Settings from environment: `ACCOUNTABLE_DB` (default `backend/data/accountable.db`), `ACCOUNTABLE_TEST_MODE` (enables the test reset endpoint) |
| `db.py` | Engine, `MetaData` and the four tables with keys, cascades, check constraint and indexes; connection listener that sets `foreign_keys=ON`, `journal_mode=WAL`, `busy_timeout=5000`; `create_schema()`, `reset_schema()` |
| `clock.py` | `today()` and `now()`, the only place the app reads the date (REQ-19), so tests can fix it |
| `rules.py` | Stage list and order, fixed probabilities (REQ-14), open stages, `is_late` (REQ-17), follow-up state (REQ-18), expected revenue (REQ-20), the 30-day closed window (REQ-61), `apply_stage_change()` (REQ-15, REQ-16) |
| `schemas.py` | Pydantic models for every request and response; required fields and limits (REQ-10 to REQ-13, REQ-21) |
| `repo.py` | SQLAlchemy Core queries shared by the routers: list with counts, get with links, delete impact, timelines, board placement |
| `routers/organizations.py`, `routers/contacts.py`, `routers/deals.py`, `routers/activities.py` | CRUD, `delete-impact`, timelines, `POST /api/deals/{id}/move` |
| `routers/dashboard.py` | `GET /api/dashboard` (REQ-71 to REQ-77) |
| `routers/system.py` | `GET /api/health`; `POST /api/test/reset?size=sample|large|empty`, mounted only in test mode |
| `main.py` | `create_app()`: lifespan creates the schema and seeds a new database (REQ-1), mounts routers under `/api`, 404/409 handlers |
| `seed.py` | Sample data (REQ-80 to REQ-83) and a `large` generator at the REQ-6 sizes; `python -m accountable.seed [--large]` |
| `seed_data.py` | The fixed lists of fictional South African companies, people, industries and deal names the seed draws from |

### New files: backend tests (`backend/tests/`)

`conftest.py` (temporary database per test, fixed clock, `client` fixture), `test_rules.py`, `test_organizations.py`, `test_contacts.py`, `test_deals.py`, `test_activities.py`, `test_move.py`, `test_timelines.py`, `test_delete.py`, `test_dashboard.py`, `test_seed.py`, `test_persistence.py`, `test_performance.py`. Their cases are listed under Proof.

### New files: frontend (`frontend/`)

| File | Purpose |
|---|---|
| `package.json`, `vite.config.ts`, `tsconfig*.json`, `index.html` | Vite + React + TypeScript; dev server proxies `/api` to the backend port from `ACCOUNTABLE_API_PORT` (default 8000); Vitest config (jsdom) |
| `src/main.tsx`, `src/App.tsx` | Fonts, styles, Query client, router, routes: `/`, `/pipeline`, `/deals`, `/deals/:id`, `/contacts`, `/contacts/:id`, `/organizations`, `/organizations/:id` |
| `src/styles/app.css` | Tailwind v4 import and the brand tokens from the spec's Design tokens table as `@theme` variables |
| `src/api/client.ts` | Typed `fetch` wrapper; turns 422 responses into field errors |
| `src/api/types.ts` | Types matching `schemas.py` |
| `src/api/hooks.ts` | TanStack Query hooks for every endpoint; mutations invalidate deals, organizations, contacts, timelines and dashboard so every screen stays current (REQ-78) |
| `src/lib/format.ts` | `R12,500`, `R12.5k`, `R1.2M`, `21 Nov 2026`, `21 Nov`, `15:40`, relative times |
| `src/lib/rules.ts` | Same rules as `rules.py` for the browser: probabilities, late, open stages, 30-day window, expected revenue, column and board totals |
| `src/lib/board.ts` | Pure functions for the board: group deals into columns, apply a move locally, find `before_id` for a drop (the risky logic, kept out of components so it can be unit-tested) |
| `src/lib/stages.ts` | Stage names, colours, badge colours, tints (spec concern 3 and Design tokens) |
| `src/components/layout/Sidebar.tsx`, `PageHeader.tsx` | Mockup B layout: floating white sidebar with counts, page header with eyebrow and main action |
| `src/components/ui/` | `Button`, `Panel`, `Badge`, `StageBadge`, `LateBadge`, `Dialog`, `ConfirmDelete`, `Toast`, `Combobox` (searchable select), `Field` |
| `src/components/DataTable.tsx` | TanStack Table wrapper: search box, sortable headings, row click, row actions, empty state (REQ-40 to REQ-43) |
| `src/components/forms/` | `OrganizationForm`, `ContactForm`, `DealForm` (stage fills probability and close date, concern 11), `ActivityForm` |
| `src/components/Timeline.tsx` | Timeline entries, follow-up chip and checkbox, deal label on contact pages (REQ-54 to REQ-56) |
| `src/components/pipeline/` | `Board`, `Column`, `DealCard` (dnd-kit) |
| `src/components/dashboard/` | `Headline`, `RevenuePanel` (Recharts line), `Tiles`, `StageStrip`, `Funnel`, `WonLostChart` (Recharts bars), `FollowUps`, `RecentActivity` |
| `src/pages/` | `Dashboard`, `Pipeline`, `Deals`, `DealPage`, `Contacts`, `ContactPage`, `Organizations`, `OrganizationPage` |
| `src/**/*.test.ts(x)` | Vitest tests, listed under Proof |

Frontend dependencies: `react`, `react-dom`, `react-router`, `@tanstack/react-query`, `@tanstack/react-table`, `react-hook-form`, `zod`, `@hookform/resolvers`, `@radix-ui/react-dialog`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-popover`, `@radix-ui/react-toast`, `cmdk`, `recharts`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `date-fns`, `lucide-react`, `@fontsource/instrument-sans`, `@fontsource/instrument-serif`, `@fontsource/jetbrains-mono`; dev: `vite`, `@vitejs/plugin-react`, `typescript`, `tailwindcss`, `@tailwindcss/vite`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`.

### New files: end-to-end (`e2e/`)

| File | Purpose |
|---|---|
| `playwright.config.ts` | Installed Chrome (`channel: "chrome"`), 1440×900, one worker, `webServer` starts the backend on port 8100 with `ACCOUNTABLE_DB=e2e/.data/test.db` and `ACCOUNTABLE_TEST_MODE=1`, and the frontend on port 5180 pointing at it |
| `fixtures.ts` | Resets the test database before each test through `/api/test/reset`; fails any test that logs a console error or warning (REQ-8) or requests anything outside localhost (REQ-2) |
| `helpers.ts` | Drag a card with real mouse steps, fill forms, read table rows, read board totals |
| `*.spec.ts` | Listed under Proof |

## Order of work

### Phase 0: Skeleton that runs and tests itself

1. Root `package.json`, `pyproject.toml`, `.python-version`, `uv sync` to create `uv.lock`; `frontend/` created with Vite's React + TypeScript template, then trimmed.
2. Backend `main.py` with `/api/health` only; frontend shows a page that calls it.
3. Tailwind, brand tokens and the three bundled fonts in place.
4. `scripts/dev.mjs` and `scripts/test.mjs`; one trivial test in each suite (Vitest, pytest, Playwright opening `/`).
5. `docs/STATUS.md`: prerequisites (Node 24+, uv, Google Chrome; uv fetches Python 3.12 the first time, which needs internet once) and the three commands.

Done when: on this Windows machine, `npm run dev` from a fresh clone opens the browser on the page, Ctrl+C leaves no `node`, `uvicorn` or `python` process behind, and `npm test` runs all three suites and passes. Commit "Phase 0: skeleton".

### Phase 1: Data model, rules and API

1. `db.py` tables exactly as the spec's Data model, with foreign-key cascades and the activity check constraint.
2. `clock.py`, `rules.py`, `schemas.py`.
3. Routers for organizations, contacts, deals and activities: list, create, get, update, delete, `delete-impact`; deal and contact timelines (REQ-54, REQ-55); `stage_change` entries created only by the server (concern 7).
4. Deal create and update apply REQ-14 to REQ-16; new deals go to the top of their column (REQ-64).
5. `POST /api/deals/{id}/move` with `{stage, before_id}`: one transaction that removes the deal from its column, inserts it before `before_id` (or at the end when `null`), renumbers both columns, and applies REQ-15 if the stage changed.

Done when: every backend test for rules, CRUD, validation, deletes, timelines and moves passes. Commit "Phase 1: API".

### Phase 2: Sample data

1. `seed_data.py` with fictional names; `seed.py` builds about 15 organizations, 40 contacts, 60 deals and 200 activities from a fixed random seed, with every date relative to `clock.today()` (REQ-80 to REQ-83).
2. Each deal past New gets a believable chain of stage-change entries ending at its current stage; won and lost deals spread over the last 12 months with wins in most months; the late deals, overdue and upcoming follow-ups, and recent Won and Lost deals that REQ-81 asks for.
3. Board positions set for every column.
4. `reset_schema()` drops and recreates the tables before seeding, so `npm run seed` also recovers from an older schema. First start seeds only when the database file is new.
5. `--large` builds 500 organizations, 2,000 contacts, 1,000 deals and 10,000 activities for performance tests.
6. `/api/test/reset` in test mode.

Done when: `npm run seed` works with the app running and without it, and the seed tests pass. Commit "Phase 2: sample data".

### Phase 3: Dashboard figures

1. `GET /api/dashboard` returns, in one response: headline figures (REQ-71), 12 monthly points of revenue won, deals won and deals lost ending with the current month (REQ-72, REQ-73), the funnel by furthest stage reached for deals created in the last 12 months (REQ-74, concern 5), open value and expected revenue by stage (REQ-75), follow-ups grouped as overdue, today, next 7 days plus a count of later ones (REQ-76), and the 10 latest activities that have happened (REQ-77).
2. Queries use the indexes; the funnel reads the stage-change entries once.

Done when: each figure matches a small hand-made dataset in `test_dashboard.py`, including month and year boundaries. Commit "Phase 3: dashboard API".

### Phase 4: Frontend shell

1. Routing, `Sidebar` and `PageHeader` as in mockup B, record counts from the API.
2. `api/` client, types and hooks with invalidation.
3. `lib/format.ts`, `lib/rules.ts`, `lib/stages.ts`.
4. UI primitives, including `ConfirmDelete` and the toast.

Done when: every route renders its header in the mockup B layout, and the formatting and rules unit tests pass. Commit "Phase 4: frontend shell".

### Phase 5: Tables and forms

1. `DataTable` with search, sort, row click, Edit and Delete (REQ-40 to REQ-43).
2. Organizations, Contacts (with status filter and counts, REQ-45) and Deals (late badge, REQ-46) pages with the columns in REQ-44 to REQ-46.
3. Forms with required fields marked, inline "Required" errors and focus on the first one (REQ-21); server field errors shown the same way.
4. Delete dialogs with real counts from `delete-impact` (REQ-30 to REQ-32).

Done when: the tables end-to-end tests pass. Commit "Phase 5: tables".

### Phase 6: Record pages and timelines

1. Organization, contact and deal pages with linked records (REQ-50 to REQ-52) and "New contact" and "New deal" prefilled from an organization.
2. `ActivityForm` and `Timeline` with edit, delete and the follow-up checkbox (REQ-53 to REQ-56).
3. Stage selector on the deal page using the same rules as a drag.

Done when: the record-page and timeline end-to-end tests pass. Commit "Phase 6: record pages".

### Phase 7: Pipeline

1. `lib/board.ts` and its unit tests first.
2. `Board`, `Column` and `DealCard` with dnd-kit: a sortable list per column; pointer and keyboard sensors (REQ-67); lifted card and placeholder while dragging.
3. On drop: update the deals cache at once (totals and meters follow, REQ-63), call `move`, roll back and show "The move wasn't saved" on error (REQ-66), then refresh deals, timelines and dashboard.
4. Column headers, board totals in the header pill, "+" to add a deal at that stage (REQ-64), Won and Lost limited to the last 30 days (REQ-61), late cards (REQ-65).

Done when: the pipeline end-to-end tests pass, including a refresh after reordering. Commit "Phase 7: pipeline".

### Phase 8: Dashboard

1. Headline sentence, revenue panel with the Recharts line chart, the four tiles, the stage strip, the funnel rows, the won-and-lost bar chart, follow-ups and recent activity, laid out as mockup B.
2. Compare a Playwright screenshot of `/` at 1440×900 with `docs/mockups/b-open-plan/dashboard.png`, and `/pipeline` with `pipeline.png`, by eye; fix differences in layout, spacing, colours and type.

Done when: the dashboard end-to-end tests pass and the screenshots match the mockup's look. Commit "Phase 8: dashboard".

### Phase 9: Hardening and the walkthrough

1. Performance check at the REQ-6 sizes, and fixes if needed (indexes, memoized table rows).
2. Console-clean and localhost-only checks across every page.
3. Empty states, loading states and error toasts on every screen.
4. A full walkthrough in a real browser by a person, the way a salesperson would use it: every section and every action in the intent, each screen checked by eye, console open (success criterion 8). Findings fixed and the walkthrough recorded in `docs/STATUS.md`.

Done when: all success criteria in `docs/intent.md` are met. Commit "Phase 9: MVP done".

### Decided against

- **Alembic migrations.** One user, sample data as the main data, and `npm run seed` rebuilds the schema. Migrations come with Supabase later.
- **An ORM.** The stack asks for SQLAlchemy Core.
- **Server-side paging and search.** The intent allows browser-side at this size.
- **A combined frontend and backend server.** Two dev servers behind Vite's proxy keep the stack's split and hot reload.
- **Parallel end-to-end tests.** One worker and a reset before each test keeps them simple and reliable; the course offers parallel runs as an optional later step.

## Risks

Ordered from most to least risky.

1. **Pipeline drag and drop.** Moving within and between columns, Won and Lost columns that hide older cards, optimistic totals and rollback all meet in one place, and Playwright drags with dnd-kit can be flaky. *Mitigation:* the server takes `before_id` instead of an index, so hidden cards can't shift positions; the placement logic lives in `lib/board.ts` and `repo.py` with unit tests on both sides; end-to-end drags use real mouse steps with a small move before and after, and assert on the server's state after a refresh, not only the screen.

2. **The launcher on Windows.** `npm` must be spawned as `npm.cmd` or through a shell, and Ctrl+C can leave `uvicorn` running and holding the port. *Mitigation:* `dev.mjs` kills each child's process tree (`taskkill /T /F` on Windows, process group elsewhere) on exit and on Ctrl+C, checks the ports are free before starting and says which one is taken. Phase 0 tests it on this Windows machine before anything else is built.

3. **Python isn't installed on this machine.** `uv sync` downloads Python 3.12 the first time, which needs internet once. *Mitigation:* documented in `docs/STATUS.md` as a one-off install step; after that the app runs offline.

4. **Dates and time.** Charts by month, late deals, overdue follow-ups and the 30-day window all depend on "today", and tests run on any day. *Mitigation:* the backend reads the date only through `clock.py`, which tests fix; dashboard tests cover the first and last day of a month and a year boundary; end-to-end tests compare against dates computed in the test, not fixed strings.

5. **Foreign keys in SQLite are off by default.** Without them, deletes wouldn't cascade or clear links (REQ-30 to REQ-32), silently. *Mitigation:* the pragma is set on every connection by an event listener, and delete tests check every linked record.

6. **The funnel depends on stage-change history.** If entries are missing or deleted, a deal counts only at its current stage. *Mitigation:* the seed builds full histories (REQ-82); the funnel falls back to the current stage when a deal has none; documented as expected behaviour, since deleting a stage-change entry is the user's choice.

7. **Screens drifting out of step.** A change on one screen must show on the dashboard, board, tables and timelines (REQ-78). *Mitigation:* one place (`api/hooks.ts`) decides which queries each mutation refreshes, and end-to-end tests check the dashboard after a pipeline win and after a new follow-up.

8. **Seeding while the app runs.** The seed and the server write to the same file. *Mitigation:* WAL mode, a busy timeout and one transaction for the whole reset; a backend test seeds while another connection is open.

9. **Working offline.** A stray CDN font or icon would break REQ-2 without anyone noticing on a connected laptop. *Mitigation:* fonts from `@fontsource`, icons from `lucide-react`, and the end-to-end fixture fails any request that leaves localhost.

10. **Google Chrome must be installed** for the end-to-end tests (`channel: "chrome"`). *Mitigation:* listed as a prerequisite; the config gives a clear message if Chrome is missing.

11. **Matching the mockup.** "Visually stunning" is judged by eye. *Mitigation:* phase 8 compares screenshots with mockup B side by side, and phase 9's walkthrough checks every screen.

12. **Performance at full size.** 10,000 activities and 1,000 deals in browser-side tables. *Mitigation:* indexes from phase 1, memoized rows, and a performance test at the REQ-6 sizes in phase 9.

## Proof

`npm test` runs every test below and must pass at the end of every phase from the phase that adds it. Passing tests are necessary but not enough: phase 9 ends with a person using the app end to end (success criterion 8).

### Backend unit tests (pytest, `backend/tests/`)

Each test runs against a temporary database with a fixed "today".

| File | Cases |
|---|---|
| `test_rules.py` | Probabilities per stage (REQ-14); late only for open stages with a past close date, never without one (REQ-17); overdue, due today, due later and done follow-ups (REQ-18); expected revenue and open totals (REQ-20); 30-day window edges (REQ-61) |
| `test_organizations.py` | Create, get, list with contact count, open-deal count and open value (REQ-44), update, 422 without a name (REQ-21), 404 for a missing one |
| `test_contacts.py` | Create with default status Lead; 422 without name or with an invalid status; optional organization; email shape check; get includes organization and deals where they're the main contact (REQ-51) |
| `test_deals.py` | New deal takes its stage's probability unless one is given (REQ-14); 422 without name, organization, stage or value, or with a negative value (REQ-12, REQ-21); stage change sets probability, close date for Won and Lost, and adds "Moved from Proposal to Negotiation" (REQ-15); a hand-set probability or close date in the same edit wins (concern 11); a hand-set probability survives other edits until the next stage change (REQ-16); reopening keeps the close date (concern 6); contact status never changes (REQ-15); `is_late` and `expected_revenue` in the list |
| `test_activities.py` | Create on a contact or a deal; 422 with both or neither, or without type, description or time (REQ-13); `stage_change` can't be created or edited, only deleted (concern 7); follow-up done and undone (REQ-56) |
| `test_move.py` | Reorder within a column; move to another column at the top, middle and end; `before_id` of a card in another column is rejected; moving to Won or Lost sets today's date and adds a stage-change entry; positions stay 0, 1, 2… in both columns; a move to the same place changes nothing and adds no entry; moving into Won with older hidden Won deals places the card before the right visible card (REQ-62) |
| `test_timelines.py` | Newest first by when it happened (REQ-54); a contact's timeline includes their deals' activities with deal names, and not other deals' (REQ-55); changing a deal's main contact moves its history to the new contact's timeline (concern 8) |
| `test_delete.py` | Organization: deals and their activities deleted, contacts kept with no organization (REQ-30); contact: own activities deleted, deals kept with no main contact, those deals' activities kept (REQ-31); deal: all its activities deleted (REQ-32); `delete-impact` counts match what actually happens |
| `test_dashboard.py` | Against a hand-made dataset: each headline figure (REQ-71); 12 months ending with the current month, including a year boundary and deals closed on the first and last day of a month (REQ-72, REQ-73); funnel counts by furthest stage reached, lost deals counted up to the stage they were lost from, deals with no history at their current stage (REQ-74); open stage totals (REQ-75); follow-up groups and the later count (REQ-76); recent activity excludes future-dated entries and caps at 10 (REQ-77); winning a deal or adding a follow-up changes the right figures (REQ-78) |
| `test_seed.py` | Counts within the REQ-80 ranges; every status and stage present; wins in at least 9 of the 12 months; at least 3 late deals, 4 overdue and 4 upcoming follow-ups, 3 Won and 2 Lost in the last 30 days (REQ-81); every deal past New has a stage-change chain ending at its stage (REQ-82); two runs on the same day give the same data (REQ-83); seeding while another connection is open succeeds; a new database seeds on first start, an existing one doesn't (REQ-1) |
| `test_persistence.py` | Data written through one app instance is there when a new instance opens the same file (a restart, REQ-3); running `python -m accountable.seed` as a separate process, as `npm run seed` does, replaces changed data with fresh sample data while the app holds the file open (REQ-4) |
| `test_performance.py` | With the `--large` data: `GET /api/deals`, `/api/contacts`, `/api/organizations` and `/api/dashboard` each answer in under 300 ms, and a contact timeline in under 100 ms (REQ-6) |

### Frontend unit tests (Vitest)

| File | Cases |
|---|---|
| `lib/format.test.ts` | `R12,500`, `R0`, `R1,000,000,000`; `R12.5k`, `R1.2M`; `21 Nov` this year and `15 Jan 2027` otherwise; `15:40`; relative times |
| `lib/rules.test.ts` | Same cases as `test_rules.py`, so the two sides agree |
| `lib/board.test.ts` | Grouping into six columns in position order; Won and Lost filtered to 30 days; applying a move within and between columns; `before_id` for a drop at the top, middle and end and beside hidden cards; column and board totals after a move (REQ-63) |
| `components/DataTable.test.tsx` | Search across visible text columns ignoring case (REQ-40); sort and reverse with the direction shown (REQ-41); empty state and clearing the search |
| `components/forms/DealForm.test.tsx` | "Required" shown under each missing field and focus on the first (REQ-21); choosing a stage fills its probability, and Won or Lost fills today's date, both still editable (concern 11) |
| `components/forms/ContactForm.test.tsx`, `OrganizationForm.test.tsx`, `ActivityForm.test.tsx` | Required fields and server errors shown by the field |
| `components/ui/ConfirmDelete.test.tsx` | Wording with counts for each record type (REQ-30 to REQ-33) |

### End-to-end tests (Playwright, `e2e/`)

Each test starts from fresh sample data and fails on any console error or warning (REQ-8) or any request outside localhost (REQ-2).

| File | Scenario |
|---|---|
| `start.spec.ts` | Opening the app lands on the dashboard with sample data; every page in the sidebar opens and shows data (success criterion 1, REQ-70) |
| `organizations.spec.ts` | Add, search, sort, open, edit and delete an organization; the dialog's counts; after deleting, its contacts remain with no organization and its deals are gone; changes survive a refresh (REQ-30, REQ-40 to REQ-44, REQ-50) |
| `contacts.spec.ts` | Add a lead, a qualified contact and a customer; status filter with counts combined with search; edit and delete; deals where they were the main contact remain with none (REQ-31, REQ-45, REQ-51) |
| `deals.spec.ts` | Add, search, sort, edit and delete a deal; late deals marked in the table; the stage selector on a deal's page changes stage and probability and adds a timeline entry (REQ-32, REQ-46, REQ-52) |
| `validation.spec.ts` | Each form refuses to save without its required fields and says which (REQ-21) |
| `timeline.spec.ts` | Log a note, call and email with a follow-up on a contact and on a deal; newest first; the deal's entries appear on its main contact's page; edit and delete an entry; mark a follow-up done (REQ-53 to REQ-56) |
| `pipeline.spec.ts` | Drag a card to another stage: stage, probability and totals change at once, and the Deals table and both timelines agree; drag to Won: close date is today; reorder within a column, refresh, order kept; add a deal in a column, it starts at that stage at the top; Won and Lost show only the last 30 days; late cards marked; a keyboard move; a rejected move rolls back (REQ-60 to REQ-67) |
| `dashboard.spec.ts` | Headline figures, charts, funnel, stage strip, follow-ups and recent activity present and matching `/api/dashboard`; win a deal on the pipeline and the figures change; add a follow-up due today and it appears; mark it done and it goes (REQ-71 to REQ-78) |
| `persistence.spec.ts` | Changes on every screen survive a reload and a fresh browser context (REQ-3); restarts and `npm run seed` are covered by `test_persistence.py` |
| `performance.spec.ts` | With `--large` data: each page loads in under a second, and table search and sort respond in under 200 ms (REQ-6) |

### Checks by a person

- Phase 0: `npm run dev` from a fresh clone on this Windows machine, and Ctrl+C leaves nothing running.
- Phase 8: the dashboard and pipeline side by side with mockup B.
- Phase 9: the full walkthrough of every section and action, with the browser console open, recorded in `docs/STATUS.md` (success criterion 8).
