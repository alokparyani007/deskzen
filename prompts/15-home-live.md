# Home screen redesign: live camera and posture first

Match design/home/home-live.jpg closely. The user wants Home to be where they SEE their posture and ADJUST it, and where they can calibrate easily. So the live camera view with the locked outline is the hero, and everything else supports it.

Style: airy white and mint, rounded cards, soft shadows, emerald #059669, amber #F59E0B. Use US wording, a warm tone and no medical claims.

Rebuild src/features/home/DesktopHome.tsx and PhoneHome.tsx:
- Remove the gradient "You've been sitting N minutes" hero, the empty "Webcam preview" placeholder and the old "Posture now" card.
- Reuse the existing pieces: the Live view camera pipeline, LockedOutline.tsx, the Posture Print store and the lockedPose data, print-based scoring, the coaching tips (text and voice), the reminders counters and the progress data. Don't duplicate the camera logic. Share one camera session between Home and Live view so they never open the webcam twice.

## 1. Greeting and feel-good line
- "Good morning/afternoon/evening, {name}" (use the name from settings, or just the greeting if there's no name).
- One small mint pill with an encouraging message built only from TRUE data. Examples:
  - "You sat tall 18% more than yesterday. Nice!"
  - "3 breaks already, great rhythm"
  - "6-day streak!"
  - "Fresh start today. Let's go!" (when there's no data)
- Never shame the user.

## 2. Hero: live camera card (left, about 60% width)
- When Live view is on, show the webcam video (mirrored) with LockedOutline drawn over it: the dotted emerald outline labeled "Your best posture", the same as the Live view page.
- Top status pill, driven by print-based scoring:
  - green "Sitting tall, matches your Posture Print"
  - sky "Drifting a little"
  - amber "Slouching, ease back to your outline"
  - Keep the amber drift arrow from Live view.
- Bottom-left: ONE coaching tip chip at a time ("Tip: lift your chin slightly"), spoken too if voice is on. Use the same tip logic as Live view, with cooldowns.
- Controls under the video:
  - A big emerald button "Start Live view" / "Pause" that toggles the camera right here on Home.
  - An outlined "Re-calibrate Posture Print" button that opens the Posture Print flow and comes back to Home when done.
  - A "Sitting / Standing auto" toggle.
- Camera off: show a calm placeholder (the soft outline icon plus "See your posture live. Your video never leaves your computer.") with the Start Live view button.
- No Posture Print yet: the hero becomes a friendly "Set up your Posture Print (about 15 seconds)" card with one big button. After it's done, Home shows the live view with the outline.
- Keep the full Live view page too. Add a small "Open full view" link on the card.

## 3. Right column
- **Score ring "Posture now":** the live print-based score, updated smoothly. It shows "--" when the camera is off. Under it: "Today 82, +6 vs yesterday".
- **Posture Print card:** a figure icon, "Locked {date}, sitting/standing" (show both if both exist), and a "Re-calibrate (about 15 seconds)" link. If the print is older than 14 days, add a gentle "Refresh for best accuracy".
- **Metrics 2x2:** Sitting well, Slouch time (green when down vs yesterday), Breaks X of goal, Water X of goal. Each one links to Progress or Reminders. With no data, show "–" and "Starts today".

## 4. Bottom
- **Day timeline:** work start to end, past time colored by posture state (great emerald, drift sky, slouch amber), a "Now" marker, and "Your day so far".
- **Quick chips:** Water +1, I stood up, Eye break (opens the 20 s eye break), Stretch (opens a 2-min stretch). Each tap logs to the same counters Reminders and Progress use, with a tiny emerald burst.
- **Streak badge:** "Streak N days".

## 5. Phone layout
Stack in this order:
1. greeting and pill
2. the live camera card with its buttons
3. the score ring and Posture Print row
4. 2x2 metrics
5. the timeline
6. chips in a horizontal scroll

## 6. Tests
- Home and Live view share one camera stream.
- The no-print state shows the setup card.
- Camera off shows the placeholder and "--".
- Re-calibrate returns to Home.
- Feel-good messages use only true data.
- The slouch delta coloring is correct.

When done, tell me in plain English how to check it:
- Open Home, press Start Live view, and see yourself with your best-posture outline.
- Slouch and see the amber pill and a tip.
- Press Re-calibrate and come back to Home.

## 7. Good posture guide card (added)
- Add a card on Home titled "Good desk posture" that uses the image public/media/guides/good-desk-posture.jpg (sitting and standing, side view, labeled).
- Desktop: put it full width below the quick chips, as a compact card. Show a thumbnail of the image and the text "See what good posture looks like, sitting and standing", with a "View guide" button.
- Clicking the thumbnail or the button opens a large lightbox with the full image (Esc or X closes it). Add alt text: "Good desk posture guide for sitting and standing."
- Show a "Sitting" / "Standing" tab above the image in the lightbox. It's just a label that matches the current mode. Keep the image whole and don't crop it.
- Also show this card inside the no-Posture-Print setup card ("Here's what we'll help you find") and as a small "Posture guide" link on the Live view page.
- Phone: put it after the timeline, full width.
- Test: the card renders, and the lightbox opens and closes.
