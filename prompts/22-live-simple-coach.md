# 22 - Live view: one simple outline + one instruction, in real time

Mockups (match these closely):
- design/live-recal/8-live-coach-drift.jpg  (drifting: amber, tip card, arrow)
- design/live-recal/9-live-coach-match.jpg  (matched: green glow, "Nice! That's your Zen")

Problem today (see screenshot): Live view shows a generic dashed circle + two shoulder lines, a clipped "your best posture" label, and NO instruction on the video. The user can't tell how to fix their posture.

Run after 19 and 20. If 20 already added a tip chip / arrow, replace them with this design (don't stack both).

## 1. The outline (one, simple, solid)
- Draw ONE smooth outline of the saved Posture Print (head, neck, shoulders) over the video: solid 3px stroke, emerald #059669, soft outer glow (SVG filter blur 6px, 40% opacity). No dashes, no circle, no extra lines, no text labels on the video.
- Source order: 1) validated Posture Print silhouette (from prompt 19); 2) if invalid/missing, build a smooth head+neck+shoulders path from the saved best-posture landmarks (head ellipse from ears/eyes/nose, neck taper, shoulder curve) so it still looks like a body outline, not a circle; 3) if no Print at all, show a soft generic outline plus a card "Set my Zen to see your outline" with a button.
- Map to video with the same mirroring and object-fit cover math as the video (one shared `toScreen()` helper). Outline must sit on the user's body, not offset.
- Smooth over time (EMA ~0.2) so it doesn't jitter.

## 2. Color states (whole UI reacts)
- match >= 90: outline emerald with gentle pulse; ring emerald.
- 70-89: outline emerald, the drifting body area tinted amber at 15% (optional, skip if costly); ring amber.
- < 70: outline emerald, ring amber, arrow shown.
- Transitions animate 300ms. Hysteresis: need 1.5s in a new state before switching.

## 3. Match ring (top-left of video)
- 96px circular progress ring, number "72%" + "match" under it. Color by state above. Updates smoothly (no flicker; round to whole %).

## 4. One instruction card (bottom-center of video)
- Frosted white card (bg white/85, backdrop-blur, rounded-2xl, shadow), max-width 420px.
- Left: 56px round icon tile (amber tint when fixing, emerald when good) with a simple icon for the drift kind.
- Big bold line (20-22px) + small helper line "Move into the green outline."
- Pick the single largest drift and map it to plain words:
  - head forward -> "Bring your head back" / "Ears over shoulders."
  - chin down / looking down -> "Lift your chin a little"
  - slouching / sitting low -> "Sit up tall" / "Lengthen your spine."
  - leaning left/right -> "Center yourself" / "Shift a little to the right/left." (respect mirroring)
  - shoulder tilt -> "Level your shoulders"
  - shoulders raised -> "Drop your shoulders"
  - too close -> "Lean back a little" ; too far -> "Come a little closer"
  - out of frame -> "Step into view"
  - combined head forward + slouch -> "Lift your chin and sit back"
- Hold each tip at least 4s; don't flip between tips.
- When the user fixes it: card turns emerald with a check, "Nice! That's your Zen", helper "Hold it - tall for 0:42" (live timer of continuous good time). Small confetti-free pop animation (scale 0.96 -> 1).
- Speak the same tip by voice (existing voice settings): max one tip per 20s, same tip max every 60s, say "Nice, that's it" on recovery at most every 60s. Respect mute.

## 5. Guide arrow
- When match < 80, draw a curved amber arrow (SVG path with rounded arrowhead, 4px stroke) from the user's current head center toward the outline's head center. Fade in/out. Hide when within 4% of target.

## 6. Clean up the video overlay
- Remove the clipped "your best posture" label and any dashed guides.
- Keep only: match ring (top-left), Sitting/Standing pill (top-right), privacy pill "On-device, no video saved" (bottom-left), instruction card (bottom-center). Nothing else on the video.

## 7. Right panel (simple)
- "Body check": 4 rows (Head over shoulders, Sitting tall, Shoulders level, Screen distance). Each row: dot + label + right side green check circle when OK, or amber "Fix" pill when off. The row matching the current tip is highlighted (mint background).
- Under it: "You bounced back N times today" (mint card with sparkle icon).
- Buttons: outlined "Pop out mini mirror", solid emerald "Set my Zen".
- Remove the duplicate "Re-lock my posture" / "That's my good posture" / "Mini widget" clutter (they're replaced by Set my Zen and Pop out mini mirror).

## 8. Mobile
- Video full width, ring and pill on top, instruction card overlapping bottom of video, Body check below.

## 9. Performance and privacy
- Overlay is one SVG layer redrawn with requestAnimationFrame; pose at ~15 fps is enough. No new network calls, no frames saved.

## 10. Tests and check
- Unit test the drift -> tip mapping, the 4s hold, voice cooldowns, hysteresis.
- Manually: sit well (green, "Nice! That's your Zen"), lean forward (amber, "Bring your head back", arrow appears), lean sideways (correct left/right wording in mirror), cover camera ("Step into view").
- `npm run build` and `npm test` pass. Report files changed.
