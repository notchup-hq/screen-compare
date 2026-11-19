# screen-compare

Static web page that shows how big another laptop screen is, at true physical size, on the screen you are using now. MIT licensed, made by Notchup.

## Rules

- Plain HTML, one CSS file (`styles.css`), small ES modules in `js/`. No build step, no npm dependencies, no framework, no third-party scripts, fonts or trackers.
- Mobile first, responsive, accessible: semantic HTML, labels, AA contrast, keyboard use, `prefers-reduced-motion`.
- English UI first.
- State lives in the URL query (shareable link). No cookies, no browser storage.
- Screen presets live only in `js/screens.js`, use real panel numbers (not marketing sizes) and carry a `source` URL to the maker's spec page.
- Physical size: `width = diagonal * ratio / sqrt(ratio^2 + 1)`; px per mm = `screen.width / physical width`. Assumes built-in screen and 100 % zoom; bank-card calibration (85.60 x 53.98 mm) overrides it.
- Footer on every view: "Made by Notchup" (https://notchup.fi), "Source on GitHub", "MIT licence".

## Workflow

- Never commit to `main`. Work on a branch (`feat/...`), open a draft PR, merge once tested locally. Every merge to `main` deploys (Cloudflare Pages, no build command, output dir `/`).
- Conventional Commits with a scope, one logical change per commit, no AI attribution lines.
- Never push or open PRs without being asked in that moment.
- Tests: `node --test tests/`. Run locally: open `index.html` or `npx serve .`.

## Working cheaply

- Screenshots at 1280 px only, unless the change is about layout. Save them to `.local/shots/` for the owner instead of looking at them; look at one only as the final check.
- Never read `assets/*.svg` or the presets data (`js/screens.js`) in full; use grep or a line range.
- Run tests and the privacy check with quiet output; show the full output only on failure.

## Local memory

Read `.local/README.md` (gitignored working memory) and the current branch's notes at session start.
