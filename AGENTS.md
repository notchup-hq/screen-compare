# screen-compare

A static page that draws a laptop, phone or monitor at its real physical size on the screen you are using now. MIT licensed, made by Notchup. What each view does and how the scale is worked out: [docs/how-it-works.md](docs/how-it-works.md). Keep that file in step with any change in behaviour.

## Rules

- **Stack:** plain HTML, one stylesheet (`styles.css`), small ES modules in `js/`. No build step, no npm dependencies, no framework, no third-party scripts, fonts or trackers.
- **Privacy:** state lives in the URL. No cookies, no requests. `localStorage` only for screens the user chose to remember and the theme and language they picked, and only in `js/memory.js`; the page works the same when storage is blocked. `tests/privacy.test.js` enforces this.
- **Languages:** English and Finnish, English the default. All text is English in the code and markup, and `js/fi.js` holds its Finnish (keyed by the English). Change both together; `tests/i18n.test.js` fails on a missing or unused translation. Plain, natural Finnish.
- **Accuracy:** presets live only in `js/screens.js`, with real panel numbers (not marketing sizes) and a maker's spec page as `source` for every model. Only laptop models are ever detected from the resolution; never guess a monitor's, tablet's or phone's size. The scale maths stays one pure, tested function in `js/scale.js`.
- **UI:** simple enough for anyone. Standard controls only (native `<dialog>`, `<details>`, buttons, a range input), one question per step, at most one primary button, plain words (no "resolution" or "diagonal" outside Details), and the UI says "card", never "bank card". Mobile first: works from 320 px, 44 px touch targets, and the start view fits a phone without scrolling.
- **Accessible:** semantic HTML, labels, keyboard use, WCAG AA contrast in light and dark, all motion inside `prefers-reduced-motion: no-preference`.
- **Look:** follows notchup.fi. Navy and gold tokens in `styles.css`, system fonts, logo served from `assets/`. Gold (`--gauge`) marks anything measured.
- **Search and previews:** a changed headline or description changes the `<title>`, meta description and Open Graph tags together. Absolute URLs point only at https://screen-compare.notchup.fi/.

## Workflow

- Branch (`feat/...`, `fix/...`), draft PR, merge when tested. Never commit to `main`; never push, tag or open a PR unless asked.
- Commits: Conventional Commits (`feat: add tablet sizes`), imperative, 72 characters or fewer, then a short `- ` bullet body on what and why. One logical change per commit, no WIP or fixup commits. Tidy a branch with `git reset --soft` before its first push.
- Author: the owner's GitHub no-reply address from git config; never change `user.email`. No AI attribution lines in commits or PRs (switched off in `.claude/settings.json`).
- No secrets, Cloudflare IDs or tokens in the repo, and nothing about anyone's machine.

## Commands

```sh
./dev serve --open    # serve the folder (ES modules do not load from file://)
./dev test            # unit tests, including the privacy scan
./dev check           # tests, then check that every file loads over HTTP
./dev screenshot      # regenerate docs/screenshot.png
```

PowerShell: `.\dev.ps1 serve|test`. Run tests quietly; show the output only on failure.

## Deploy and releases

- Cloudflare Pages via its Git integration: a merge to `main` deploys https://screen-compare.notchup.fi, and PRs get preview URLs. No build command, output directory `/`. Cloudflare Web Analytics stays off (it injects a script).
- The version lives only in `js/version.js` and must match the newest `## x.y.z – date` heading in `CHANGELOG.md` (`tests/version.test.js`). A PR adds its changes under `## Unreleased`.
- Until 1.0 the header shows a "Preview" badge and the README an "Early preview" line. For 1.0 remove both, set the version and add the changelog entry. The owner tags releases (`v0.2.0`).

## For agents

- Session start: read `.local/README.md` if it exists (gitignored working notes).
- Never read `assets/*.svg` or `js/screens.js` in full; use grep or a line range.
- Screenshots go to `.local/shots/` (gitignored), at 1280 px unless the change is about layout.
