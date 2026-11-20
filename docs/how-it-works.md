# How it works

The details behind [the README](../README.md): what each view does, how the scale is worked out, how a screen is detected, what is remembered, the dev commands, how to add a preset and how releases and deploys work.

## The views

**Start.** A headline, "See any screen at its real size", one line, a small illustration and one button, **Compare screens**. A closed "What is this?" says why you would use it. The start view never shows remembered data, and on a phone it fits without scrolling. Without JavaScript the page shows a short explanation instead of the button.

**Setup**, a small dialog with two questions, one at a time:

1. **How big is your screen?** A detected laptop shows as one line ("MacBook Air 13"") with **That's right** and **No, change it**. Otherwise there is one number field in inches (4 to 100, a comma works as the decimal point), with − and + (also the arrow keys and the + and − keys; C clears the field) stepping a tenth of an inch up to 20" and half an inch above, from a suggested size: 24, or 6.1 on a phone and 11 on a tablet. **Next** says what is missing if the field is empty. Other ways to answer: **Pick your laptop model** (after "No, change it"), **Pick your phone model** (on a phone, from the start) or **Measure with a card**. A remembered screen is shown here to confirm, with Measure again and Forget this screen (with Undo).
2. **Compare with which screen?** Four big buttons, each drawn to scale, of your own kind: phones (5.4, 6.1, 6.5, 6.9"), tablets (8.3, 11, 12.4, 13"), laptops (13, 14, 15, 16") or monitors (24, 27, 32, 34" wide). **Show all sizes** adds the other kinds. **Other size or a specific model** reveals a size field and a model list; whichever you changed last is used. A tap goes straight to the result.

Each question has a closed hint ("Why do you ask?", "How accurate is this?").

**Result.** The page dims and draws the other screen as a gold outline at its real size, centred, with its width and height in centimetres and one chip ("14" is 85 % of your screen's area"). Phones and tablets are drawn the way you hold your own screen. The slim toolbar shows "your screen vs the other" (both open the setup again), Sample content (a mock desktop at the screen's default scaling, off by default), Full screen, Drawing only, Start over, **Fine-tune** and **Details**; under 768 px Full screen stays in the toolbar as an icon and the rest sit in one Options menu. In full screen one Exit button takes you back (top right on a phone, bottom right on larger screens). Details (the numbers, the resolution, the aspect ratios, a to-scale overview, remembered screens) and Fine-tune open in a drawer. The outline is always drawn whole: if it does not fit, the page shows both screens to scale (small enough that the whole card fits the window, also on a phone) and offers Full screen, which for a bigger screen shows how far it reaches past each of your edges.

**Fine-tune** is a fitting screen: lay a card on the drawn card (or a ruler on the drawn scale), adjust with − slider + until they match, and press **Set**. More options holds the choice of card, ruler in cm or ruler in inches (10 cm or 4 in where it fits, 5 cm or 2 in on a phone), Remember and Reset.

Motion is CSS only and is skipped with `prefers-reduced-motion: reduce`.

**Footer.** On every view except full screen and Drawing only: Made by Notchup, the licence and privacy line (from 768 px), a moon or sun button for dark or light, **EN | FI** with the current language underlined, the source link and the version (from 360 px). The buttons are 44 px tap targets, so the footer line is 44 px high.

## Theme and language

The page follows the system's light or dark setting. The moon or sun button switches to the other one; switching back to what the system uses forgets the choice, so the page follows the system again. English is the default; FI switches every text at once, the setup, drawers and stage included, and writes numbers the Finnish way (13,3", 1,9 cm). Both choices are remembered in this browser (see below) and apply on the next visit.

How it is built: all text in `index.html` and `js/` is English, and that English is the key into one Finnish dictionary, `js/fi.js`. Scripts call `t('Show {size}"', { size })` from `js/i18n.js`; the static markup is translated by walking its text nodes and text attributes (`aria-label`, `title`, `placeholder`, `alt`). Changing an English text means changing its key in `js/fi.js` too: `tests/i18n.test.js` fails on any text without a Finnish translation and on any translation nothing uses. The theme is a `data-theme` attribute on `<html>` that overrides the system's colours in `styles.css`. Search engines and link previews stay English.

## Privacy and remembered screens

Your choices are kept in the page's link, so you can share a comparison. No cookies, no tracking. A dark or light theme or the Finnish language you pick is remembered in this browser under its own `localStorage` key; picking the default again removes it. Your screens are remembered in this browser only if you ask, and never leave it: tick "Remember this screen on this browser" and the page keeps up to five screens (a name, the size and the screen's width, height and pixel ratio) in `localStorage`, so the right one is picked on the next visit, which also works with several monitors. Rename or delete them in Details, or "Forget all". A shared link always wins over a remembered screen. Only `js/memory.js` touches storage (two keys, one for screens and one for the theme and language); `tests/privacy.test.js` scans the source for cookies, other storage APIs, `fetch(`, forms and external URLs (only the footer links, spec-page references and XML namespaces are allowed), and `./dev check` runs it.

## How calibration works

Browsers do not know a screen's physical size (a CSS inch is 96 CSS px, not a real inch). They do report the resolution and `devicePixelRatio`, so the one missing number is the diagonal, and the page gets it one of three ways, strongest first:

1. **A card or a ruler.** Bank, ID, driving licence, loyalty and library cards share one size (ISO/IEC 7810 ID-1, 85.60 × 53.98 mm). "Don't know? Measure with a card" (or Fine-tune in the result) lets you adjust an on-screen card, or a ruler scale, until it matches the real one, then press Set. That sets the scale directly and is saved in the link as `cal`.
2. **A typed size.** The diagonal in inches, from 4 to 100, for example 21.5 (decimals are fine, comma or dot; curved screens use the size the maker quotes). Saved as `size=21.5`.
3. **A model.** A laptop the page recognised from your resolution, or a laptop or phone model you picked. Its panel size is used.

