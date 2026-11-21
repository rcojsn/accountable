# Spec: the Accountable MVP

This spec turns `docs/intent.md` into requirements and a design for the MVP. It follows `docs/TECH_STACK.md` and the `brand` skill (`.claude/skills/brand/SKILL.md`). Where this spec and the intent disagree, the intent wins until the spec is corrected.

## Concerns

All answered on 2026-11-21. Every recommendation was accepted except 13, where the currency is South African rand (ZAR) instead of US dollars. `docs/intent.md` was updated to match. Dates and times use the South African format (21 Nov 2026, 15:40). The rest of this spec follows these decisions.

1. **Google Fonts versus working offline.** The brand loads its fonts from Google Fonts, but the app must work with no internet connection. Recommendation: bundle the same three fonts with the app through the `@fontsource` npm packages (Instrument Sans, Instrument Serif, JetBrains Mono), so they come from the app itself.

2. **"One command" for someone non-technical.** `npm run dev` normally needs `npm install` and `uv sync` first. Recommendation: `npm run dev` runs a small launcher script (Node built-ins only) that installs anything missing, starts both servers and opens the browser on the dashboard. Node and uv still have to be installed once, and `docs/STATUS.md` says how.

3. **Six stages, five brand colors.** The brand gives five colors for things side by side, and Raspberry also means "alert", which we need for late deals and overdue follow-ups. Recommendation: the four open stages take the brand order (New Sea Green, Qualified Marigold, Proposal Coral, Negotiation Cerulean), Won is Midnight, Lost is a muted slate grey, and Raspberry is kept for late, overdue and delete.

4. **White text on Cerulean and Raspberry is too faint at small sizes.** Measured contrast is 3.96:1 and 3.62:1, below the 4.5:1 needed for small text. Recommendation: use the brand colors as they are for large text, chart marks and fills, and slightly darker versions (`#0E6F90`, `#C81E4A`) for small badges and buttons with white text. The same goes for Sea Green, Marigold and Coral as text on light backgrounds (see Design tokens).

5. **What the sales funnel measures.** "How much value reaches each stage" could mean the value sitting in each stage now, or the value that has ever reached each stage. Recommendation: the second. For deals created in the last 12 months, each deal counts at every stage up to the furthest one it reached, worked out from its stage-change entries. A won deal counts at every stage; a lost deal counts up to the stage it was lost from. This is what makes it a funnel rather than a second copy of the pipeline.

6. **Reopening a closed deal.** If a deal is dragged from Won or Lost back to an open stage, its close date is still the day it was closed, so it shows as late the next day. Recommendation: keep the close date as it is (the intent says nothing else changes by itself) and let the user edit it. The late marker makes the problem visible.

7. **What a stage-change entry is.** Activities are a note, call or email, but stage changes appear in the same timelines. Recommendation: a fourth, system-only type, "Stage change". It can be deleted but not edited, has no follow-up, and can't be created by hand.

8. **Which contact a deal activity belongs to.** An activity logged on a deal is stored on the deal only. It shows in the main contact's timeline because that contact is the deal's main contact today. So if the deal's main contact changes, the deal's whole history moves to the new contact's timeline, and deleting a contact never deletes a deal's activities. Recommendation: accept this; it keeps one story per deal and matches "a contact's page tells the whole story".

9. **A deal's main contact from another organization.** The intent doesn't say whether the main contact must work at the deal's organization. Recommendation: the deal form lists that organization's contacts first, then everyone else, and allows any contact. The server doesn't enforce it, since contacts change jobs.

10. **"Coming up" follow-ups.** The intent doesn't say how far ahead. Recommendation: the dashboard shows every overdue follow-up, those due today, and those due in the next 7 days, with a count of later ones.

11. **Hand-set probability and close date in the same edit as a stage change.** Recommendation: in the deal form, changing the stage fills in that stage's probability (and today's date for Won or Lost), and the user can change them again before saving. On the server, a stage change sets the stage's probability and, for Won or Lost, today's close date, unless the same request also sends a probability or close date of its own.

