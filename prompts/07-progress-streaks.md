# Prompt 07: Progress dashboard + streaks (local storage)

Copy everything below the line into Cursor's Agent chat.

---

Next for SitGlow: progress. Read `docs/product-spec.md` sections 1.8 and 2.5 (and 2.3 / 2.4 for neck check and screen-distance alerts). Visual targets: "This week" chart and "Today" ring in `design/screens/desktop-dashboard.jpg`, `design/screens/phone-home.jpg`, `design/screens/earlier-set/08-progress.jpg`, `design/screens/earlier-set/09-neck-check.jpg`.

Build:
1. `src/lib/progress/`: pure functions that aggregate the per-minute IndexedDB records into daily stats (average score, minutes sitting well (score ≥ 70), tracked minutes, breaks, water), streaks (a day counts if average ≥ 70 and ≥ 30 tracked minutes, a starting rule in config), best streak, 7-day and 30-day trends. Day boundaries in local time. Unit-test thoroughly (including streak breaks, gaps, DST change).
2. **Progress page**: today summary, 7-day bar chart (daily average, emerald bars), 30-day trend line, current and best streak with amber glow, accessible table fallback for charts. Use a light chart library (e.g., Recharts) or simple SVG.
3. **Home** now uses real data: greeting with the user's name, Today ring, Sitting well / Breaks / Water tiles, weekly chart. Friendly empty states.
4. **Screen-distance alerts**: when estimated distance < 18 in for 60 s (config), a gentle tip "You're about 15 in from your screen. Try sitting back to about 20-25 in." Toggle in Settings.
5. **Neck check**: a 30-second guided check-in (look up, down, left, right, level) saving only numbers and showing how today compares with your baseline. Wording: "check-in", not diagnosis.
6. Settings: "Export my data (JSON)" and confirm "Delete all my data" still clears everything.

**How to verify**
- Use the app for 10+ minutes → Home and Progress show today's real score and time sitting well.
- Run the dev helper (ask the Agent to add a `/debug` "Seed 14 days of sample data" button) → the weekly chart, trend, and streak fill in correctly.
- Sit very close to the screen for a minute → the screen-distance tip appears.
- Export my data downloads a JSON file with only numbers (no images).
- `npm test` passes.
