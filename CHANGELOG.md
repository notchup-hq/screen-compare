# Changelog

All notable changes to this project are listed here, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## 0.1.0 – 2026-11-18

Early preview.

### Added

- Draws a laptop screen at its true physical size on the screen you are using, centred in the free space below the controls. Sizes come from real panel numbers (MacBook Pro and Air, Framework, Surface), each with a link to the maker's spec page, or from generic laptop and monitor sizes (diagonal and aspect ratio only).
- Three clear views built from standard controls: a start view (headline, a small illustration and one button), a setup dialog with two plain questions (how big is your screen, then which size are you thinking of, as four big buttons), with the resolution and aspect ratios in Details and the result, where the true-size outline is the hero on a dimmed page with its width and height in centimetres and one chip with the area. Motion is CSS only and is skipped with `prefers-reduced-motion`.
- Asks for your screen's size in inches instead of a model: with the detected resolution it gives the exact scale (`ppi / devicePixelRatio / 2.54`), so desktop monitors and external screens work too. Quick picks for laptops and monitors, a laptop model list and a bank-card measurement are other ways to give the size. A laptop is suggested from its resolution only when it matches a known model; a monitor's size is never guessed.
- Sample content (a mock desktop at the screen's default scaling) is off by default and clipped inside the outline. Details and the bank-card fine-tune open in a drawer from the right.
- The outline is always drawn whole. If it does not fit the free space, the page offers Full screen; for a bigger screen, Full screen shows your screen's edges and how far the other one reaches past each side.
- The size fields have their own − and + buttons (and ArrowUp/ArrowDown) that step half an inch, starting from 24 when the field is empty, within 10 to 100 inches. A comma works as the decimal point, and Next stays disabled until there is a number.
- Each setup question has an optional, closed-by-default hint ("Why do you ask?", "How accurate is this?") that explains why the size is needed, where to find it, how accurate the outline is and that nothing leaves the page.
- The footer is one slim line that stays at the bottom of the window without a page scrollbar (the outline area ends above it); short or narrow windows scroll normally.
- Header and favicon use the Notchup emblem (`assets/mark.svg`) next to the app name.
- An accuracy label under the area chip says whether the outline is real size ("measured with a card", "from your 21.5" screen size", or "based on MacBook Air 13" (detected)", the last two with a "Check with a card" link) or approximate (browser zoom is not 100 %, or the screen does not look like the one you picked). The small diagram in Details is titled "Scaled comparison (not real size)".
- Start over clears the comparison from the link and returns to the start view. Drawing only hides the toolbar and footer, with a floating Exit button and Esc to come back. Fine-tune has a Reset fine-tune button.
- Bank-card fine-tune ("Check the real size with a card") for screens that are not the laptop's built-in display or are not at 100 % zoom. While you drag it shows "Your screen is about 21.4"" and the guide has true-size rounded corners; the setup and Details then say "Measured with a card: about 21.4"", and the link keeps the exact card value.
- Shareable links: the comparison lives in the page's address (`size`, or `from` for a model; `res` only when edited; `to`, `cal`, `fill=1`).
- No cookies, no storage and no requests to other sites, enforced by a test that scans the source.