With the size and the native resolution the scale is exact:

```
physical px = screen.width × devicePixelRatio (and height)
ppi         = √(w² + h²) / diagonal in inches
CSS px / cm = ppi / devicePixelRatio / 2.54
```

The resolution is detected and shown in Details ("Resolution: 1920 × 1080 (detected)"); you can change it there behind **Not right?** (the resolution the display is set to now), and the link then carries `res=1920x1080`. The aspect ratio comes from the resolution; only when there is no usable resolution do ratio chips appear in Details (`ratio=16x9` in the link). A 21.5" 1920 × 1080 monitor gives the same size at 100 % and at Windows 125 % scaling. The maths is one pure function in `js/scale.js`.

Limits:

- A model is only right on that laptop's **built-in screen**. For a typed size or a card, any screen works. Use the card whenever in doubt; it needs nothing else.
- The "Approximate" labels (browser zoom is not 100 %, or the screen does not look like the model you picked) only appear when the size came from a model, because that is the only case where the page can tell.
- Presets use the real panel size (a 16" MacBook Pro is 16.2", 3456 × 2234), not the marketing size. Monitors and tablets are generic sizes only (diagonal and ratio are all that matter), so there is no list of them to keep up to date. Phone models use the size measured as a rectangle where the maker gives it.

The link carries `size` (with `res` or `ratio` only when needed) or `from` (a model), plus `to`, `cal` if you used a card (it wins over the rest) and, if you turn sample content on, `fill=1`. Older links with `from=c-16.0-16x10` still open (as a typed 16" size).

## Screen detection

If the link does not say how to know your screen, the page reads `screen.width × devicePixelRatio` and `screen.height × devicePixelRatio` (swapped if portrait) and looks for **laptop models with a spec page** (Apple, Framework, Surface) with that native resolution, allowing 2 px for fractional scaling:

- **One match:** the first question shows it ("MacBook Air 13"") with "That's right" and "No, change it".
- **Several matches, or none:** the first question is an empty number field; you type the size (or pick a model after "No, change it", or measure with a card).

Generic sizes and monitors are never guessed: a 1920 × 1080 screen fits too many monitors, so the size is left for you to type. Scaled modes that merely look like another laptop's default (a MacBook Air 13 set to "More space" reports the Air 15's default size) are not matched either. This is a guess, runs in your browser and nothing is sent or stored. The matching lives in `js/detect.js`.

## Dev commands

No build step and no dependencies. The `dev` helper serves the folder and opens the page.

Linux, macOS and WSL (needs `python3`, or Node.js for `npx`):

```
./dev serve --open
```

Windows PowerShell:

```
.\dev.ps1 serve -Open
```

If PowerShell blocks the script, run `powershell -ExecutionPolicy Bypass -File .\dev.ps1 serve -Open`.

See all commands with `./dev help`:

```
./dev serve [--port N] [--open]   serve the repo (default port 8080, or $PORT)
./dev test [--watch]              run the tests
./dev screenshot [--width N ...] [--query Q] [--out DIR] [--name X] [--wait MS]
                                  regenerate docs/screenshot.png, or shoot at several widths (Playwright via npx, on demand)
./dev check                       tests, plus a check that the page, CSS and JS load over HTTP
```

`.\dev.ps1` offers `help`, `serve` and `test`; `check` and `screenshot` need bash (use WSL).

`npx serve .` works too. Do not open `index.html` straight from disk: browsers block ES modules on `file://`.

Run the tests with `./dev test` (it runs Node's built-in runner: `node --test tests/*.test.js`).

To check a result, pick your own screen, compare with a smaller one and hold a ruler to the outline.

## Adding a screen preset

Presets live in one file: `js/screens.js`. Add an entry to `SCREENS`:

```text
{
  id: 'mbp14',                 // short slug, used in the URL
  name: 'MacBook Pro 14" (M1 Pro – M4)',
  group: 'Apple',              // heading in the lists: Apple, Framework, Microsoft, Generic laptops or Monitors
  kind: 'laptop',              // 'laptop', 'monitor', 'tablet' or 'phone'; only laptop models with a source are detected
  short: 'MacBook Pro 14"',          // used in the toolbar and the chip; keep the size in inches in it
  diagonalIn: 14.2,            // panel diagonal as the maker states it
  resX: 3024, resY: 1964,      // native panel pixels
  looksLike: [1512, 982],      // default scaled size, for the sample-content view
  source: 'https://support.apple.com/en-us/121553',
}
```

Check every number against the maker's own spec page and put that URL in `source`. Use the real panel numbers, not the marketing ones. Generic laptop sizes and monitors have no single maker and leave `source` out; add monitors only as generic sizes. A generic size's `name` and `short` are words, so add their Finnish to `js/fi.js` (`./dev test` says which are missing); model names stay as they are.

## Versions

The version lives in one place, `js/version.js`, and must match the newest heading in [CHANGELOG.md](CHANGELOG.md). `./dev test` and `./dev check` fail if they differ. The page shows it in the footer (linked to the changelog).

## Deploy

Deployed through Cloudflare's dashboard Git integration: every merge to `main` deploys, and pull requests get preview URLs. There is no build command and the output directory is `/`. The repo holds no Cloudflare config, IDs or tokens.

Keep Cloudflare Web Analytics **off** for this project: it injects a third-party script and would break the no-tracking promise.