12. **Sample data ages.** Dates are relative to the day the data is created, so a database left for weeks drifts: more overdue follow-ups, fewer upcoming ones. Recommendation: accept it; `npm run seed` brings it back to fresh. The seed doesn't run by itself on start unless the database is new.

13. **Currency and money format.** The brand says money is always shown with its currency. Decision: the MVP's only currency is South African rand (ZAR), shown as `R12,500` everywhere (`R12.5k` and `R1.2M` on chart axes), with "All amounts in South African rand (ZAR)" in the app's footer. Commas separate thousands and there are no decimals, so figures read the same in tables, cards and charts.

14. **Whole rand.** Decision: deal values are whole rand (no cents), from R0 to R1,000,000,000. This avoids rounding errors and fits sales figures.

## Requirements

Numbers such as REQ-12 are referred to by the tests. "Must" items are all required for the MVP to be done (success criteria 1 to 8 in the intent).

### General

- **REQ-1** One command, `npm run dev`, starts the app on Mac, Linux and Windows and opens the dashboard in the browser. A new database is created and filled with sample data on first start.
- **REQ-2** The app needs no internet connection once installed: fonts, icons and libraries are bundled.
- **REQ-3** Every change is saved to the SQLite database at once, and is still there after a refresh and a restart.
- **REQ-4** `npm run seed` resets the database to fresh sample data. It works with the app running; the browser shows the new data after a refresh.
- **REQ-5** `npm test` runs the frontend unit tests, backend unit tests and end-to-end tests, starting the app itself on a test database, and fails if any test fails. It never touches the user's database.
- **REQ-6** With 500 organizations, 2,000 contacts, 1,000 deals and 10,000 activities, every page loads in under a second and table search and sort respond in under 200 ms on a typical laptop.
- **REQ-7** Light mode only, laid out for screens 1280 px wide and up (it should still work down to 1024 px).
- **REQ-8** No errors or warnings in the browser console during normal use.

### Records and rules

- **REQ-10** Organization: name (required), website, industry, notes.
- **REQ-11** Contact: name (required), status (required: Lead, Qualified or Customer; default Lead), email, phone, job title, organization.
- **REQ-12** Deal: name (required), organization (required), stage (required; default New), value in whole rand, ZAR (required, 0 or more), main contact, probability of close (0 to 100), close date.
- **REQ-13** Activity: type (required: Note, Call or Email), description (required), when it happened (required; default now), follow-up date, done (default no). It belongs to exactly one contact or one deal.
- **REQ-14** Stage probabilities are fixed: New 10%, Qualified 25%, Proposal 50%, Negotiation 75%, Won 100%, Lost 0%. A new deal takes its stage's probability unless one is given.
- **REQ-15** When a deal's stage changes, by drag or by form: its probability becomes the new stage's (unless set in the same edit); if the new stage is Won or Lost, its close date becomes today (unless set in the same edit); and a Stage change activity "Moved from {old} to {new}" is added to the deal, dated now. Nothing else changes: not the contact's status, nor anything else.
- **REQ-16** A hand-set probability is kept until the stage next changes.
- **REQ-17** A deal is **late** when it is in an open stage (New, Qualified, Proposal, Negotiation) and its close date is before today. A deal with no close date is never late.
- **REQ-18** A follow-up is **overdue** when it isn't done and its date is before today; **due** when it isn't done and its date is today or later.
- **REQ-19** "Today" is the date on the computer the app runs on.
- **REQ-20** Expected revenue of a deal = value × probability. Board, column and dashboard figures for "open" include only New, Qualified, Proposal and Negotiation.
- **REQ-21** Saving without a required field is refused: the form shows which fields are missing and the server rejects it too (HTTP 422).

### Deleting

Every delete asks first, in a dialog that names the record and says what happens to linked records, with the real counts.

- **REQ-30** Deleting an organization deletes its deals and their activities. Its contacts are kept, with no organization. Dialog: "Delete Acme Ltd? Its 3 deals and their 12 activities will be deleted. Its 5 contacts will be kept, with no organization."
- **REQ-31** Deleting a contact deletes the activities logged on them. Deals where they are the main contact are kept, with no main contact. Activities logged on those deals are kept.
- **REQ-32** Deleting a deal deletes its activities, including its stage-change entries.
- **REQ-33** Deleting an activity asks first too, with no linked records to mention.

