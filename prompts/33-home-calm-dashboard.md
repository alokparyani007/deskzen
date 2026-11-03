# 33 · Home: Calm dashboard (rebuild)

Rebuild the Home screen (`/app`) to match `design/home-v2/B2-calm-dashboard.jpg`.
Scope: `src/features/home/HomeScreen.tsx` and its children (`LiveHero`, `HomeStats`, `HomeRhythm`), on both desktop (`DesktopHome`) and phone (`PhoneHome`).
Reuse existing data, hooks, and pure helpers. Don't invent metrics, and don't add any new storage.

## Don't touch
- Set my Zen (`src/features/zen2/*`, `/set-my-zen`), Live view (`LiveViewV2`, `useLiveV2`, `src/features/live/*`), and outline tracing (`OutlineSvg`, `usePersonOutline`, `snapshotOutline`, `fitScore`, `lib/vision/toScreen`). You may import these, but don't edit them.
- Sidebar logic (`src/components/Sidebar.tsx`, `src/app/nav.ts`), `TabBar`, and the router.

## Theme
- The Home **content area** moves to the dark premium theme used by Set my Zen and Live: the `bg-stage`/`bg-dock` tokens, white text, emerald `print`/brand accents, mint `#ECFDF5` pill, and amber `#F59E0B` only for drift/slouch.
- Other app pages (Progress, Reminders, Settings) stay light, and so does `AppShell`'s white shell. **Keep the Sidebar and TabBar exactly as they are (light).** The mockup's dark sidebar is illustrative only.
- Home renders its own full-height dark panel inside `<main>`.
- `AppShell` renders `<ModeBar />` above Home. On `/app` only, skip it (extend the existing `live || immersive` check), because Home now carries the Sitting/Standing/Auto toggle. Leave `ModeBar` on the other pages.

## Layout (desktop ≥1024px, target 1440×900)
1. **Greeting row:** `greeting(hour, settings.name)` as H1, with **one** mint pill to its right showing `feelGood({...})`. Both helpers are in `lib/home/liveHome.ts`. Keep `HomeGreeting`'s inputs and the existing message priority: tall % delta, then breaks, then streak, then fresh start.
2. **Main row:** a grid of about 60/40.
   - Left is the **camera card**, which should be tall (it fills most of the viewport height; at 900px tall the video is ≥ 520px).
   - Right is **3 stacked metric cards**, each the same height as the camera card.
3. **"Your day so far":** a slim single-line strip built from `dayTimeline(minutes, nowMs, timeZone)`. Use emerald for `great`, blue (`sky-brand`) for `drift`, amber (`glow`) for `slouch`, and dark gray for empty/future. Outline the current hour (`slot.now`). Put tiny "9 AM" / "5 PM" end labels and keep the sr-only text.
4. **Bottom strip:** bell icon plus "Next reminder in N min · {label}" on the left, compact quick chips on the right.
5. Footer: "DeskZen is a wellness tool, not a medical device." Move it out of `ScoreCard` and center it under the page.

## Camera card (rewrite `LiveHero`)
- **Outline:** must match Live view. Load the print with `loadZenPrint(mode, activeProfileId, !postureManual)` (`features/zen2/zenPrint.ts`), where `mode` is `'sit'`/`'stand'` from `useSession().posture`. Draw `print.zen.outline` with `OutlineSvg` inside a `useStageBox()` container. Use the same props as `LiveViewV2`:
  - `saved`
  - `videoWidth`/`videoHeight` from `landmarks.videoWidth/Height`, falling back to `camera.resolution`, then 1280×720
  - `viewWidth`/`viewHeight` from the stage box
  - `amber` when drifting

  Use `CameraStage ... frame="fill" chrome="bare"`, the same as Live, so the coordinate boxes match.
- Don't run segmentation (`usePersonOutline`) on Home. The saved outline is enough. Drop the legacy `LockedOutline`/`fitLockedPose` path from Home.
- **Match % pill:** small, in the top-left corner of the video, with a dot colored by the existing thresholds (≥80 print, ≥60 glow, else alert).
  - Compute it the way Home does today: `printDrift(landmarks, print, print.lockedPose)` then `liveFromPrint(amount).score`.
  - Or, if `print.zen` exists, use `fitScore` + `smoothFit`, the same way `useLiveV2` does.

  Pick one, keep it in a small `useHomeMatch()` hook in `features/home/`, and don't edit `useLiveV2`.
