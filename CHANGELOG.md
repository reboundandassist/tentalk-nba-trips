# September 2026 enhancement

- Preserved the opening design, arena map, 2023–2027 chapters, guide and About text; About now follows future-interest registration.
- Retained all 36 existing headshots, names and badges. Featured Four remain visible; remaining 32 collapse by default, with keyboard/touch button and responsive 8/4/3-column grid. Removed visible Tier 1 ranking label.
- Added exactly three specified quiz scenarios, original result copy, correct B-answer thresholds, restart and entertainment disclaimer.
- Added all eight calculator inputs, immediate dependent constraints, fixed-price module, five cost categories, ±10% rounded range and complete recap. Responses are not stored.
- Replaced old campaign intake with requested fields, explicit consent and privacy notice. HTTPS Formspree integration handles disabled processing, page-session duplicates, errors and confirmed success. Administrator address is absent from public implementation.
- Kept static GitHub Pages compatibility and existing anchors. No new framework, tracking, booking or payments.

## Validation

Five calculation tests passed (four brief cases plus invalid selections). Browser suite passed at widths 1440, 768, 390 and 320: no page overflow, keyboard accordion, all quiz outcomes, calculator result/constraints, mocked invalid/success/duplicate/failure/unconfigured submissions, no JavaScript page errors. Desktop and mobile screenshots reviewed. Preserved map, chapters, guide and About HTML compared byte-for-byte. All 36 player assets and badges retained.

Calculation checks: case 1 HKD17,000–21,000; case 2 HKD34,000–41,500; case 3 HKD72,500–89,000; case 4 HKD23,000–28,500.

## Pending launch checks

Owner must activate Formspree and verify real private notification delivery, privacy settings and monitored request channel using FORM_SETUP.md. No account or paid plan was created. Current repository Pages configuration was preserved; remote deployment was not performed or verified. Existing GitHub Pages settings could not be inferred from local files (no checked-in Actions workflow).

Run `node --test tests/calculator.test.cjs`. For browser QA, start the local server, make Playwright available, then run `node tests/browser.test.cjs`. Set `TENTALK_CHROME_PATH` if using an installed Chrome executable. All provider requests in the browser suite are mocked; no real visitor data is submitted.

## Follow-up copy and calculator adjustment

- Count now reads 現場看過 36 位 All-Star比賽. Counting notes moved below the supporting player grid inside the collapsed wall.
- Removed 2027 invitation/contact CTA and the travel-agency cooperation phrase from the optional interest checkbox.
- Added 重新預算 after the complete result, returning focus to the calculator while retaining all selections. Users can change individual variables and submit again; 重新選擇 still clears all inputs.
- Browser verification passed: existing three-game same-coast estimate HKD34,000–41,500 changed to HKD36,500–45,000 after changing only domestic travel to cross-country. All selections were retained, counting notes remained hidden until expansion, and requested deletions were verified.
