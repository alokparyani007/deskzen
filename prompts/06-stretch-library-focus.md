# Prompt 06: Stretch library + focus mode

Copy everything below the line into Cursor's Agent chat.

---

Next for SitGlow: stretches and focus. Read `docs/product-spec.md` sections 2.1 and 2.2 and the tone rules in `docs/brand.md` (no medical claims). Visual targets: `design/screens/stretch-break.jpg`, `design/screens/earlier-set/06-stretch-library.jpg`, `design/screens/earlier-set/07-stretch-break.jpg`, `design/screens/earlier-set/05-focus-reminders.jpg` (ignore the old "Desk Habits" name).

Build:
1. `src/features/stretches/data.ts`: typed list of at least 12 desk-friendly stretches across Neck, Shoulders, Back, Wrists, Eyes, Legs (id, name, category, duration seconds, 3-5 plain steps, image placeholder). Wording like "may help you feel looser", never "cures" or "treats".
2. **Stretch library** page with category filters and cards (image, name, duration).
3. **Stretch break player** (`/break`): pre-built 1-3 minute routines; big friendly timer, step text, next/previous, pause, "Done" → counts a break, confetti-free amber glow celebration (respects reduced motion). The break banner from prompt 05 opens this.
4. **Focus mode**: start 25 / 50 / 90 minute sessions; posture still tracked; nudges become silent (widget glow only) or batched until the session ends; at the end suggest a stretch break. Visible timer in the shell; can end early.
5. Tests for routine duration math and focus-mode nudge suppression.

**How to verify**
- Open the Stretch library → filter by "Neck" shows only neck stretches.
- Start a break → timer counts down, steps advance, "Done" increases today's Breaks count on Home.
- Start a 25-minute focus session (temporarily set to 1 minute for testing) → slouching doesn't pop up a nudge card; at the end you're offered a stretch break.
- `npm test` passes.