### Tables (Organizations, Contacts, Deals)

- **REQ-40** Each table has a search box that filters rows as you type, matching any visible text column, ignoring case.
- **REQ-41** Clicking a column heading sorts by it; clicking again reverses; the heading shows the direction. Default sort: Organizations and Contacts by name, Deals by close date.
- **REQ-42** A "New" button adds a record in a dialog. Each row has Edit (same dialog, filled in) and Delete.
- **REQ-43** Clicking a row (outside its buttons) opens the record's page.
- **REQ-44** Organizations columns: Name, Industry, Website, Contacts (count), Open deals (count), Open value.
- **REQ-45** Contacts columns: Name, Status, Organization, Job title, Email, Phone. A status filter (All, Lead, Qualified, Customer) with a count on each choice, combined with search.
- **REQ-46** Deals columns: Name, Organization, Main contact, Stage, Value, Probability, Expected revenue, Close date. Late deals stand out: a "Late" badge and the close date in the alert color. A stage filter is a nice-to-have, not required.

### Record pages

- **REQ-50** Organization page: its details (editable), its contacts and its deals, each as a small list linking to their pages, with "New contact" and "New deal" that start with this organization filled in.
- **REQ-51** Contact page: details (editable), status, organization (linked), the deals where they are the main contact, and their timeline.
- **REQ-52** Deal page: details (editable), stage with a stage selector, value, probability, expected revenue, close date (late marker if late), organization and main contact (linked), and its timeline.
- **REQ-53** Contact and deal pages have a "Log activity" form: type, description, when it happened, optional follow-up date.
- **REQ-54** The timeline lists activities newest first, by when they happened. Each entry shows its type, description, date and time, follow-up date with done or overdue state, and Edit and Delete (Stage change entries: Delete only).
- **REQ-55** A contact's timeline also includes every activity of every deal where they are the main contact, each labelled with the deal's name and linking to it.
- **REQ-56** A follow-up can be marked done or not done from the timeline and from the dashboard.

### Pipeline

- **REQ-60** One column per stage, in order: New, Qualified, Proposal, Negotiation, Won, Lost.
- **REQ-61** Won and Lost show only deals with a close date in the last 30 days (today and the 29 days before). Every closed deal stays in the Deals table.
- **REQ-62** Dragging a card to another column changes the deal's stage (REQ-15). Dragging within a column changes its place. A card can be dropped anywhere in a column and stays exactly there, also after a refresh.
- **REQ-63** Board header: total value and expected revenue of open deals. Each column header: deal count, total value and expected revenue. All of these update the moment a card is dropped, before the server replies.
- **REQ-64** Each column has "Add deal", which opens the deal form with that stage set. The new card goes to the top of its column.
- **REQ-65** Cards show name, organization, value, close date and main contact. Late cards stand out (REQ-17).
- **REQ-66** If the server rejects a move, the card goes back where it was and a message says the move wasn't saved.
- **REQ-67** Dragging works with mouse and keyboard (pick up with Space, move with arrows, drop with Space).

### Dashboard

- **REQ-70** The landing page (`/`).
- **REQ-71** Headline figures: open pipeline value, expected revenue, revenue won this month, deals won this month, late deals, overdue follow-ups.
- **REQ-72** Line chart: revenue won per month for the last 12 months, ending with the current month, by close date of Won deals.
- **REQ-73** Bar chart: deals won per month over the same 12 months, with deals lost beside them for comparison.
- **REQ-74** Pipeline visual: the sales funnel (concern 5), one band per stage from New to Won, showing value and deal count at each.
- **REQ-75** Open pipeline by stage: value, number of deals and expected revenue for each open stage, as colored blocks side by side, each as wide as its share of the open value.
- **REQ-76** Follow-ups: overdue, today, and next 7 days, each with the activity, the contact or deal (linked), the date, and a checkbox to mark it done. A count of later follow-ups.
- **REQ-77** Recent activity: the 10 latest activities that have happened (when it happened is now or earlier), including stage changes, each linking to its contact or deal.
- **REQ-78** Every figure matches the data and updates after any change elsewhere (for example a deal won on the pipeline, or a new follow-up), without restarting.

