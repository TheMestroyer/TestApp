# Study Test App

A self-grading quiz app for studying from plain-text test files. Register an account, drop in a test file, answer the questions, and your progress — answers, marks, score, everything — is saved to your account so you can pick it back up from any device.

This is the full-stack rewrite of the original single-file prototype (still available in [`legacy/`](legacy/) for reference). It's now:

- **Frontend:** React + Vite (`frontend/`)
- **Backend:** Node.js + Express + SQLite (`backend/`)
- Accounts with registration/login, each user's tests and progress stored server-side
- Deployable as Docker images behind your own nginx — see [`DEPLOY.md`](DEPLOY.md)

## Running it locally

You need two terminals — one for the backend, one for the frontend.

**Backend** (Express API on port 4000):
```
cd backend
npm install
cp .env.example .env   # then edit JWT_SECRET
npm run dev
```

**Frontend** (Vite dev server on port 5173, proxies `/api` to the backend):
```
cd frontend
npm install
npm run dev
```

Open the URL Vite prints, register an account, and drop in `example-test.txt` (also available at the repo root) to try the format.

For building Docker images and deploying to a server, see [`DEPLOY.md`](DEPLOY.md).

## How it works

Register or log in, then drag a test file onto the drop zone (or click it to browse). Each file you load becomes an entry in the **Test history** sidebar, tied to your account — click any entry to jump back into that test exactly where you left off (answers, marks, revealed answers, current question, and whether you'd already submitted).

- **Go to question** — type a question number and hit Go/Enter to jump straight to it.
- **Question grid** — every question number; click any one to jump to it. Any question with at least one answer gets a highlighted border. Arrow keys (Left/Right) also move between questions, and Enter reveals the answer for the current one — as long as focus isn't in a text field.
- **Mark for Review** — flags the current question with a dot in the grid.
- **Show Answer** — grades your current answer for just this question, on the spot, without affecting your score or locking the question. Click again to hide it.
- **Submit Answers** — grades the whole test, shows your score, and unlocks **Download Answer File** (a graded `.txt` summary) and, if the test has `short` questions, **Download Short-Answer Review File** (those questions' answers only, meant to be handed to someone — or an AI — to check by hand).
- **Retake This Test** — resets your answers for another attempt, keeping the same history entry.
- Click a test's name in the sidebar to rename it; the **×** removes it from your history permanently.

### Shared tests

The sidebar also has a **Shared tests** section, visible to every account — these are added by
the admin (whichever account's email matches `ADMIN_EMAIL`, see `.env.example`) from the **Admin
panel** link that only shows up for that account. Clicking a shared test gives you your own
private copy to answer and track progress on, same as any other test in your history (just
tagged "Shared") — everyone's answers and scores stay independent. Only the admin can add,
rename, replace, or remove the shared test itself from the Admin panel.

## Writing your own test file

Test files are plain text. The format is simple enough to type by hand.

### Basic structure

```
TITLE: My Quiz Name

QUESTION: <the question text>
TYPE: <single | multiple | fill | truefalse | short | match>
<options / answer, depending on type>
```

Blank lines between questions are optional. Keywords (`TITLE:`, `QUESTION:`, `TYPE:`, `ANSWER:`, `EXPLAIN:`, ...) are case-insensitive.

### Question types

**Single choice** — one correct answer, marked with a `*` right before it.
```
QUESTION: What is the capital of France?
TYPE: single
A) London
B) Berlin
*C) Paris
D) Madrid
```

**Multiple choice** — one or more correct answers, each marked with `*`. You must select exactly the correct set to get credit.
```
QUESTION: Which of these are mammals?
TYPE: multiple
*A) Dog
B) Shark
*C) Whale
D) Lizard
```

**Fill in the blank** — free text graded against an `ANSWER:` line. Separate multiple acceptable answers with `|`.
```
QUESTION: The chemical symbol for gold is ___.
TYPE: fill
ANSWER: Au | gold
```

**True / False**
```
QUESTION: The sun rises in the west.
TYPE: truefalse
ANSWER: FALSE
```

**Short answer** — no auto-grading, just recorded for manual review.
```
QUESTION: Briefly explain photosynthesis.
TYPE: short
```

**Put in order / match** — labeled slots (`FIELD:`) and a pool of draggable cards (`CARD:`). Mark which field a card belongs to with `*N` (1-based) right before its text; cards without `*N` are distractors. Cards shuffle every time the question loads.
```
QUESTION: Put the steps of a PC getting an IP address from a DHCP server in the correct order.
TYPE: match
FIELD: Step 1
FIELD: Step 2
FIELD: Step 3
FIELD: Step 4
CARD: *1 Client broadcasts a DHCPDISCOVER to find any available DHCP servers
CARD: *2 Server responds with a DHCPOFFER containing an available IP address
CARD: *3 Client sends a DHCPREQUEST accepting the offered IP from that server
CARD: *4 Server sends a DHCPACK acknowledging and finalizing the lease
CARD: Client manually configures itself with a static IP address
CARD: Server sends a DHCPNAK rejecting the request
```

### Extras

- `CODE:` / `ENDCODE` — an optional syntax-highlighted code block shown under the question text (highlighted as Java, but renders fine for any language).
  ```
  QUESTION: What does this print?
  CODE:
  int x = 5;
  int y = x++ + ++x;
  System.out.println(y);
  ENDCODE
  TYPE: fill
  ANSWER: 12
  ```
- `EXPLAIN:` — optional note shown after grading.
- Question text can span multiple lines — keep typing before the `TYPE:` line.
- Option labels (`A)`, `1.`, etc.) are optional; a bare `*Paris` also works.

### Grading rules

- Single/true-false: correct if you picked the marked option.
- Multiple choice: you must select exactly the marked options.
- Fill-in-the-blank: matched against the answer(s), ignoring case and leading/trailing spaces.
- Short answer: never auto-graded.
- Match: correct only if every field ends up with its correct card.
