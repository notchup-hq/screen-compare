# How it works

The details behind [the README](../README.md): what each view does, how the scale is worked out, how a screen is detected, what is remembered, the dev commands, how to add a preset and how releases and deploys work.

## The views

The page opens with a headline, "See any screen at its real size", one line ("Pick a laptop or monitor size and see it true to scale, right on the screen you have now.") and one button, **Compare screens**; it never shows remembered data. The button opens a small dialog with two questions, one at a time. **How big is your screen?** is the size in inches, typed or stepped half an inch at a time with − and + (or the arrow keys, or the + and − keys; C clears the field) (a comma works as the decimal point; a detected laptop only needs a "That's right"; a bank card can measure it instead). **Compare with which screen?** is four big buttons (13", 14", 15", 16" laptops, or 24", 27", 32", 34" monitors when your screen is a monitor), or any other size or a specific model (the one you used last wins); a tap goes straight to the result. The resolution and aspect ratios are in Details. The result then dims the page and draws the other screen as a crisp gold outline at its real physical size, centred, with its width and height in centimetres on two edges and one chip, for example "14" is 85 % of your screen's area". Sample content (a mock desktop at the screen's default scaling) is off by default and, when you turn it on, stays clipped inside the outline.

The slim toolbar shows "your screen vs the other" (both open the dialog again), the Sample content switch, **Fine-tune** and **Details**. Details (the numbers, a to-scale overview and how accurate this is) and the bank-card fine-tune open in a drawer from the right and are closed by default. The outline is always drawn whole: if it does not fit the free space below the toolbar, the page says so, shows both screens to scale and offers **Full screen**. If the other screen is bigger than yours, Full screen shows your screen's edges and how far the bigger one reaches past each side.

Motion is CSS only (the illustration on the start view shrinks and grows gently). With `prefers-reduced-motion: reduce` there is no animation and the end state shows at once. Without JavaScript the page shows a short explanation instead of the button.

## Privacy and remembered screens

Your choices are kept in the page's link, so you can share a comparison. No cookies, no tracking. Your screens are remembered in this browser only if you ask, and never leave it: tick "Remember this screen on this browser" and the page keeps up to five screens (a name, the size and the screen's width, height and pixel ratio) in `localStorage`, so the right one is picked on the next visit, which also works with several monitors. Rename or delete them in Details, or "Forget all". A shared link always wins over a remembered screen. Only `js/memory.js` touches storage; `tests/privacy.test.js` scans the source for cookies, other storage APIs, `fetch(`, forms and external URLs (only the footer links, spec-page references and XML namespaces are allowed), and `./dev check` runs it.

## How calibration works

Browsers do not know a screen's physical size (a CSS inch is 96 CSS px, not a real inch). They do report the resolution and `devicePixelRatio`, so the one missing number is the diagonal, and the page gets it one of three ways, strongest first:

1. **A card.** Bank, ID, driving licence, loyalty and library cards share one size (ISO/IEC 7810 ID-1). "Don't know the size? Measure with a card" (or Fine-tune in the result) lets you drag a slider until an on-screen card (85.60 × 54 mm) matches a real one. That sets the scale directly and is saved in the link as `cal`.
2. **A typed size.** The diagonal in inches, from 10 to 100, for example 21.5 (decimals are fine, comma or dot; curved screens use the size the maker quotes). Saved as `size=21.5`.
3. **A laptop model.** "Pick a model…", or the model the page recognised from your resolution. Its panel size is used.

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
- Presets use the real panel size (a 16" MacBook Pro is 16.2", 3456 × 2234), not the marketing size. Monitors are generic sizes only (diagonal and ratio are all that matter), so there is no monitor list to keep up to date.

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

Check every number against the maker's own spec page and put that URL in `source`. Use the real panel numbers, not the marketing ones. Generic laptop sizes and monitors have no single maker and leave `source` out; add monitors only as generic sizes.

## Versions

The version lives in one place, `js/version.js`, and must match the newest heading in [CHANGELOG.md](CHANGELOG.md). `./dev test` and `./dev check` fail if they differ. The page shows it in the footer (linked to the changelog).

## Deploy

Deployed through Cloudflare's dashboard Git integration: every merge to `main` deploys, and pull requests get preview URLs. There is no build command and the output directory is `/`. The repo holds no Cloudflare config, IDs or tokens.

Keep Cloudflare Web Analytics **off** for this project: it injects a third-party script and would break the no-tracking promise.