### Sample data

- **REQ-80** About 15 organizations across at least 6 industries, 40 contacts at every status, 60 deals at every stage, and about 200 activities (stage-change entries included), all fictional. Enough deals are won to show wins in most months of the 12-month charts. Deal values are realistic in rand, roughly R25,000 to R2,500,000.
- **REQ-81** Dates relative to the day the data is created: deals won and lost across the last 12 months (so every month on the charts has data, most with some wins), deals expected to close in the coming months, at least 3 late deals, at least 4 overdue follow-ups and at least 4 due in the next 7 days, and at least 3 Won and 2 Lost in the last 30 days so those columns aren't empty.
- **REQ-82** Every deal past New has stage-change entries that tell a believable path to its current stage, so timelines and the funnel make sense.
- **REQ-83** The seed is deterministic (fixed random seed), so tests can rely on it, apart from the dates moving with today.

## Design

### Architecture

```
Browser ── React app (Vite dev server, :5173) ── /api proxy ──> FastAPI (:8000) ── SQLAlchemy Core ──> SQLite file
```

- The frontend calls the backend's JSON API under `/api`. In development Vite proxies `/api` to the backend, so the browser sees one address: `http://localhost:5173`.
- The frontend loads whole lists (at most a few thousand rows) and does table search and sort in the browser, as the intent allows. The backend computes the dashboard figures and timelines.
- The database file is `backend/data/accountable.db` (git-ignored). The path comes from the `ACCOUNTABLE_DB` environment variable, so tests use a file of their own.
- SQLite runs with `PRAGMA foreign_keys = ON` and WAL mode, so the seed can run while the app is open.

### Repository layout

```
package.json            root scripts, npm workspace "frontend", Playwright as a root dev dependency
pyproject.toml, uv.lock backend dependencies (uv)
scripts/dev.mjs         launcher for npm run dev (Node built-ins only)
scripts/test.mjs        runs all three test suites in order
backend/
  accountable/
    main.py             FastAPI app, routers, error handlers
    db.py               engine, metadata, tables, connection helpers
    schemas.py          Pydantic request and response models
    rules.py            stage probabilities, late, overdue, stage-change logic
    routers/            organizations, contacts, deals, activities, pipeline, dashboard
    seed.py             sample data; `python -m accountable.seed`
  tests/                pytest
frontend/
  src/
    main.tsx, App.tsx   routes and layout
    api/                typed fetch client and TanStack Query hooks
    pages/              Dashboard, Organizations, OrganizationPage, Contacts, ContactPage,
                        Deals, DealPage, Pipeline
    components/         DataTable, RecordDialog, ConfirmDelete, Timeline, ActivityForm,
                        StageBadge, Money, charts/, pipeline/
    lib/                money and date formatting, stage colors, rules shared with the UI
    styles/             tokens and global CSS
  tests (alongside code, *.test.ts(x))  Vitest
e2e/                    Playwright Test specs and config
```

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Installs missing dependencies (`npm install`, `uv sync`), starts the backend on port 8000 and the frontend on 5173, waits until both answer, and opens the dashboard. Ctrl+C stops both. |
| `npm run seed` | Replaces all data with fresh sample data, in one transaction. |
| `npm test` | Vitest, then pytest, then Playwright. Stops at the first failing suite and exits non-zero. |

Ports 8000 and 5173 can be changed with `ACCOUNTABLE_API_PORT` and `ACCOUNTABLE_WEB_PORT`. The end-to-end tests use their own ports and their own database file, which they seed before each run.

### Libraries

