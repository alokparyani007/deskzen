# Prompt 10: Landing page "How it works" section (Posture Print)

Copy everything below the line into Cursor's Agent (Agent mode).

---

You are working in the DeskZen web app (Vite + React + TypeScript + Tailwind CSS). Please add a new **"How it works"** section to `src/pages/LandingPage.tsx`. I'm non-technical, so please make the change end to end, keep it tidy, and tell me at the end what you changed and how to see it.

## 1. Images (already made, do not regenerate)

These optimized web JPGs (1280x720, under 110 KB each) should already be in the project:

| File | What it shows |
|---|---|
| `public/media/marketing/how-1-setup.jpg` | Setup check screen: Framing, Light, Level, Distance chips and a Setup Score of 82 |
| `public/media/marketing/how-2-reset.jpg` | Guided body reset checklist |
| `public/media/marketing/how-3-catch-me.jpg` | Catch Me: "Now show me your usual 3 pm slouch" with a "Caught it!" badge |
| `public/media/marketing/how-4-glow-up.jpg` | "Your Posture Print is ready": slouch vs. Zen outlines with stats |
| `public/media/marketing/how-standing.jpg` | Standing desk version: "Desk up!" |

- First check that all five files exist. If any are missing, stop and tell me which ones. Do not use placeholders.
- In JSX, reference them as `/media/marketing/<file>.jpg`. Vite serves `public/` at the site root.
- Every `<img>` needs `width={1280} height={720}` (to avoid layout shift), `loading="lazy"`, `decoding="async"`, and `className` with `w-full h-auto`. Never stretch the images: keep the 16:9 aspect ratio and use `object-contain` if a container forces a size.

## 2. Where it goes

- Put the section right **after the hero** (the hero that says "Your best posture, on autopilot.") and before the next section that's already there.
- Give it `id="how-it-works"` so we can link to it (for example from a "See how it works" button). If the hero already has a secondary button or link, point it to `#how-it-works`. Otherwise don't add one.
- Build it as its own component, `src/components/landing/HowItWorks.tsx` (create the folder if needed), and render `<HowItWorks />` from `LandingPage.tsx`. Keep the step data in a typed array (`type Step = { id: string; label: string; title: string; body: string; image: string; alt: string; hero?: boolean }`).

## 3. Copy (use it exactly; US English)

**Eyebrow (small, uppercase, emerald):** How it works

**Headline (H2):** Your Posture Print in 60 seconds

**Subhead:** One quick calibration teaches DeskZen what *your* Zen looks like, and what your slouch looks like too.

**Step 1: Setup check**
Title: Setup check
Body: DeskZen checks your framing, light, camera level, and distance so it can see you clearly.
Alt: "DeskZen setup check screen showing a woman at her desk, with Framing, Light, Level, and Distance checks and a Setup Score of 82"

**Step 2: Body reset**
Title: Body reset
Body: A 20-second guided reset: scoot your hips back, roll your shoulders, glide your chin back, and breathe.
Alt: "DeskZen body reset screen with a guided checklist: hips back, shoulder roll, chin back, and breathe"

**Step 3: Catch Me (HERO STEP)**
Label badge: The fun part
Title: Catch Me
Body: Slouch on purpose. Show us your usual 3 pm slump and watch DeskZen catch it, so it learns *your* slouch, not a generic one.
Alt: "DeskZen Catch Me screen: a woman slouches at her laptop and a bright 'Caught it!' badge appears"

**Step 4: Glow-up**
Title: Your glow-up
Body: Your Posture Print is ready. See your slouch next to your Zen, then start your first session.
Alt: "DeskZen results screen titled 'Your Posture Print is ready', comparing a slouch outline with a Zen outline, with head about 1.8 inches higher and confidence 91"

**Callout: Works standing too**
Title: Works standing too
Body: Got a standing desk? Desk Sense notices when you go from sitting to standing, and DeskZen makes a standing Posture Print too.
Alt: "DeskZen standing desk mode showing 'Desk up!' with a woman typing at a standing desk"

**Mockup caption (small, gray, under the strip):** Preview of the app. Screens may change before launch.

