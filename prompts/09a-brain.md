# Phase 1 of 3: Posture Print, the brain (no new screens yet)
Read REQUIREMENTS-posture-print.md (the what) and prompts/09-posture-print.md (the full technical spec and numbers). Follow the ground rules in section 2 of the requirements.

Build ONLY:
- The `posturePrintV2` feature flag (default on in dev).
- `src/calibration/config.ts` with every tunable number from the spec.
- The Posture Print data model (spec item 8), saved separately per mode (sit/stand) and per desk profile, plus a `version` field and a migration so existing baselines become low-confidence prints. Don't rename storage keys.
- Feature extraction split into INTERNAL and EXTERNAL features (spec item 1), reusing existing signal code.
- Per-frame quality gates (item 2), capture and aggregation with a 20% trimmed mean and MAD, falling back to the existing median (items 3 and 4), personal deadbands (5), two-point thresholds from a slouch sample (6), and the confidence score (7).
- Adaptive-learning guardrails (item 9) as pure functions.
- Unit tests for all of the above, including "never learns a slouch" and the migration.

First, list where today's camera, engine, calibration, storage and sit/stand code live, and propose your file plan. Keep the app working. Run the tests and `npm run build` at the end.
When done, give me a plain-English summary of what changed, file by file.