| Need | Library |
|---|---|
| Routing | React Router |
| Server data and caching | TanStack Query (invalidate the related queries after every change, so the dashboard and board stay in step) |
| Tables | TanStack Table |
| Forms and validation | React Hook Form with Zod |
| Dialogs, selects, menus, toasts | Radix UI primitives |
| Charts | Recharts |
| Drag and drop | dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`) |
| Styling | Tailwind CSS v4, with the brand tokens as theme variables |
| Fonts | `@fontsource/instrument-sans`, `@fontsource/instrument-serif`, `@fontsource/jetbrains-mono` |
| Icons | lucide-react |
| Dates | date-fns |
| Backend | FastAPI, Pydantic v2, SQLAlchemy Core 2, Uvicorn |
| Tests | Vitest with Testing Library, pytest with FastAPI's TestClient, Playwright Test using installed Chrome (`channel: "chrome"`) |

### Data model

All tables have `id` (integer primary key), `created_at` and `updated_at`.

**organizations**
| Column | Type | Notes |
|---|---|---|
| name | text, not null | |
| website | text | |
| industry | text | free text, with suggestions from existing values |
| notes | text | |

**contacts**
| Column | Type | Notes |
|---|---|---|
| name | text, not null | |
| email, phone, job_title | text | email checked for a basic shape if given |
| organization_id | FK organizations, null | ON DELETE SET NULL |
| status | text, not null | `lead`, `qualified`, `customer` |

**deals**
| Column | Type | Notes |
|---|---|---|
| name | text, not null | |
| organization_id | FK organizations, not null | ON DELETE CASCADE |
| contact_id | FK contacts, null | main contact; ON DELETE SET NULL |
| stage | text, not null | `new`, `qualified`, `proposal`, `negotiation`, `won`, `lost` |
| value | integer, not null | whole rand (ZAR), ≥ 0 |
| probability | integer, not null | 0–100 |
| close_date | date, null | |
| position | integer, not null | order within its stage column; lower is higher on the board |

**activities**
| Column | Type | Notes |
|---|---|---|
| type | text, not null | `note`, `call`, `email`, `stage_change` |
| contact_id | FK contacts, null | ON DELETE CASCADE |
| deal_id | FK deals, null | ON DELETE CASCADE |
| description | text, not null | |
| happened_at | datetime, not null | local time |
| follow_up_date | date, null | not allowed on `stage_change` |
| done | boolean, not null | default false |
| from_stage, to_stage | text, null | set only on `stage_change` |

A check constraint makes sure exactly one of `contact_id` and `deal_id` is set. Indexes on every foreign key, on `activities.happened_at`, on `activities.follow_up_date`, and on `deals (stage, position)`.

The deletion rules REQ-30 to REQ-32 come from these foreign keys. Deleting an organization cascades to its deals, which cascades to their activities.

### Board ordering

Each deal has a `position` within its stage. Moving a card sends `{stage, before_id}`, where `before_id` is the card it was dropped just above, or `null` when it was dropped at the bottom of the column. The server, in one transaction, takes the card out of its old column, puts it just before `before_id` in the new column (or at the end), and renumbers both columns 0, 1, 2… Placing it by a neighbouring card rather than by a count keeps the order right in the Won and Lost columns, where older deals are hidden from the board. At 1,000 deals renumbering a column is cheap and keeps the order exact.

### API

JSON everywhere, dates as `YYYY-MM-DD`, datetimes as ISO 8601 local time, money as whole-rand integers. Errors use FastAPI's 422 format for validation and `{"detail": "..."}` for 404 and 409.

| Method and path | Purpose |
|---|---|
| `GET /api/organizations` | All, with `contact_count`, `open_deal_count`, `open_value` |
| `POST /api/organizations` | Create |
| `GET /api/organizations/{id}` | One, with its contacts and deals |
| `PATCH /api/organizations/{id}` | Update |
| `GET /api/organizations/{id}/delete-impact` | Counts for the delete dialog |
| `DELETE /api/organizations/{id}` | Delete (REQ-30) |
| `GET /api/contacts` | All, with organization name |
| `POST`, `GET`, `PATCH`, `DELETE /api/contacts/{id}`, `GET …/delete-impact` | As above; `GET` includes organization and deals |
| `GET /api/contacts/{id}/timeline` | Own activities plus those of deals where they're main contact, newest first, each with the deal's id and name if it has one |
| `GET /api/deals` | All, with organization and contact names, `expected_revenue`, `is_late` |
| `POST`, `GET`, `PATCH`, `DELETE /api/deals/{id}`, `GET …/delete-impact` | As above; `PATCH` applies REQ-15 and REQ-16 |
| `POST /api/deals/{id}/move` | `{stage, before_id}`: change stage and place (REQ-15, REQ-62); returns the updated deal |
| `GET /api/deals/{id}/timeline` | The deal's activities, newest first |
| `POST /api/activities` | Create on a contact or a deal; `stage_change` not allowed |
| `PATCH /api/activities/{id}` | Update (type, description, when, follow-up, done); a `stage_change` accepts nothing |
| `DELETE /api/activities/{id}` | Delete |
| `GET /api/dashboard` | Every dashboard figure (REQ-71 to REQ-77) in one response |

The pipeline uses `GET /api/deals` and works out its columns, filters and totals in the browser, so they update the moment a card moves (REQ-63). The rules shared by both sides (stage probabilities, late, the 30-day window, expected revenue) live in `backend/accountable/rules.py` and `frontend/src/lib/rules.ts`, with matching unit tests on both sides.

### Chosen look: mockup B, Open plan

Chosen on 2026-11-21 from the three mockups in `docs/mockups/`. The build follows `docs/mockups/b-open-plan/` (`dashboard.png`, `pipeline.png` and their HTML) as the visual reference; where the mockup and this spec differ, this spec wins.

- **Why B:** it has a cleaner look and feel than the other two.
- **What B means for the build:** a light, airy look with plenty of white space; a white floating sidebar instead of a dark one; a serif headline on the dashboard; a large revenue chart as the dashboard's centrepiece; full-width colored stage blocks as the pipeline visual; and plain pipeline columns under white header cards, not columns tinted in their stage color.
- **Updated after the choice:** the mockup no longer has the "Search records" box in the dashboard header (the MVP has no search across all records, only each table's own search) or the "Revenue / Deals" switch on the revenue chart (deals won already have their own bar chart). Its sidebar counts, funnel and recent activity now fit the 60-deal sample data and show the 10 latest activities. Its figures are still examples; the app shows the real data.

### Screens

#### Layout

- A white floating sidebar, 220 px wide, set 16 px in from the page edges, with 20 px rounded corners and no outline. At the top, the Accountable wordmark beside a round Midnight mark with a Sea Green letter. Then Dashboard and Pipeline, a small "Records" label, then Deals, Contacts and Organizations, each with an icon and its record count on the right in JetBrains Mono (Pipeline shows the number of open deals). The current page has a pale Sea Green background (`rgba(6,214,160,.16)`), Midnight text and a dark green icon; the others are muted. At the bottom, a tinted note: "All amounts in South African rand (ZAR)".
- The main area has the page background `#F0F4F5`. Each page has a small muted line above its title (the date on the dashboard, a hint on the pipeline) and the page's main action on the right ("New deal", "New contact"…).
- Primary buttons are Midnight pills with white text and a Sea Green icon. Secondary buttons are white pills.
- Content sits in white panels with 20 px rounded corners, no outline, 26 px padding and no shadow (cards on the pipeline have a very soft one). No one-edge borders and no rule along the top of the page.

