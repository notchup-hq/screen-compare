# Review before a pull request

How a change gets a second look before Pete reviews it. Written for any coding agent:
`AGENTS.md` points here, so Claude Code, Codex, Cursor and Copilot follow the same loop. The tests
decide; a review is advice on top of them.

## When

- **A change to behaviour, layout, tests or tooling**: one review before the pull request.
- **A big change** (a new view, a new kind of screen, a change to the scale maths): review the plan first, before any code is written.
- **Skip** for copy-only and docs-only changes; the tests are enough.

## The loop

1. Run `./dev check` until it is green. A review never overrules a failing test.
2. Review in a fresh context, never in the session that wrote the code. In Claude Code that is the
   `reviewer` agent (`/review-loop` runs the whole loop). In another tool, open a new chat, give it
   this file, `AGENTS.md` and `git diff origin/main...HEAD`, and ask for a review.
3. Fix the blocking findings and run `./dev check` again.
4. Review once more, on the fixes only. Stop after two rounds: list what is left in the pull
   request description under **Open review notes**, so Pete decides.

## What the reviewer checks

- **Correct:** the diff does what the pull request says, also at 320 px, with the keyboard, with
  less motion and with storage blocked.
- **Rules:** every rule in `AGENTS.md` that the diff touches.
- **Tests:** new behaviour has a test with one reason to fail; no test skipped or loosened.
- **Simple:** no dead code, no abstraction for a single use, existing helpers reused.
- **In step:** `docs/how-it-works.md`, `CHANGELOG.md` under Unreleased, `js/fi.js` for every changed text, and a maker's `source` for every preset.

## How findings are written

One line each: file and line, what is wrong, why it matters, the fix. Mark it **blocking** (a
broken rule, a bug, a missing test) or **suggestion**. Say "no blocking findings" when there are
none.
