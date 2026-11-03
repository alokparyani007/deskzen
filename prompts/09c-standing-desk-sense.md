# Phase 3 of 3: Standing print, Zen Check, auto re-anchor, Desk Sense
Read REQUIREMENTS-posture-print.md (the what) and prompts/09-posture-print.md (the full technical spec and numbers). Follow the ground rules in section 2 of the requirements.
Phases 1 and 2 are already built. Use them.

Build ONLY:
- US7, the standing first run (spec "STANDING first run").
- US9, the Daily Zen Check.
- US10, the "That's my good posture" button, the "Print tuned" note, and Settings > "Reset to my original print", wired to the Phase 1 guardrails.
- US11, the camera-moved detector, silent re-anchor, the re-check prompt, and "New desk? Give it a name." desk profiles (spec item 10).
- US12, Desk Sense sit/stand switching (spec item 11): transition detection including background shift, comparing against both prints, 15 s / 60 s hysteresis, "Standing now?" for the first 3 switches then Undo, and a manual toggle plus keyboard shortcut. Retire the old face-height rule as the main signal.
- US13 "Too strict? Let's tune it" (item 12), US14 edge cases (item 13), analytics events, and the `?debug=1` overlay.
- Tests for camera-move vs. posture change and the Desk Sense hysteresis.

When done, give me the full 10-minute manual test plan from section 7 of the requirements (including how to fake "tomorrow" for the Zen Check), plus the config.ts numbers I should tune first. Run the tests and the build.
