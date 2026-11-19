# screen-compare

Static web page that shows how big another laptop screen is, at true physical size, on the screen you are using now. MIT licensed, made by Notchup.

## Rules

- Plain HTML, one CSS file (`styles.css`), small ES modules in `js/`. No build step, no npm dependencies, no framework, no third-party scripts, fonts or trackers.
- Mobile first, responsive, accessible: semantic HTML, labels, AA contrast, keyboard use, `prefers-reduced-motion`.
- English UI first.
- Look follows notchup.fi: navy and gold tokens in `styles.css`, logo in `assets/` (served from this site, never hotlinked), system fonts only. Gold (`--gauge`) is for anything measured (outline, card); keep text at WCAG AA contrast in both schemes.
- State lives in the URL query (shareable link). No cookies, no browser storage.
- Screen presets live only in `js/screens.js`, use real panel numbers (not marketing sizes) and carry a `group` (the heading in the screen lists) and a `source` URL to the maker's spec page. Each also has a `short` name with its size in inches, used in the toolbar and the area chip.
- Three views, standard controls only (no custom widgets): **Start** (no comparison in the URL: logo, headline, one button), **Setup** (a native `<dialog>`: a `<select>` with `<optgroup>`s for your screen, size pills or a model list for the other one) and **Result** (a link with `to` and a known screen: the true-size outline on a dimmed stage, a slim toolbar, and Details and Fine-tune in a right-side `<dialog>` drawer). Sample content is off unless `fill=1`. The outline is never drawn overflowing: when it does not fit the free space the stage offers Full screen. All motion sits inside `prefers-reduced-motion: no-preference`.
- Physical size: `width = diagonal * ratio / sqrt(ratio^2 + 1)`; px per mm = `screen.width / physical width`. Assumes built-in screen and 100 % zoom; bank-card calibration (85.60 x 53.98 mm) overrides it.
- Footer on every view: "Made by Notchup · Knock it up a notch!" (https://notchup.fi), "Source on GitHub", "MIT licence".

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
- Cloudflare Web Analytics must stay off for this project (it injects a script). Privacy is enforced by `tests/privacy.test.js`: no storage APIs, `fetch(`, forms or external URLs beyond footer links, spec sources and XML namespaces.
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