#### Dashboard

A 12-column grid, top to bottom:

1. **Headline**: the date in small muted text, then one sentence in Instrument Serif at 42 px built from the live figures: "R2.5 million expected from *18 open deals*", with the deal count in italic dark green. "New deal" on the right.
2. **Revenue won** (12 columns): a wide panel. On the left, revenue won over the last 12 months as a large figure, "22 deals won · 11 lost" beneath it, then "Won this month" with its revenue and number of deals. On the right, the line chart: a Midnight line with Sea Green dots on each month and a very light fill under it. Hovering a month shows a Midnight tooltip above the chart with the month, revenue and deal count, joined to the point by a dashed line.
3. **Headline figures** (four tiles of 3 columns): Open pipeline (with the number of open deals), Expected revenue, Late deals and Overdue follow-ups ("2 more due today" beneath). Each has a label, a round icon chip on the right and a 28 px figure in JetBrains Mono. Late deals and overdue follow-ups turn Raspberry, icon chip included, when above zero, and link to the Deals table and the follow-ups panel.
4. **Open pipeline by stage** (12 columns): four solid blocks side by side, one per open stage in its stage color, each as wide as its share of open value (with a minimum width so a small stage stays readable). Each block shows the stage name, its number of deals, its value in large JetBrains Mono and "Expected R410,000 at 25%". Negotiation uses `#0E6F90` so its white text is readable.
5. **Sales funnel** (7 columns): one row per stage from New to Won: a stage dot and name, a rounded bar on a pale track filled in the stage color in proportion to the value, the value, and the number of deals. Between rows, a small "↓ 75% moved on". **Deals won and lost** (5 columns): grouped bars per month, Sea Green for won and slate for lost, with rounded tops.
6. **Follow-ups** (7 columns): grouped under "Overdue · 4" (in Raspberry), "Today · 2" and "Next 7 days · 3", with "12 more later" in the panel's header. Each follow-up is a pale tinted row with a round checkbox, the description, "Deal · Warehouse automation" or "Contact · Thandi Mokoena" beneath, its type icon, and a date chip: Raspberry with white text when overdue, Marigold when due today, white otherwise. **Recent activity** (5 columns): the latest 10 as a vertical timeline of small ringed dots joined by a soft line. Each entry shows the description (or, for a stage change, the two stage badges with an arrow), "Call · Lerato Khumalo" beneath, and the time in JetBrains Mono ("2 hours ago", "18 Nov 10:05"). A stage change's dot takes the new stage's color.

