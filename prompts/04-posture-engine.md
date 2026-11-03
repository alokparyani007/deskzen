# Prompt 04: Posture engine + live score

Copy everything below the line into Cursor's Agent chat.

---

Now the core: the SitGlow posture engine. Implement **exactly** what `docs/posture-engine.md` describes (read the whole file carefully), plus `docs/product-spec.md` section 1.5. Visual targets: `design/screens/live-slouch-vs-good-posture.jpg` and the "Posture now" / "Today" cards in `design/screens/desktop-dashboard.jpg`.

Build:
1. `src/lib/posture/readSignals.ts`: `readSignals(landmarks, baseline): SignalReadings` for all 5 signals (lean-in via IPD ratio, head drop, shoulders shrug/round, lateral tilt, screen distance in inches), with quality gating (visibility < 0.6, absent, multiple faces, rapid motion, implausible scale).
2. `src/lib/posture/score.ts`: dead-zone + smoothstep sub-scores, weighted sum with weights from `config.ts`, re-normalize when a signal is missing, time-based EMA (tau ≈ 2.5 s), labels (Great/Good/Okay/Time to reset), `dominantIssue`, rolling quality 0-1.
3. A `usePostureScore` hook wiring landmarks → signals → score, and a lightweight store so any page can read the live score.
4. **Live view UI:** large score ring (emerald good / amber okay / soft coral low, amber glow halo), callouts like "Leaning in 4 in", "Head dropped", "Shoulders rounded", or positives "Eye level with screen", "Shoulders relaxed", "24 in from screen". Announce label changes via `aria-live="polite"`.
5. Home "Posture now" card and "Today" ring use the live/average score. Save a per-minute average score to IndexedDB (numbers only) for later progress charts.
6. A dev page `/debug` showing each sub-score and deviation live, with a "Record numbers" button that downloads a JSON of scores/signals (never video), for the test plan in posture-engine.md §9.
7. Full **Vitest** unit tests from posture-engine.md §9 (signals, scoring, re-normalization, EMA at different fps).

Keep the "SitGlow is a wellness tool, not a medical device" note in the info tooltip on the score.

**How to verify**
- Calibrate sitting tall, then go to Live view: score should be ~85-100.
- Lean toward the screen and slump for a few seconds: the score smoothly drops (aim for below 60) and "Leaning in" / "Head dropped" callouts appear.
- Sit back up: the score climbs back within a few seconds; it doesn't flicker when you sit still.
- Reach for a drink quickly: the score shouldn't crash.
- On `/debug`, record 2 minutes upright and 2 minutes slouched; the upright median should be at least ~25 points higher. If not, tell the Agent the numbers and ask it to tune `config.ts`.
- `npm test` passes.
