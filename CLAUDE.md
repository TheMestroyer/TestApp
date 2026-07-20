# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A self-grading quiz app for studying from plain-text test files. React + Vite frontend, Node/Express + SQLite
backend, JWT auth in httpOnly cookies. Users register, upload/write quiz files in a custom plain-text format,
take them, and get graded automatically. One admin account (by email) can publish "shared tests" every user sees
in their sidebar; each user who starts one gets their own independent copy/progress.

The original single-file prototype (vanilla JS, no build step) is preserved under `legacy/` for reference — it
is not part of the running app and should not be edited as part of feature work.

## Commands

Two independent npm projects; there is no root-level package.json or workspace tooling.

**Backend** (`backend/`):
```
npm install
npm run dev      # node --watch src/server.js — auto-restarts on change, port 4000
npm start        # node src/server.js
```
Needs a `.env` (copy `.env.example`) with at least `JWT_SECRET` set, or the process throws on startup
(`backend/src/lib/tokens.js`). `ADMIN_EMAIL` controls who gets admin — see Architecture below.

**Frontend** (`frontend/`):
```
npm install
npm run dev       # vite, port 5173, proxies /api/* to http://localhost:4000 (see vite.config.js)
npm run build     # production build to dist/
npm run lint      # oxlint
```

There is no test suite/framework configured in this repo (no `npm test` in either project). Verification during
development has been done manually and via ad hoc Playwright scripts run outside the repo — there's no
in-repo test command to reach for.

Run both dev servers together (two terminals) to work on the app locally; the frontend proxy means you never
need CORS config or to hit port 4000 directly from the browser.

## Architecture

### Two-table content/progress split (the key design decision)

`tests` rows mix quiz *content* (`raw_text`, `file_name`) with one user's *progress* (`state`, a JSON blob:
`{currentIndex, marked[], peeked[], answers[], submitted, submittedElapsedMs, scoreText}`) — one row is one
user's attempt at one piece of content, always owned by `user_id`.

`global_tests` holds only admin-authored *content*, no progress. When a user "starts" a shared test
(`POST /api/tests/from-global/:globalTestId`), the backend clones its `raw_text` into a new personal `tests` row
owned by that user, tagged with `global_test_id` for the "Shared" badge. From that point on it behaves exactly
like an uploaded test — fully independent per-user progress, and deleting the `global_tests` source only clears
the `global_test_id` reference (`UPDATE tests SET global_test_id = NULL ...`) rather than touching anyone's copy.
This is why there's no "shared progress" concept anywhere and no sync logic between a shared test and its clones.

Both frontend (`frontend/src/lib/quizParser.js`) and backend re-implement `blankState()` independently — they're
small and deliberately not shared across the JS/HTTP boundary.

### Content editing resets progress

Editing a test's raw text (`frontend/src/components/TestEditor.jsx`, used from both `AppPage` and `AdminPage`)
re-parses and, if the question content actually changed, resets that test's `state` to blank — answer indices
and match `cardOrder` can't be trusted to still line up after questions are edited. Renaming alone (content
unchanged) preserves progress. This comparison happens client-side in `AppPage.handleSaveEdit` by diffing the new
text against the currently-loaded `rawText`, with a `confirm()` if there's progress to lose.

### Auth

JWT in an httpOnly cookie (`backend/src/lib/tokens.js`, `routes/auth.js`), verified per-request in
`middleware/requireAuth.js` (no server-side session store). The JWT payload is just `{sub: userId}` — role/admin
status is looked up fresh from the DB on every request, not baked into the token, so promoting/demoting an admin
takes effect immediately without requiring re-login.

Admin status is keyed off `ADMIN_EMAIL` (env var), not a manual flag: on every backend startup,
`UPDATE users SET is_admin = 1 WHERE email = ?` runs for that address (`db.js`), and registration also checks it
at signup time. This makes admin setup idempotent and order-independent (works whether the account already
exists or registers later) but means changing `ADMIN_EMAIL` requires a container restart to take effect.
`middleware/requireAdmin.js` gates the admin-only routes in `routes/globalTests.js`.

