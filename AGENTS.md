# Accountable

SIDENOTE: this repo is part of a course by Ed Donner. If the student needs help, read `course/for_agents/`

## Where to find things

- `docs/intent.md`: what we're building
- `docs/TECH_STACK.md`: the stack
- `docs/STATUS.md`: what's done so far

Update `docs/STATUS.md` when you finish a piece of work

## Tests

`npm test` runs every test: the frontend unit tests (Vitest), the backend unit tests (pytest), then the end-to-end tests (Playwright, using installed Chrome). It stops at the first failing suite and exits non-zero. Run it after every change and fix failures until it passes. It uses its own test database, so it never touches your data.