#### Pipeline

- The header: the hint "Drag a card to change its stage or its place" above the title, and on the right a white pill holding Open deals, Open pipeline and Expected revenue (in dark green), followed by "New deal".
- Six columns side by side, scrolling sideways below 1280 px. Columns have no background of their own; cards sit on the page background.
- Each column starts with a white header card: the stage name in a solid pill in its stage color, the number of deals, and a round "+" button that adds a deal at that stage. Below that, the column's total value in 18 px JetBrains Mono, "Expected" with its expected revenue, and a thin meter filled to the stage's probability in the stage color. Won and Lost show "Closed in the last 30 days" instead of the expected revenue and meter.
- Cards are white with 14 px rounded corners. Top line: the organization, small and muted (cut short with an ellipsis if long), with a Raspberry "Late" badge on the right when late. Then the deal name in semibold; the value in JetBrains Mono with the deal's probability on the right; the close date with a calendar icon (a clock icon, in Raspberry, when late); and the main contact's initials in a circle tinted with the stage color, beside their name. No colored edge stripe.
- While dragging, the card lifts with a deeper shadow and a slight tilt, and a placeholder shows where it will land. Totals and meters update on drop.

#### Tables

- A panel holding a toolbar (search box on the left, filters, "New…" on the right) and the table.
- Headings in small semibold Midnight; the sorted column shows an arrow. Numbers right-aligned in JetBrains Mono. Rows 48 px high, a light tint on hover, the whole row clickable.
- Edit and Delete as icon buttons at the end of each row, with labels for screen readers and tooltips.
- An empty state when a search matches nothing: "No deals match "acme"." with a button to clear the search.
- Contacts' status filter is a row of segmented buttons with counts: All 40, Lead 14, Qualified 12, Customer 14.

#### Record pages