- **Buttons under the video:**
  - "Start Live view" is the **primary** solid emerald button, linking to `/live`.
  - "Set my Zen" is the **secondary** outlined button, linking to `/set-my-zen?pose=${pose}&from=home`.
  - The segmented "Sitting | Standing | Auto" control on the right keeps the existing `choosePosture` / `followPosture` / `postureManual` logic from `ModeButton`.
- **States to keep:**
  - Loading skeleton.
  - **Camera off:** `PrintStill` and a "Turn on camera" button that calls `camera.start()`.
  - **No Print:** "Set my Zen to save your Posture Print" with copy and a Set my Zen button. If a print exists but has no `.zen`, show "Set your Zen again" (same wording as Live).
- Nothing may overlay the face or shoulders. Put status text only in corners or under the video.

## Metric cards (rewrite `HomeStats`; real data only)
All values come from `useSession()` (`minutes`, `dayCounts`, `timeZone`). Split today and yesterday with `localDayKey` (`lib/progress/aggregate.ts`).

| Card | Value | Comparison |
|---|---|---|
| Posture score today | `Math.round(averageScore(today))` | `todayLine(today, yesterday)` (`lib/home/liveHome.ts`) |
| Sitting well | `minutesInState(today,'great')`, shown with `formatDuration` | `±N min vs yesterday`; emerald when up, neutral when flat |
| Breaks | `` `${counts.breaks} of ${habitGoals.breaks}` `` (`lib/progress/dashboard.ts`) | difference from yesterday's `dayCounts.breaks` |

- When there's no data, show "—" and "Starts today". Each card links to `/progress` or `/reminders`, as now.
- Remove the Water and Slouch tiles from Home. Water stays reachable through the chip.
- Use small emerald line icons from lucide: `Gauge`, `CircleCheck`, `Coffee`.
- `PrintCard` ("Zen set on …") goes away. Keep `printIsStale` as a one-line note under the camera buttons: "Moved your desk or chair? Set your Zen again."

## Next reminder strip
- Extract the "next up" logic from `RemindersPage.tsx` (the `reminderDots` for water/move/eye/spot from 9:00 to 18:00, filtered `>= nowMin`, earliest first) into a pure `nextReminder(settings, nowMin)` in `lib/wellness/rhythm.ts`, with a unit test.
- Use it in both `RemindersPage` (no behavior change) and Home. Refresh every 15 s, as `RemindersPage` does.
- Hide the strip when there's no next reminder, or when `quietBlocks(...)` is true.

## Quick chips and guide
- Keep Water +1, I stood up, Eye break and Stretch, with the same `logHabit` and links as `HomeRhythm`, as one compact row of small pills in the bottom strip. On phone it scrolls horizontally (`scrollChips`).
- Drop the separate "Streak N days" chip. The streak already feeds `feelGood`.
- Remove `PostureGuideCard` from Home. Keep a small "Posture guide" text link (`variant="link"`) next to the posture toggle.

## Phone (<1024px, 390 wide)
Show these in one column, in this order:
1. Greeting and pill
2. Camera card (16:10 or taller, with full shoulders visible)
3. Buttons
4. The 3 metrics as a compact 3-up row
5. Day strip
6. Reminder strip
7. Chips (scrolling)
8. Footer

Leave room for the `TabBar` (`pb-20`).

## Rules
- Use US wording only and make no medical claims ("wellness", "posture", never "pain", "treat" or "diagnose"). Keep the footer disclaimer.
- Show one gentle message at a time. Keep it calm and uncluttered, with no decorative plants or illustrations.
- Keep accessibility: `aria-pressed` on the toggle, labelled links, sr-only timeline text, focus rings, and reduced-motion respected.

## Acceptance
- `npx tsc --noEmit` and `npx vitest run` pass, including the new `nextReminder` test and the existing `home.test.ts`, `liveHome.test.ts` and `PostureGuideCard.test.ts`.
- Desktop 1440×900 checklist against the mockup:
  - [ ] dark content area with a light sidebar, unchanged
  - [ ] greeting with one pill
  - [ ] camera card about 60% wide, tall, full-shoulder outline aligned exactly as in Live view
  - [ ] match pill in a corner, not on the face
  - [ ] primary Start Live view, secondary Set my Zen, toggle
  - [ ] 3 metric cards with today-vs-yesterday comparisons
  - [ ] slim day strip
  - [ ] reminder strip (hidden when none)
  - [ ] compact chips
  - [ ] footer
- Phone 390 wide: same items stacked, no horizontal page scroll, TabBar not covering content.
- Camera off, no Print, and old Print states all render.
- Sit/stand switching swaps the outline.
- List the changed files when you're done.
