# Changelog

All notable changes to this project are listed here, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- Works on phones and tablets: they can give their own size (sizes from 4 inches), the size field suggests 6.1" on a phone and 11" on a tablet, and the hint says where to find it. On screens under 768 px the result's options (Sample content, Full screen, Drawing only, Start over, Fine-tune, Details) sit in one Options menu, so the toolbar is one slim row; touch screens get 44 px tap targets.
- Phone and tablet sizes to compare with: a phone is offered 5.4/6.1/6.5/6.9" phones, a tablet 8.3/11/12.4/13" tablets, and "Show all sizes" lists every kind. Phones and tablets are drawn the way you hold your own screen.
- Fine-tune can also use a ruler, in cm or inches: 10 cm or 4 inches where it fits, 5 cm or 2 inches on a phone.
- Search and link previews: a sharper description, a canonical address, Open Graph and X card tags with a 1200 × 630 share image, structured data (a free web app by Notchup), `robots.txt` and `sitemap.xml`. Nothing is loaded from other sites; the privacy test allows the page's own address in this metadata only.

### Fixed

- Step 1's Next is no longer greyed out while the size field is empty: the grey example size next to a disabled button read as "that size is not allowed". Next now says what is missing.
- "Bank card" is now just "card": any bank, ID, driving licence, loyalty or library card has the same size, so people who pay by phone can measure too.
- A typed size on a phone or tablet held upright was drawn sideways, so "how far it reaches past each edge" was wrong; it now follows the screen's orientation like a card measurement.
- The bank card in Fine-tune is no longer cut off on small screens or high-density laptops: the drawer grows to fit the card at true size, a card wider than the window is drawn upright (with a note to hold it that way), and on a screen narrower than a card it is cut at the right edge so the top and bottom edges still line up. The slider now sits above the card, so it stays in reach on a phone.

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
- Remembers your screens on this browser, only if you ask: an unticked checkbox in the setup (and in Fine-tune) saves the screen with its width, height and pixel ratio, up to five. On the next visit the first question shows the matching screen (so several monitors work), for example "Your screen: 26.9"" and when it was remembered, with That's right, Measure again and Forget this screen (with a five-second Undo). The start view never shows remembered data. Rename, delete or forget all in Details. A shared link wins, Start over keeps them, and everything works when storage is blocked. `localStorage` is used only in `js/memory.js`.
- The Notchup emblem in the header links to notchup.fi ("Made by Notchup") and gets the company site's soft golden glow on hover and keyboard focus; the fade only plays when motion is allowed.
- The footer links to the source with the GitHub icon (named "Source on GitHub" for screen readers); the version is plain text.
- The start view has a closed "What is this?" note that says in a few words what the page does and that nothing leaves your browser.
- Header and favicon use the Notchup emblem (`assets/mark.svg`) next to the app name.
- An accuracy label under the area chip says whether the outline is real size ("measured with a card", "from your 21.5" screen size", or "based on MacBook Air 13" (detected)", the last two with a "Check with a card" link) or approximate (browser zoom is not 100 %, or the screen does not look like the one you picked). The small diagram in Details is titled "Scaled comparison (not real size)".
- Start over clears the comparison from the link and returns to the start view. Drawing only hides the toolbar and footer, with a floating Exit button and Esc to come back. Fine-tune has a Reset fine-tune button.
- Bank-card fine-tune ("Check the real size with a card") for screens that are not the laptop's built-in display or are not at 100 % zoom. While you drag it shows "Your screen is about 21.4"" and the guide has true-size rounded corners; the setup and Details then say "Measured with a card: about 21.4"", and the link keeps the exact card value.
- Shareable links: the comparison lives in the page's address (`size`, or `from` for a model; `res` only when edited; `to`, `cal`, `fill=1`).
- No cookies, no tracking and no requests to other sites, enforced by a test that scans the source. Browser storage is used only for screens you ask to remember (`js/memory.js`).