- A header panel with the record's name, key facts (status or stage badge, value, close date, organization link) and Edit and Delete.
- Two columns below. Left (wider): the timeline with the "Log activity" form at the top. Right: linked records (an organization's contacts and deals; a contact's organization and deals; a deal's organization, main contact and details).
- A deal's stage can be changed from a selector in its header, which follows REQ-15 just like a drag.
- Timeline entries: an icon per type, the description, the date and time, and for follow-ups a chip ("Follow up 28 Nov", Raspberry when overdue, struck through when done, with a checkbox). Stage changes are a compact single line with the two stage badges. On a contact's page, entries from a deal show "on Website redesign" linking to the deal.

#### Forms and dialogs

- Add and edit open in a centered dialog. Required fields are marked; on a failed save each missing field shows "Required" beneath it, and focus moves to the first one.
- Selects for organization and main contact are searchable.
- The delete dialog's confirm button is Raspberry: "Delete deal".
- After saving or deleting, a toast confirms it in a few words ("Deal saved", "Contact deleted").

### Design tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F0F4F5` | page background |
| `--panel` | `#FFFFFF` | panels and cards |
| `--ink` | `#073B4C` Midnight | text |
| `--ink-muted` | `#4F6B75` | secondary text (5.1:1 on the page background) |
| `--sidebar` | `#FFFFFF`, muted items in `--ink-muted` | navigation panel |
| `--nav-active` | `rgba(6,214,160,.16)` with Midnight text and a `--green-text` icon | current page in the sidebar |
| `--button` | `#073B4C` Midnight, white text, Sea Green icon | primary buttons |
| `--green` | `#06D6A0` Sea Green, Midnight text | New stage, won revenue, chart dots, button icons |
| `--green-text` | `#05795A` | green text on light backgrounds |
| `--marigold` | `#FFC145`, Midnight text | Qualified stage |
| `--marigold-text` | `#8A5A00` | marigold text on light backgrounds |
| `--coral` | `#F78C6B`, Midnight text | Proposal stage |
| `--coral-text` | `#A8432A` | coral text on light backgrounds |
| `--cerulean` | `#118AB2` | Negotiation stage, information |
| `--cerulean-strong` | `#0E6F90`, white text | small information badges and links |
| `--raspberry` | `#EF476F` | late, overdue, alerts |
| `--raspberry-strong` | `#C81E4A`, white text | delete buttons, small alert badges and alert text |
| `--won` | `#073B4C` Midnight, white text | Won stage |
| `--lost` | `#8FA3AA` slate, Midnight text | Lost stage, lost bars |

Fonts: Instrument Sans for headings and body (400, 500, 600), JetBrains Mono for money, counts, dates in tables and IDs, Instrument Serif only for the occasional accent such as the empty-state line on the dashboard. Body 14 px, table text 14 px, labels 12 px.

Formats: money `R12,500` (chart axes `R12.5k`, `R1.2M`), percentages `75%`, dates `21 Nov 2026` (`21 Nov` within the current year in timelines and cards), times on a 24-hour clock `15:40`, weeks starting on Monday.

Tone for every label and message: plain, short, no exclamation marks, no jargon ("Log activity", not "Create engagement").

### Testing

**Backend (pytest)**: every rule in REQ-14 to REQ-21 and REQ-30 to REQ-32; the move endpoint's ordering, including moving within a column, across columns and into Won or Lost with hidden older deals; timelines including a contact's deal entries and a change of main contact; every dashboard figure against a small hand-made dataset, including month boundaries and the 12-month window; the seed meets REQ-80 to REQ-83.

**Frontend (Vitest)**: money and date formatting (rand amounts and South African dates); the shared rules; board totals after a simulated move; table search and sort; form validation of required fields.

**End-to-end (Playwright)**, on a freshly seeded test database:
1. Start on the dashboard: all charts, figures and panels render, with no console errors.
2. Add, search, sort, edit and delete an organization, a contact and a deal; refresh and check the changes stayed; check each delete dialog's wording and the linked records afterwards.
3. Filter contacts by status; open each kind of record page and see its linked records.
4. Drag a deal to another stage: stage and probability change in the Deals table, a stage-change entry appears on the deal and its main contact; drag to Won: close date is today; reorder within a column and refresh; add a deal in a column; check column and board totals.
5. Log an activity with a follow-up on a contact and a deal; see it in the timelines and on the dashboard; mark it done and see it leave the dashboard.
6. Win a deal and see the dashboard figures change.
7. Try to save each form without its required fields.

A console-error check runs after every end-to-end test. Success criterion 8, a person using every section and action in a real browser, happens after the tests pass and is recorded in `docs/STATUS.md`.
