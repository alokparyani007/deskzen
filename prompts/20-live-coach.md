# Live view: always show my outline AND clear instructions to fix my posture

Run this after 19-fix-print-outline.md. Mockups: design/live-recal/1-live-mirror.jpg (good posture) and 2-live-slouch.jpg (drifting).

What's wrong in src/features/live/LiveViewPage.tsx today:
- When the Print exists, the top pill shows only the match % (matchCopy). The actual instruction (`pill` from driftCopy) is hidden on the video and appears only as small grey text in the sidebar.
- The arrow is a static "↗" text glyph at a fixed spot (left-1/3 top-1/4). It doesn't point from my head toward my outline.
- If print.silhouette exists but is bad, it draws that and never falls back to LockedOutline.
- The Body check has only 3 vague rows, and there's no Side view.

## 1. The outline is always visible
- Draw the traced silhouette when it's valid (after fix 19). Otherwise ALWAYS fall back to LockedOutline. Never show nothing.
- If there's no Print at all, show a dotted generic guide outline plus a card: "Lock in your best posture (15 sec)" with a button that opens Re-calibrate.
- The outline is dotted emerald, labeled "Your best posture", and glows brighter for 1.5 s when I'm back inside it.

## 2. A coaching chip on the video (ONE instruction at a time)
- Keep the match pill at the top ("92% match to your Posture Print").
- ADD a coaching chip near my head on the video (bottom-left on a phone) whenever I'm drifting. Use plain, specific, friendly words based on the drift kind and its direction:
  - head forward: "Ease your head back a little"
  - head down: "Lift your chin slightly"
  - leaning in: "Slide back and sit tall"
  - shoulders up: "Drop your shoulders and relax"
  - shoulders tilted: "Level your shoulders"
  - leaning to one side: "Center yourself in the outline"
  - too close: "Move back a bit from the screen"
  - slouching: "Sit tall, lengthen your spine"
- Pick the BIGGEST drift only, and keep the same tip for at least 4 s so it doesn't flicker.
- When I fix it, show a green "Nice! That's it ✓" for 2 s, then hide the chip.
- When everything is good, show a small "Looking great, hold it" chip with the "Tall for mm:ss" timer.

## 3. A real guide arrow
- Replace the "↗" glyph with an SVG arrow drawn from my current head or shoulder position to the matching point on my outline. Use video coordinates and mirror it the same way as the video.
- Make it amber with a soft pulse (none if reduced motion is on), and only show it while drifting.
- Draw a thin glowing line along my live neck and shoulders, amber on the part that's off and green elsewhere (this is the body map).

## 4. Voice
- Speak the same tip when it first appears if Voice tips is on, with at most one spoken tip every 20 s and the same tip at most every 60 s.
- Speak "Nice" on recovery at most once a minute.
- Never talk over itself.

## 5. Sidebar
- **Body check**, 4 rows that update live: Sitting tall, Head over shoulders, Shoulders level, Screen distance. Each shows Good or Needs attention, and tapping a row shows its tip.
- **Side view, estimated:** a seated profile line figure with the head-forward angle compared with the dashed best line ("Head forward 8 degrees"), labeled "estimated".
- **Encouragement:** "You bounced back N times today", using real counts.

## 6. Tests
- Fallback to LockedOutline when the silhouette is invalid.
- The coaching chip shows while drifting, picks the largest drift and holds for 4 s or more.
- The recovery chip shows on recovery.
- The arrow only renders while drifting.
- The voice cooldown works.

When done, tell me in plain English how to check it: open Live view, sit well and see the outline and "Looking great". Push your head forward and see the amber chip, the arrow and hear the tip. Sit back and see "Nice! That's it".
