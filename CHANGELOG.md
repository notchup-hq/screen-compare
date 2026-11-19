# Changelog

All notable changes to this project are listed here, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## 0.1.0 – 2026-11-18

Early preview.

### Added

- Draws a laptop screen at its true physical size on the screen you are using, centred in the free space below the controls. Sizes come from real panel numbers (MacBook Pro and Air, Framework, Surface and generic sizes), each with a link to the maker's spec page, or from a custom diagonal and aspect ratio.
- Three clear views built from standard controls: a start view (headline, a small illustration and one button), a setup dialog (your screen from a grouped list, the other one as 13"–16" pills or a model list) and the result, where the true-size outline is the hero on a dimmed page with its width and height in centimetres and one chip with the area. Motion is CSS only and is skipped with `prefers-reduced-motion`.
- Suggests your current screen from its resolution (a guess you can correct).
- Sample content (a mock desktop at the screen's default scaling) is off by default and clipped inside the outline. Details and the bank-card fine-tune open in a drawer from the right.
- The outline is always drawn whole. If it does not fit the free space, the page offers Full screen; for a bigger screen, Full screen shows your screen's edges and how far the other one reaches past each side.
- Header and favicon use the Notchup emblem (`assets/mark.svg`) next to the app name.
- An accuracy label under the area chip says whether the outline is real size (calibrated with a card, or based on your screen choice with a "Check with a card" link) or approximate (browser zoom is not 100 %, or the screen does not look like the one you picked). The small diagram in Details is titled "Scaled comparison (not real size)".
- Start over clears the comparison from the link and returns to the start view. Drawing only hides the toolbar and footer, with a floating Exit button and Esc to come back. Fine-tune has a Reset fine-tune button.
- Bank-card fine-tune ("Check the real size with a card") for screens that are not the laptop's built-in display or are not at 100 % zoom.
- Shareable links: the comparison lives in the page's address (`from`, `to`, `cal`, `fill=1`).
- No cookies, no storage and no requests to other sites, enforced by a test that scans the source.
