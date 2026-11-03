# Phase 2 of 3: Posture Print, the sitting calibration flow
Read REQUIREMENTS-posture-print.md (the what) and prompts/09-posture-print.md (the full technical spec and numbers). Follow the ground rules in section 2 of the requirements.
Phase 1 (the brain in src/calibration) is already built. Use it.

Build ONLY user stories US1 to US6 and US8 (USER-FACING FLOW steps A to F in the spec): the privacy card, Setup Check with four chips and a Setup Score, Body Reset with captions, optional on-device voice and Skip movements, the Lock ring (wobble pauses, never resets), Catch Me feeding the two-point thresholds, the Glow-up reveal with inch estimates and a share PNG drawn from outlines only, and the confidence-based save, tip or retry.
Put it behind `posturePrintV2`. The old calibration must still work with the flag off.
Accessibility: captions, keyboard, aria-live, reduced motion (progress bar instead of the orb).

When done, tell me in plain English what changed and how to test the sitting first run in 5 minutes. Run the tests and the build.
