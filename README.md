# TenTalk NBA

A dependency-free static website for TenTalk's NBA trips, tools and interactive games.

## Routes

- `/` — existing NBA Trips experience and the prediction-game entry point.
- `/play/` — reusable interactive-games hub.
- `/play/2026-27-predictions/` — 2026–27 prediction challenge.

The prediction challenge includes accessible conference ranking controls, local autosave, Level 1 results, a 30-team win allocator constrained to 1,230 wins, opt-in balancing suggestions, result observations and sharing tools. Level 2 follows each user's Level 1 East/West order and enforces non-increasing wins within each conference. It uses verified 2025–26 final regular-season standings as its baseline.

Community submissions, live survey count and averages use the private-sheet Google Apps Script in `backend/google-apps-script/`. Until its public `/exec` URL is configured in `community-config.js`, the site remains in local-only mode and does not fabricate Community data.

## Run locally

Open `index.html` directly, or serve the folder with any static server:

```bash
python3 -m http.server 4173
```

Then visit `http://127.0.0.1:4173`.

The future-interest form uses a hosted HTTPS endpoint after owner configuration.

## September 2026 enhancements

The site remains a dependency-free static GitHub Pages website. No build step or hosting migration is required. Preserve the existing repository Pages configuration; there is no checked-in Actions deployment workflow.

- `calculator.js`: fixed pricing configuration and deterministic, validated calculation function.
- `enhancements.js`: compact player wall, quiz, calculator UI and HTTPS interest submission handling.
- `form-config.js`: public form endpoint, empty until owner setup.
- `FORM_SETUP.md`: free-tier limits, private notifications, privacy and launch checklist.

Run tests with `node --test tests/calculator.test.cjs tests/prediction-data.test.cjs tests/prediction-core.test.cjs`.
Quiz and calculator selections remain in page memory only; no local storage or response collection is used.
The interest form remains unavailable until its real backend endpoint is configured. See `FORM_SETUP.md`; actual inbox delivery must be checked before launch.
