# Study Test App

A tiny, offline, self-grading quiz app. No install, no server, no dependencies.

## How to run it

1. Open `index.html` by double-clicking it (or right-click → Open with → your browser).
2. Drag a test file onto the drop zone (or click it to browse for one).
3. Answer the questions — one is shown per page.
4. Click **Submit Answers** (in the side panel) to see your score and which ones you got right/wrong.
5. Click **Download Answer File** to save a graded results `.txt` file next to your test.

Everything runs locally in the browser tab. Nothing is uploaded anywhere.

`example-test.txt` in this folder is a ready-to-use sample — drag it in to see how it works.

## Test history (the sidebar)

The panel on the left keeps a history of every test file you've loaded in this browser, saved automatically as you work — no need to click anything to save.

- Loading a file (drag-and-drop or click-to-browse) adds it to the sidebar, or **resumes** it if you'd already loaded that exact file before, instead of creating a duplicate entry.
- Click any entry to jump back into that test, exactly where you left off: your answers, which questions you'd marked, which you'd revealed with Show Answer, which question you were on, and whether you'd already submitted (in which case it reopens already graded, with your score).
- Click a test's name to **rename** it in place (e.g. give it something more memorable than the file name) — press Enter or click away to save the new name, Escape to cancel.
- Each entry shows quick progress at a glance: "`x / y answered`" while you're still working through it, or "`Submitted — score`" once you've submitted.
- The small **×** removes a test from history permanently (it asks you to confirm first) — this only clears it from the sidebar, it doesn't touch the original file on disk.
- This all lives in your browser's local storage, tied to this folder/file on your machine — nothing leaves your computer, and clearing your browser data will clear this history too.

## Navigating a test

Only one question is shown at a time. The panel on the side (it moves above the question on narrow screens) gives you:

- **Go to question** — type a question number and hit Go/Enter to jump straight to it.
- **A number grid** — every question number, click any one to jump to it. It only shows numbers, not the questions themselves, so it won't spoil anything. Any question you've entered at least some answer for gets a subtle highlighted border, so you can see your progress at a glance before submitting.
- **Previous / Next** — step through one at a time.
- **Mark for Review** — flags the current question; marked questions get a small dot on their number in the grid so you can spot them at a glance and come back later. After you submit, the grid also colors each number green/red for correct/incorrect (the marked dot still shows on top of that).
- **Show Answer** — grades your *current* answer for this one question on the spot: whether it's correct, what the correct answer is, and any `EXPLAIN:` note — the same feedback you'd get from Submit, just for one question early. Click again (**Hide Answer**) to hide it, and click **Show Answer** again any time to re-check after changing your answer. It doesn't disable the question or touch your score — you can keep editing your answer afterwards, and it disappears once you submit, since the results already show every answer at that point. Short-answer questions have no auto-graded answer, so this just shows your current text and the `EXPLAIN:` note if there is one.

## Writing your own test file

Test files are plain text (`.txt` works fine). The format is simple enough to type by hand.

### Basic structure

```
TITLE: My Quiz Name

QUESTION: <the question text>
TYPE: <single | multiple | fill | truefalse | short | match>
<options / answer, depending on type>
```

Blank lines between questions are optional but make files easier to read. Everything is case-insensitive for the keywords (`TITLE:`, `QUESTION:`, `TYPE:`, `ANSWER:`, `EXPLAIN:`).

### Question types

**Single choice** — one correct answer. Mark the correct option by putting a `*` right before it.
```
QUESTION: What is the capital of France?
TYPE: single
A) London
B) Berlin
*C) Paris
D) Madrid
```

**Multiple choice** — one or more correct answers. Mark every correct option with `*`. You must select exactly the correct set to get credit.
```
QUESTION: Which of these are mammals?
TYPE: multiple
*A) Dog
B) Shark
*C) Whale
D) Lizard
```

**Fill in the blank** — free text, graded against an `ANSWER:` line. You can give more than one acceptable answer separated by `|`.
```
QUESTION: The chemical symbol for water is ___.
TYPE: fill
ANSWER: H2O
```
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

**Short answer** — no auto-grading (useful for open-ended questions you want to self-check afterwards). Just recorded in the results file.
```
QUESTION: Briefly explain photosynthesis.
TYPE: short
```

**Put in order / match** — a set of labeled slots (`FIELD:`) and a pool of draggable cards (`CARD:`). You drag (or tap, then tap a slot) each card into the slot it belongs in. There must be at least as many cards as fields — any extra cards are distractors that don't belong anywhere. Mark which field a card belongs in with `*N` (1-based) right before its text; cards with no `*N` are distractors.

This is the type to use for "put these steps in order" questions — the fields are the ordered positions (Step 1, Step 2, ...) and the cards get shuffled every time the question loads, so it's never trivially already in order.

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

It doesn't have to be about ordering — `FIELD:` labels can be anything (e.g. categories), and cards get matched to whichever field their `*N` points to.

### Extras

- `CODE:` / `ENDCODE` — an optional code block shown under the question text, rendered in a monospace, syntax-highlighted box (like a little IDE) instead of being folded into the question paragraph. Whitespace and line breaks inside it are preserved exactly. Currently highlighted as Java, but it renders fine for any language — you just won't get colored keywords.
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
- `EXPLAIN:` — optional line under any question, shown after grading (e.g. a short note on why the answer is correct):
  ```
  QUESTION: The largest planet is ___.
  TYPE: fill
  ANSWER: Jupiter
  EXPLAIN: Jupiter is more than twice as massive as all other planets combined.
  ```
- Question text can span multiple lines — just keep typing before the `TYPE:` line; the lines get joined together.
- Option labels (`A)`, `1.`, etc.) are optional — the app just strips them if present. A bare `*Paris` also works.

### Notes on grading

- Single/true-false: correct if you picked the marked option.
- Multiple choice: you must select exactly the marked options (no more, no fewer) to be marked correct.
- Fill-in-the-blank: matched against the answer(s), ignoring case and leading/trailing spaces.
- Short answer: never auto-graded — always shown as "not auto-graded" so you can judge it yourself.
- Put in order / match: correct only if every field ends up with its correct card. Wrong fields show which card should have gone there once graded.

## The answer file

After you submit, **Download Answer File** saves a `<your-file-name>-results.txt` containing your score, time taken, and for every question: your answer, the correct answer, and whether you got it right — plus any `EXPLAIN:` notes.

## Getting short-answer questions checked

`short` questions aren't auto-graded, so if your test has any, a **Download Short-Answer Review File** button also appears after you submit. It saves a `<your-file-name>-short-answers-for-review.txt` containing just those questions and your answers (plus any `EXPLAIN:` reference notes), with a short instruction header. Drag that file into a chat with Claude (or hand it to whoever's checking your work) to get them graded/reviewed.
