# screen-compare

Static web page that shows how big another laptop screen is, at true physical size, on the screen you are using now. MIT licensed, made by Notchup.

## Rules

- Plain HTML, one CSS file (`styles.css`), small ES modules in `js/`. No build step, no npm dependencies, no framework, no third-party scripts, fonts or trackers.
- Mobile first, responsive, accessible: semantic HTML, labels, AA contrast, keyboard use, `prefers-reduced-motion`.
- English UI first.
- Look follows notchup.fi: navy and gold tokens in `styles.css`, logo in `assets/` (served from this site, never hotlinked), system fonts only. Gold (`--gauge`) is for anything measured (outline, card); keep text at WCAG AA contrast in both schemes.
- State lives in the URL query (shareable link). No cookies. `localStorage` only for screens the user chose to remember (a checkbox, nothing stored until it is ticked): `js/memory.js` is the only code that touches storage (one versioned key, every access in try/catch, the page works the same when storage is blocked), nothing else is stored and nothing is sent anywhere. A shared link always wins over a remembered screen.
- Screen presets live only in `js/screens.js`, use real panel numbers (not marketing sizes) and carry a `group` (the heading in the screen lists), a `kind` (`laptop` or `monitor`) and, for laptop models, a `source` URL to the maker's spec page. Generic laptop sizes and monitors (generic sizes only, no monitor models) have no `source`. Each also has a `short` name with its size in inches, used in the toolbar and the area chip. Only laptop models with a `source` are ever detected from the resolution; never guess a monitor's size.
- Three views, standard controls only (no custom widgets): **Start** (no comparison in the URL, and never any remembered data: logo, the headline "See any screen at its real size", the line "Pick a laptop or monitor size and see it true to scale, right on the screen you have now.", one button "Compare screens", and one closed native `<details>` "What is this?" with a two-sentence explanation for someone who has never seen the page), **Setup** (a native `<dialog>` with two plain questions, one per step, one heading, at most one primary button and one link (the remembered screen has two), one unticked "Remember this screen on this browser" checkbox under the main button of step 1 (also after a card measurement; hidden when storage is blocked; unticking a remembered screen forgets it), one optional native `<details>` hint under the main control (closed by default, no JavaScript; "Why do you ask?" in step 1, "How accurate is this?" in step 2; the dialog scrolls inside itself when one is open), no section labels, plain words (no "resolution", "aspect ratio" or "diagonal"), fits 360 px without scrolling. Step 1 "How big is your screen?": a detected or known laptop shows as one big line with "That's right" and "No, change it" (which adds a "Pick your laptop model" link); otherwise one big number field in inches with − and + buttons (44 px, "Smaller" / "Larger"; they and the arrow keys (Up/Right larger, Down/Left smaller) and the + and − keys step 0.5 inch, and C clears the field, start from the placeholder when empty (24, or 6.1 on a phone and 11 on a tablet: a touch screen with a short side under 500 or 1100 CSS px), clamp to 4–100 so phones and tablets can give their own size; a comma works as the decimal point) and a "Next" button that stays disabled until there is a number, with "Don't know? Measure with a bank card" as the only link. Step 2 "Compare with which screen?": four big buttons that go straight to the result, laptops 13/14/15/16" or, when your screen is 19" or more, monitors 24/27/32/34" wide, each drawn to scale; one link "Other size or a specific model" reveals a number field and a model list that are two alternatives (the one changed last is used, the other is dimmed, not disabled, with a "Not used" note for screen readers) and a button that says what it shows ("Show 22"", "Show MacBook Pro 14""); "Back" returns to step 1. A remembered screen for this display (same screen width, height and pixel ratio) does not skip step 1, it is shown there: "Your screen: 26.9"" (or the model name), a quiet "Remembered on this browser, 18 Nov 2026" ("over a year ago, still right?" after twelve months), the primary "That's right" and two links, "Measure again" (the number field, prefilled) and "Forget this screen" (deletes it at once, shows the normal step 1 and a "Forgotten" note with Undo for 5 s). Up to 5 screens, renamed or deleted in Details > Remembered screens, "Start over" never deletes them) and **Result** (a link with `to` and a known screen: the true-size outline on a dimmed stage, a slim toolbar with Full screen (where the browser allows it), Drawing only and Start over (under 768 px these, Sample content, Fine-tune and Details sit in one Options menu: a disclosure button that closes on Esc, a click outside or any action; the toolbar keeps the logo, the two screen buttons and Options, with 44 px targets on touch screens) (no swap: the scale always comes from your real screen), an accuracy label under the area chip ("measured with a card", "from your 21.5" screen size", "based on <model> (detected)"; Approximate warnings only when the size came from a model), and Details and Fine-tune in a right-side `<dialog>` drawer; everything technical lives in Details: which model or size was used, the resolution (editable behind "Not right?"), the aspect ratios, and the card fine-tune). Drawing only and full screen always show a floating Exit button, and Esc leaves Drawing only. The big outline is the real-size view; the small diagram in Details is titled "Scaled comparison (not real size)". Sample content is off unless `fill=1`. The outline is never drawn overflowing: when it does not fit the free space the stage offers Full screen. All motion sits inside `prefers-reduced-motion: no-preference`.
- Physical size: `width = diagonal * ratio / sqrt(ratio^2 + 1)`. Scale: `ppi = hypot(native w, native h) / diagonal`, CSS px per cm = `ppi / devicePixelRatio / 2.54` (`js/scale.js`, one pure function, unit tested). A typed size is turned to the screen's current orientation (a phone held upright is taller than wide), as a card measurement already is. The diagonal is typed, taken from a model, or measured with a bank card (85.60 x 53.98 mm); precedence is `cal`, then `size`, then `from`. The link stores `size=21.5` (and `res=1920x1080` only if edited, `ratio=16x9` only without a usable resolution), `from=<model>` or `cal`.
- Footer on every view, one slim line that stays in view: the body is a full-height grid (view over footer) on windows 768 px wide and 560 px tall or more, so the start and result views never scroll the page; smaller windows scroll normally. "Made by Notchup · Knock it up a notch!" (https://notchup.fi), "MIT licence", the privacy note, and last the GitHub icon link (accessible name "Source on GitHub") right next to the version as plain text, all centred. Full screen and Drawing only name both screens under the area chip.
- Search and link previews: `index.html` has a canonical link, a meta description, Open Graph tags with `assets/og.png` (1200 x 630) and `twitter:card`, and one JSON-LD `WebApplication` block; `robots.txt` and `sitemap.xml` sit at the root. Absolute URLs there point only at https://screen-compare.notchup.fi/ (plus schema.org and notchup.fi in the JSON-LD), which `tests/privacy.test.js` allows in `index.html` only. A changed headline or description is changed in the `<title>`, the meta description and the Open Graph tags together; a new share image is made at 1200 x 630 and kept small.

## Workflow

- Never commit to `main`. Work on a branch (`feat/...`), open a draft PR, merge once tested locally. Every merge to `main` deploys and PRs get preview URLs (see Deploy and secrets).
- Commit rules: see Commits below.
- Never push or open PRs without being asked in that moment.
## Commits

- Header: Conventional Commits, `type: summary` (a scope is optional: `type(scope): summary`). Types: `feat`, `fix`, `docs`, `chore` (and `test`, `refactor` when they fit). For example `feat: add screen presets`, `fix: keep the picker open on scrollbar clicks`, `docs: explain calibration`, `chore: add privacy check`. Imperative mood, 72 characters or fewer.
- Then a blank line and a short body (`- ` bullets) saying what changed and why.
- One logical change per commit.
- No WIP, "fix typo" or fixup commits, and no AI attribution (`Co-Authored-By`, "Generated with", session links) on a branch that gets pushed. Claude Code's own trailers are switched off in `.claude/settings.json` (`attribution.commit` and `attribution.pr` set to empty strings).
- Before a branch is pushed, tidy it into logical commits (`git reset --soft` and recommit, no interactive rebase) and check the tree is unchanged with `git diff <old-tip> HEAD`.
- The author address is the owner's GitHub no-reply address, already set in git config. Never commit with another address and never change `user.email`; check with `git log -1 --format=%ae`.

## Commands

- `./dev serve [--port N] [--open]`: serve the repo root (default port 8080, or `$PORT`). Open the page over HTTP; ES modules do not load from `file://`.
- `./dev test [--watch]`: run `node --test tests/*.test.js`.
- `./dev screenshot [--width N ...] [--query Q] [--out DIR] [--name X] [--wait MS]`: regenerate `docs/screenshot.png`, or shoot several widths (Playwright via `npx`, nothing added to the project; needs the system libs from `sudo npx playwright install-deps chromium`).
- `./dev check`: tests (including the privacy scan), then check that `index.html`, the CSS and every JS module load over HTTP.
- `./dev help`: usage. PowerShell: `.\dev.ps1 help|serve|test`.

## Deploy and secrets

- Deploy runs through Cloudflare's dashboard Git integration: merge to `main` deploys, PRs get previews. No build command, output directory `/`. Live at https://screen-compare.notchup.fi.
- Cloudflare Web Analytics must stay off for this project (it injects a script). Privacy is enforced by `tests/privacy.test.js`: `localStorage` only in `js/memory.js`, no sessionStorage, IndexedDB, cookies, `fetch(`, forms or external URLs beyond footer links, spec sources and XML namespaces.
- No Cloudflare config, account or project IDs, or tokens in this repo. If a `wrangler.jsonc` is ever needed, keep it to the project name and assets directory only.

## Releases

- The version lives only in `js/version.js` (`VERSION`). It must equal the newest `## x.y.z – date` heading in `CHANGELOG.md` (Keep a Changelog style); `tests/version.test.js` enforces it, so `./dev check` fails on a mismatch.
- Until 1.0 the header shows a small "Preview" badge and the README has an "Early preview" line.
- When the owner says "release 1.0": remove the Preview badge (`index.html` and `.badge` in `styles.css`) and the README preview line, set `VERSION = '1.0.0'`, add a `## 1.0.0 – <date>` entry to `CHANGELOG.md`, run `./dev check`, and commit as `chore: release 1.0.0`.
- The owner tags and pushes (`v0.1.0` after merge). Never tag or push without being asked.

## Working cheaply

- Screenshots at 1280 px only, unless the change is about layout. Save them to `.local/shots/` for the owner instead of looking at them; look at one only as the final check.
- Never read `assets/*.svg` or the presets data (`js/screens.js`) in full; use grep or a line range.
- Run tests and the privacy check with quiet output; show the full output only on failure.

## Local memory

Session start: read .local/README.md and follow it.
