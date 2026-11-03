# SitGlow Brand

**Name:** SitGlow (one word, capital S and G)
**Tagline:** Sit better. Feel brighter.
**Personality:** professional, bright, warm, encouraging. A friendly coach in a sunlit office.

## Colors

| Token | Hex | Use |
|---|---|---|
| `white` | `#FFFFFF` | Primary background (crisp white) |
| `surface` | `#F8FAF9` | Cards on tinted areas, sections |
| `ink` | `#0F172A` | Primary text |
| `ink-muted` | `#475569` | Secondary text |
| `brand` / `emerald-700` | `#047857` | Primary buttons, links, active nav, key headings |
| `brand-light` / `emerald-500` | `#10B981` | Progress, success states, score ring "good" |
| `brand-tint` | `#ECFDF5` | Selected nav background, success tiles |
| `glow` / `amber-500` | `#F59E0B` | The "glow": logo sun, score-ring halo, highlights, celebration |
| `glow-tint` | `#FFFBEB` | Break tiles, warm callouts |
| `sky` / `sky-400` | `#38BDF8` | Info, water reminders, secondary chart series |
| `sky-tint` | `#F0F9FF` | Water tiles, info callouts |
| `alert` | `#F97316` (soft coral-orange) | Low score ring, "needs attention" callouts (use gently, never red-alarm) |

Contrast: white text on `#047857` passes WCAG AA. Don't put white text on `#10B981`, `#F59E0B` or `#38BDF8`; use `ink` instead.

Tailwind (sketch):
```js
colors: {
  brand: { DEFAULT: '#047857', light: '#10B981', tint: '#ECFDF5' },
  glow:  { DEFAULT: '#F59E0B', tint: '#FFFBEB' },
  sky:   { brand: '#38BDF8', tint: '#F0F9FF' },
  ink:   { DEFAULT: '#0F172A', muted: '#475569' },
  surface: '#F8FAF9',
}
```

## Typography
- **Inter** (Google Fonts or self-hosted), fallback `system-ui, -apple-system, Segoe UI, Roboto, sans-serif`.
- Headings: 600-700 weight, tight tracking (-0.01em). Body: 400, 16px base, 1.5 line height.
- Score numbers: Inter 700, tabular numerals.
- Scale (px): 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 / 60.

## Logo
- A **seated figure whose head is a glowing amber sun**, figure in emerald, next to the wordmark "SitGlow" (Sit in emerald, Glow in amber or emerald). See `design/brand/logo-concepts.jpg`.
- App icon: logo mark on an emerald rounded square.
- Clear space: at least the height of the sun-head on all sides. Minimum size: 24px mark / 96px lockup.
- Don't: stretch, recolor the sun to anything but amber, add drop shadows beyond the soft glow, place on busy photos without a white/emerald backing.
- Build the mark as an inline SVG component (`<Logo />`) so it scales crisply; the concept image is a reference, not a production asset.

## Imagery
- Real photos of people at desks in sunlit offices and homes, plants, windows, nature views. Diverse people. Natural light, bright, calm.
- Not cartoonish, no stock "back pain" clichés, no anatomy diagrams or medical imagery.
- Placeholder images during development: use the mockups in `design/` or neutral gradients; replace with licensed photos before launch.

## UI style
- Rounded cards (16-24px radius), soft shadows, generous whitespace.
- Score ring with a soft amber glow halo.
- Icons: simple line icons (e.g., Lucide), 1.5-2px stroke.
- Motion: gentle, 150-300ms ease-out; respect `prefers-reduced-motion`.

## Voice and tone
- Kind coach, never a nag. Short sentences. Second person ("you").
- Celebrate progress; never shame. Swap "bad posture" for "time to reset".
- US English, inches, US date formats. Never mention UK, EU, GDPR, or DSE.
- **No medical claims.** ✅ "fewer aches", "feel looser", "build healthier desk habits". ❌ "cure neck pain", "fix your back", "prevent injury", "clinically proven".

### Sample copy
- **Landing headline:** Sit better. Feel brighter.
- **Landing subhead:** You spend 8 hours a day at your desk. SitGlow uses your camera to gently nudge your posture, remind you to move, and track your progress. All on your device.
- **Badges:** On-device AI · Private by design · Works in your browser
- **Benefits:** Fewer aches by Friday · Breaks that actually happen · Set up in 60 seconds
- **Calibration:** "Let's find your best posture." / "Hold still for 3 seconds..." / "Saved! This is your best posture."
- **Nudges:** "Lean back a little - you're 5 in closer than your best." · "Lift your chin a touch." · "Let your shoulders drop." · "Sit tall, you've got this."
- **Success:** "Perfect! Posture back to 90." · "Nice reset."
- **Break:** "You've been sitting 45 minutes. Time for a short stretch."
- **Privacy:** "Your camera never leaves your device. No video is saved or uploaded. Ever."
- **Disclaimer:** "SitGlow is a wellness tool, not a medical device."
