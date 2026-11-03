# Progress page redesign: a calm, simple dashboard that shows how you're improving

The MAIN design is design/progress/progress-dashboard-habits.jpg (simple layout plus Healthy habits and Today's action items). For the Week view and the comparison, match design/progress/progress-week-compare.jpg exactly. Also see design/progress/progress-dashboard-simple.jpg for the hero and the chart with its dashed last-week line. Match it closely: lots of white space and only a few elements. The user said the fuller version was too busy.
design/progress/progress-dashboard.jpg shows the extra detail cards. Those go in a collapsed "See details" section (section 2).
Colors: emerald #059669, small amber #F59E0B accents, mint #ECFDF5 hero tint.
The numbers in the mockups are examples only. The app shows the user's real data.

Today, src/features/progress (ProgressPage, TrendChart, SpotHistory) plus src/lib/progress/aggregate.ts show a basic trend. Rebuild ProgressPage. Keep everything on-device (the same local storage as now).

## 1. Track a bit more data (src/lib/progress and the session code that records minute scores)
- Per minute, save:
  - state: 'great' | 'drift' | 'slouch' (from the Posture Print score bands)
  - mode: 'sit' | 'stand'
  - The existing minute score stays.
- Per nudge, save the time it was shown, whether the user fixed it, and how many seconds it took to get back into posture.
- Breaks, water, stretches and spot checks: reuse the existing counts. If stretches aren't counted, add a count when a stretch routine finishes.
- Milestones are computed from the data, not stored: First Posture Print, 3-day streak, 5-day streak, 1 hour slouch-free (60 tracked minutes in a row with no slouch), 7-day streak, 100 nudges fixed.
- Add migrations so old records without state or mode still work: derive state from the score bands and default mode to sit.

## 2. Layout: simple first, details on demand
Main view, always visible (matches progress-dashboard-simple.jpg):
- Title "Your progress" with a segmented control: Today | Week | Month (Week by default). Everything follows the selected range.
- **Hero card (mint):**
  - a big emerald score ring showing the range average, with "This week" (or "Today" / "This month")
  - a big friendly headline: "Up 9 points from last week", "Down 3 points from last week. Let's bounce back!" or "Steady at 84"
  - one sentence: "You sat well for 5h 12m. Nice work!"
  - a small "6-day streak" pill. The streak counts consecutive days with 30 or more tracked minutes and an average of 75 or more. Hide the pill if the streak is 0.
- **Comparison chart (the user specifically likes this):** "This week vs last week" (Today: "Today vs yesterday", Month: "This month vs last month").
  - A smooth emerald line with a soft fill for the current range, and a dashed gray line for the previous range on the same axis.
  - A small legend: "This week" and "Last week".
  - The tooltip shows both values and the difference, e.g. "Wed 82 (last week 74, +8)".
  - Today shows by hour, Week by day, Month by day.
  - Show point labels for both lines on Week (current in emerald, previous in gray).
  - The hero subtext names the previous value, e.g. "Last week 75. You sat well 48 min more."
- **Comparison strip**, inside the same card under the chart: 5 compact columns, each with the label, the previous value (gray, "last week"), the current value (bold, "this week") and the change:
  - Posture score
  - Sitting well
  - Slouch time
  - Breaks per day
  - Water per day
  Color the change by whether it's GOOD for the user, not by its direction: less slouch time is green with a down arrow, and less water is amber. On Today the labels read "yesterday" / "today", on Month "last month" / "this month".
  If the previous range has no data, show "No data last week yet" instead of the numbers.
- **Bottom row, three cards:**
  1. **Healthy habits**: rows with a small line icon, label, thin progress bar and count, against the goals from settings:
     - Breaks: 6 per day
     - Water: 8 glasses, with a "+" button to log a glass
     - Stretches: 4
     - Eye breaks (20-20-20): 8
     - Standing time: 60 min, from standing-mode minutes; hide this row if the user never stands
     For Week and Month, show the daily average and a small "vs last week" change. Add new counters where they're missing (eye breaks, and stretches if not counted). Goals are editable in Settings.
  2. **Today's action items**: a checklist of 3 to 5 items generated from the data, with round checkboxes. Done items get an emerald check and move to the bottom. Examples:
     - "Morning posture check" (done after the first spot check or Live session of the day)
     - "Stretch break at 3 PM" (the slouch-peak hour), with a small amber time tag; tapping it sets a reminder
     - "Drink 3 more glasses of water" (from the remaining goal)
     - "Stand for 20 more minutes" (only if standing is used)
     - "Re-lock your Posture Print (30 days old)" with a "Do it" link, shown only when the print is over 30 days old or low confidence
     Items update live and reset daily in the user's timezone. Users can tick items manually. Auto-tick when the data shows they're done.
  3. Stacked: **Your tip** (one insight) and **Next milestone** (one badge with a progress bar).
- "See details" sits below.
- Footer: "All data stays on this device."

"See details" (a text button below the cards, collapsed by default, and the choice is remembered). It opens the extras from progress-dashboard.jpg, with the same calm spacing:
- How you spent desk time: a donut of Great, Drifting and Slouching, plus sitting vs standing time
- When you slouch most: a weekday x hour heatmap
- Nudges fixed: the count and the average seconds to fix
- All milestones: earned badges in color, and locked ones gray with how to earn them
- Below the details: "DeskZen is a wellness tool, not a medical device."

Keep the main view calm: the hero, the comparison chart, and the bottom row only. No medical claims.

## 3. Real data only
- Never show the sample numbers from seed.ts as if they were real. When there's less than 1 day of data, show a friendly empty state for each card: "Your chart fills in as you work. Check back tomorrow!" plus a "Start Live view" button. Show sample data only with a clear "Sample data" badge, in dev or demo mode.
- Charts: use simple accessible SVG components (no heavy chart library unless one is already installed), with tooltips on hover or tap, aria-labels that summarize each chart, and reduced motion respected.
- Responsive: 4 KPI cards on desktop, 2x2 on tablet, a 1-column stack on mobile.

## 4. Tests
- The state shares (great, drift, slouch) add up to 100%.
- The streak counts correctly across days in the user's timezone.
- The heatmap's worst hour is picked correctly.
- The change vs the previous range is correct, and the comparison line aligns days correctly.
- The comparison strip colors changes by good or bad (less slouch time is green).
- Action items are generated from the data, auto-tick when done, and reset at local midnight.
- The water + button logs a glass.
- Old records without state or mode migrate.
- The empty state shows with no data, and no seed data appears unlabeled.

When done, tell me in plain English how to check it: use Live view for a while, open Progress, switch Today, Week and Month, and confirm the cards update.
