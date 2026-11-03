# Prompt 05: Nudges, break reminders, notifications, floating mini widget

Copy everything below the line into Cursor's Agent chat.

---

Next for SitGlow: making it helpful without being annoying. Read `docs/posture-engine.md` sections 6 and 7, and `docs/product-spec.md` sections 1.6, 1.7, 1.9, 2.6, 2.7. Visual targets: `design/screens/live-nudge-floating-widget.jpg`, the break banner in `design/screens/desktop-dashboard.jpg`, and `design/screens/earlier-set/05-focus-reminders.jpg`.

Build:
1. `src/lib/posture/nudges.ts`: the pure nudge state machine (OK → BELOW → NUDGING → COOLDOWN/SNOOZED) with threshold, 30 s sustain, hysteresis, 5 min cooldown, max 6/hour, gated frames pausing the timer. Unit-test it with fake timers.
2. `src/lib/posture/adaptive.ts`: adaptive strictness from "Fixed it" vs "Snooze" responses, bounded as described, persisted locally; Settings slider "Gentle ↔ Strict" + "Reset to defaults".
3. **Nudge card** UI: specific message for the dominant issue (e.g., "Lean back a little - you're 5 in closer than your best"), buttons **Fixed it** and **Snooze 15 min**, success toast "Perfect! Posture back to {score}".
4. **Break reminders**: every 45 min of presence (configurable 20-90), optional water reminder; banner "You've been sitting 45 minutes. Time for a short stretch." with "Take a break" (opens `/break`, a placeholder for now) and "Later" (snooze 10 min). Count breaks per day locally.
5. **Desktop notifications** (opt-in in Settings, Notification API) only when the tab is hidden; clicking focuses the app.
6. **Floating mini widget**: picture-in-picture using the Document Picture-in-Picture API (Chrome/Edge) showing a small mirrored preview with the score and "sit back to glow" hint; fallback to video PiP with the score drawn on a canvas; friendly message if unsupported. Lower inference fps while in background.
7. Optional soft chime (off by default).

**How to verify**
- Slouch on purpose for about 30 seconds → a nudge card appears with a specific tip. Tap "Fixed it", sit up → "Perfect! Posture back to 90"-style toast.
- Slouch again right away → no new nudge for about 5 minutes (cooldown).
- Tap "Snooze 15 min" → no nudges for 15 minutes.
- In Settings, set break interval to 1 minute (temporary test) → break banner appears.
- Turn on notifications, switch to another tab, slouch for 30 s → a desktop notification appears.
- Click "Mini widget" on Live view → a small floating window with your score stays on top when you switch to another app.
- `npm test` passes (nudge state machine tests).