**Privacy line (small, with a lock icon, centered at the bottom of the section):** Your camera stays on this device. No video is saved or sent.

Copy rules: don't add any health or medical claims (no "fixes back pain", "cures", "prevents injury", and so on). If you need extra microcopy, keep it friendly and casual but professional, and use phrases like "may help you feel better" at most.

## 4. Layout and design

Brand colors (use Tailwind arbitrary values or extend `tailwind.config` if a `deskzen` palette doesn't exist yet. Check first and reuse what's there):
- Emerald `#059669` (primary): headline accents, step numbers, links
- Amber `#F59E0B` (accent): **only** for the Catch Me hero step (badge, ring, glow)
- Sky blue (Tailwind `sky-500` / `sky-50`) for info bits like the caption or privacy chip
- Background: mint `#ECFDF5` section background, with white cards
- Text: `#111827` for headings, `gray-600` for body

Structure:
- Section: `bg-[#ECFDF5]`, generous padding (`py-20 md:py-28`), content in `max-w-6xl mx-auto px-4 sm:px-6`.
- Header block: centered eyebrow, H2 (`text-3xl md:text-5xl font-bold tracking-tight`), and subhead (`text-lg text-gray-600 max-w-2xl mx-auto`).
- **4-step visual strip** in order (1 Setup check, 2 Body reset, 3 Catch Me, 4 Glow-up). Each card is white, `rounded-3xl`, has a soft shadow, the image at the top inside a `rounded-2xl overflow-hidden` frame, then a numbered circle (emerald, white number), the title, and the body.
- **Catch Me is the hero and must be visibly larger:**
  - Desktop (`lg` and up), using a 2-column grid so the reading order stays 1, 2, 3, 4:
    - Row 1: Step 1 and Step 2 as normal cards.
    - Row 2: Step 3 Catch Me at **full width** (`lg:col-span-2`), as a horizontal card with the image on the left (about 60% wide) and the text on the right.
    - Row 3: Step 4 Glow-up and the "Works standing too" callout side by side.
  - Hero card styling: amber ring (`ring-2 ring-[#F59E0B]`), a subtle amber glow shadow, a larger title (`text-2xl md:text-3xl`), and a small amber pill badge "The fun part" above the title. Its step number circle is amber.
- **"Works standing too" callout:** a white card with a sky or emerald left border or top accent, a small "Desk Sense" pill (emerald outline), the title, the body, and the standing image.
- Mobile (below `md`): everything is a single column in step order, and Catch Me is still visually emphasized (amber ring and badge, slightly larger title). The callout comes last.
- Tablet (`md`): two columns for normal cards, and Catch Me spans full width.
- Under the grid: the "Preview of the app..." caption (`text-xs text-gray-500 text-center mt-6`) and then the privacy line (`text-sm text-gray-600`, inline lock icon. Use `lucide-react`'s `Lock` if it's already installed, otherwise an inline SVG. Do not add new dependencies).
- Optional and subtle: a hover lift on cards (`transition hover:-translate-y-1`). Respect `motion-reduce:transform-none`. No auto-playing animations.

Accessibility:
- Use a `<section aria-labelledby="how-it-works-title">` with the H2 `id="how-it-works-title"`.
- Make the grid an ordered list (`<ol>`), with each step as an `<li>`, so screen readers hear the order. The "Works standing too" callout can be the last `<li>` in the same grid (no step number). That keeps the layout simple.
- Use the alt text above exactly. Make sure color contrast is AA (white on emerald is fine. For amber backgrounds use dark text `#111827`, not white).

## 5. Done checklist

1. Run `npm run build` (and `npm run lint` if it exists) and fix any TypeScript or ESLint errors.
2. Start the dev server and check the page at a mobile width (375px), a tablet width (768px), and a desktop width (1280px). Confirm there's no horizontal scroll, the images aren't stretched, and the order reads 1, 2, 3, 4 with Catch Me clearly the biggest card.
3. Don't change any other sections, copy, or the hero headline.
4. Reply with a short, plain-English summary of the files you added or changed and how I can preview it (the exact command and URL).