`frontend/src/context/AuthContext.jsx` holds the current user; `ProtectedRoute` / `GuestRoute` / `AdminRoute`
(in `frontend/src/components/`) do the route-level gating by reading it. **Do not add a manual `navigate()` call
on login/register success** — `GuestRoute` already redirects reactively the instant the user is set, and a
timed/delayed navigate call was a real bug once already (a stale `setTimeout` fired after the user had already
navigated elsewhere, yanking them back — see git history on `LoginPage.jsx`/`RegisterPage.jsx` if touching this
area again).

### Quiz engine is pure functions, ported deliberately

`frontend/src/lib/quizParser.js` (parsing the plain-text format + `blankState`/`shuffledIndices`/code
highlighting) and `frontend/src/lib/grading.js` (`computeVerdict`/`gradeQuiz`, one function per question type:
single/multiple/truefalse/fill/short/match) are framework-agnostic and hold all the domain logic. `AppPage.jsx`
and `AdminPage.jsx` are orchestration only — they hold state and call into these. When adding a question type or
grading rule, it belongs in these two files, not scattered into components.

`AppPage.jsx` only ever renders the *current* question (not all questions hidden via CSS) — per-question
component state like the match question's `_selectedCard` is intentionally ephemeral and resets on navigation;
persisted per-question data (answers, match `cardOrder`) lives in lifted state in `AppPage`, not in the child
components.

### Keyboard shortcuts

Global `keydown` listener in `AppPage.jsx` (one `useEffect`, deps `[quiz, currentIndex, submitted]`): arrows
navigate, Enter toggles Show Answer, digits 1-9 pick an answer (single/multiple choice; multiple toggles), 1/2
pick True/False. All of it is guarded against firing while focus is in a text input/textarea (so it doesn't
interfere with typing a fill-in answer, renaming a sidebar item, or editing test content) — check that guard
before adding new shortcuts. Because the effect's dependency array is intentionally narrow, handlers that need
the *latest* answer state (the multiple-choice toggle) use the functional `setState` form
(`toggleMultipleOption`) rather than reading `answers` from the closure, which would go stale between effect
re-runs.

### Autosave

`AppPage.jsx` debounces `state` PATCHes 400ms after any answer/nav/mark/peek/submit change. A `skipSaveRef` flag
suppresses the autosave firing immediately after loading a test (`activateTest`), since that would otherwise
PATCH straight back the state that was just fetched.

### Deployment shape

Two Docker images (`backend/Dockerfile`, `frontend/Dockerfile`), no shared base. The backend runs as **root**
inside its own container deliberately (see comment in `backend/Dockerfile`) — it has no published port, is only
reachable from the frontend container over the compose network, and a bind-mounted `./data` volume's ownership
can't be reliably matched to a fixed container UID across arbitrary hosts.

`frontend/nginx.conf` serves the built SPA and proxies `/api/*` to `http://backend:4000` internally — the
frontend container is the *only* one that publishes a port. `docker-compose.yml` references prebuilt
`ghcr.io/themestroyer/studytest-*` images (not local `build:` context) — images are built and pushed locally via
`scripts/release.sh`, and the server only ever needs `docker-compose.yml` + `.env`, never the source tree. See
`DEPLOY.md` for first-time server setup (nginx/TLS/DNS) and `RELEASE.md` for the two-command update flow.

`backend/src/server.js` sets `app.set('trust proxy', 2)` — it's always reached through exactly two proxy hops
(host nginx, then the frontend container's nginx) and never directly. This has to stay a precise hop count, not
`true`: `express-rate-limit` (used on the auth routes) will throw on startup/requests if trust proxy is
misconfigured relative to the actual proxy chain, and trusting the whole chain blindly would let a client spoof
its rate-limit identity via a forged `X-Forwarded-For` entry.

## The plain-text quiz format

Full authoring reference (question types, grading rules, `CODE:`/`EXPLAIN:` extras) is in `README.md` — read it
before touching `quizParser.js`, since the parser's behavior *is* the format spec. `example-test.txt` (repo root
and `frontend/public/`, kept in sync) is a working sample covering every question type.
