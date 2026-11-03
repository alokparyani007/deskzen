# Reminders redesign: "Your day rhythm", a beautiful standout screen plus delightful pop-ups

Match these mockups closely. The visual polish is the point.
- design/reminders/reminders-hub.jpg: the Reminders page
- design/reminders/reminders-popups.jpg: the reminder pop-up cards
Colors:
- emerald #059669 for posture and move
- sky blue for water
- violet (#7C3AED) for eye breaks
- amber #F59E0B for standing
- mint #ECFDF5 gradients
Use rounded cards, soft shadows, generous spacing and friendly copy. US wording, no medical claims.

Today, src/features/reminders/RemindersPage.tsx is a plain list (Focus buttons, neck stretch photos, links). Keep the existing logic in src/lib/wellness/intervals.ts, the settings, startFocus and logWater, and build a new UI on top. Everything stays on-device.

## 1. Reminders page: "Your day rhythm"
- Title "Your day rhythm" with the subtitle "Smart reminders that fit your workday."
- **Left hero: the Day dial.** A large SVG ring for the workday, from the user's work start to work end in settings (defaults 9 AM to 6 PM). Hour labels sit around the ring.
  - A glowing emerald arc shows the time passed today, animated smoothly, static under reduced motion.
  - Small colored icon dots sit around the ring at each upcoming reminder time for the rest of today (water drop, move figure, eye, standing figure, spot check), computed from the real schedules. A lunch or quiet-hours segment is shaded with a moon or fork icon.
  - Hover or tap a dot for "Water at 2:45 PM", with Skip this one.
  - Center: "Next up", the next reminder's icon and name, a live countdown ("in 12 min"), and a "Snooze all 30 min" pill.
  - Done reminders show as small filled dots on the passed arc, so the day fills up.
- **Right: reminder cards**, one per type. Each has a colored rounded icon tile, title, a one-line schedule, a toggle, and frequency chips to change it (tapping a chip opens a small popover with options):
  1. Posture nudges: "When you drift for 30 sec" (options 15, 30 and 60 s, plus gentle, normal or strict)
  2. Move breaks: "Every 50 min" (30, 45, 50, 60, 90)
  3. Water: "Every 45 min · 5 of 8 today" (frequency plus daily goal)
  4. Eye breaks 20-20-20: "Every 20 min"
  5. Stand and stretch: "Every 60 min" (show it only for stand or mixed work styles, or if the user turns it on; it follows the existing sit-stand intervals)
  6. Posture spot check: "Every 30 min" (the camera turns on briefly, using the existing spot check feature)
- **Bottom strip:**
  - Quiet hours (moon icon, an editable time range, nothing fires during it)
  - Focus mode (headphones icon, opens the existing focus lengths of 25, 50 and 90 min, and holds all pop-ups except posture until done)
  - Voice reminders on/off
- Keep links to the Stretch library and the Neck check-in as small secondary links.
- Responsive: the dial goes on top and the cards below on mobile.

## 2. Pop-up reminder cards (in-app)
- A new component, src/features/reminders/ReminderCard.tsx, slides up at the bottom-right with a soft spring (fade only under reduced motion).
- Each card: a small colored category label ("WATER", "POSTURE", "EYE BREAK", "MOVE"), a large friendly illustration, a title, one line of text, and buttons:
  - **Water:** "Time for a sip", "Glass 6 of 8 today", Done (logs a glass), Snooze 10 min
  - **Posture:** a small round live-camera thumbnail with the dashed emerald best-posture outline (from the Posture Print), "Ease back into your outline", plus the specific tip ("Glide your chin back a little"), Fixed it / Not now. It auto-closes with "Nice! ✓" when the posture is back.
  - **Eye break:** an eye illustration with a 20 s violet countdown ring, "Look 20 feet away", "20 seconds. Let your eyes relax.", Start (the ring counts down, then "Done ✓")
  - **Move:** a stretching woman illustration, "Stretch break, 2 min", "You've been sitting 50 min", Let's go (opens a 2-min guided stretch from the library) / Skip
  - **Stand:** "Time to stand for a bit", Standing now / Later
- Illustrations: create simple, polished flat SVGs in public/media/reminders/ (water-glass.svg, eye-break.svg, stretch.svg, stand.svg) in the brand colors, friendly and rounded. Feature women in the people illustrations.
- Speak the title and tip when voice is on, using the shared voice helper.
- Every action is logged (done, snoozed, skipped), so Progress can count breaks, water, stretches and eye breaks.

## 3. Smart timing
- Never show more than one pop-up at a time. If two are due within 3 min, combine them ("Stretch and sip": a stretch card with a water line) or queue them at least 2 min apart.
- Don't fire during the Posture Print calibration, quiet hours or Focus (except posture), and pause when the user is away (no face for 2 min).
- When the tab is hidden, use the browser Notification API, asking for permission once with a friendly explainer. Clicking the notification focuses the app and opens the card. Fall back to the in-app card only.
- If the user dismisses the same type 3 times in a row, gently offer: "Want these less often?" with one tap to switch to the next longer interval.

## 4. Tests
- The dial places reminder dots at the correct times from the schedules.
- Quiet hours block reminders.
- Collisions within 3 min are combined or queued.
- Snooze moves the next time.
- Done on water logs a glass.
- The hidden-tab path calls Notification only when permission is granted.

When done, tell me in plain English how to check it: open Reminders and see the dial with today's upcoming reminders; set Water to every 1 min (add a dev-only 1-min option) and confirm the water card pops up, Done logs a glass and the dial updates.
