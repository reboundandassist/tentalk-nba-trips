# TenTalk

A responsive one-page website for TenTalk's mission to visit all 30 NBA arenas.

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

Run calculation tests with `node --test tests/calculator.test.cjs`.
Quiz and calculator selections remain in page memory only; no local storage or response collection is used.
The interest form remains unavailable until its real backend endpoint is configured. See `FORM_SETUP.md`; actual inbox delivery must be checked before launch.
