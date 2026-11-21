# Mockups: dashboard and pipeline

Three directions for the MVP's look, each following `docs/spec.md` and the `brand` skill, with the same sample data (today is 21 Nov 2026). Each folder has `dashboard.html` and `pipeline.html`, with a full-page screenshot of each beside it at 1440 px wide.

**Chosen: B, Open plan** (see "Chosen look" in `docs/spec.md`). B was then updated to match the spec: no search box or Revenue/Deals switch on the dashboard, and figures that fit the 60-deal sample data. A and C are kept as they were when the choice was made.

| | A: Midnight | B: Open plan | C: Command |
|---|---|---|---|
| Navigation | Dark Midnight sidebar with labels, Sea Green pill for the current page | White floating sidebar with record counts | Narrow Midnight icon rail |
| Dashboard top | Six white headline tiles | Serif headline ("R2.5 million expected from 18 open deals") and a large revenue chart | Dark panel holding all six figures and the open pipeline as one bar |
| Pipeline visual | Stacked bar with a stage list, plus a centred funnel | Full-width coloured stage blocks, plus a bar-style funnel | Stage bar in the dark panel, plus a classic funnel shape |
| Follow-ups | One list grouped by Overdue, Today, Next 7 days | Grouped task rows with coloured date chips | Three side-by-side lanes |
| Pipeline columns | Whole column washed in its stage colour | Plain columns under white header cards with a probability meter | White columns with a solid stage-coloured header; cards show a probability meter |
| Feel | Familiar and calm, closest to the spec as written | Airy and editorial, the most "designed" | Dense and data-forward, fits most on screen |

All three use the spec's stage colours (New Sea Green, Qualified Marigold, Proposal Coral, Negotiation Cerulean, Won Midnight, Lost slate), Raspberry only for late deals, overdue follow-ups and alerts, and the rand and South African date formats.

## Viewing

The pages load fonts from Google Fonts and icons from unpkg, so they need an internet connection (the app itself will bundle both). Browsers block some of these when a page is opened straight from disk, so serve the folder, for example with `npx http-server docs/mockups`, and open the page it prints.

The HTML and data here are throwaway: they show the look, not the code the app will use.
