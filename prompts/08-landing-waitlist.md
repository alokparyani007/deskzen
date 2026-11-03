# Prompt 08: Landing page + waitlist form

Copy everything below the line into Cursor's Agent chat.

---

Final step of this round: the SitGlow marketing landing page. Use the copy in `docs/landing-page.md` **word for word** (it's US-only and avoids medical claims), styling from `docs/brand.md`. Visual target: `design/landing/hero.jpg`. You may use `design/landing/landing-full-page-OLD.jpg` for section layout only; do **not** copy its text (outdated UK wording) or its photo.

Build:
1. A landing page at `/` for visitors who haven't onboarded (move the app home to `/app` or show the landing when not onboarded, whichever is simpler; explain your choice). Sections in order: nav, hero, benefit strip, how it works (3 steps), 6 feature cards, privacy band, for teams, testimonials (clearly marked PLACEHOLDER), pricing (PLACEHOLDER), FAQ, final CTA "Start glowing at your desk", footer with "All rights reserved © 2026 SitGlow".
2. Hero with headline "Sit better. Feel brighter.", subhead, badges "On-device AI", "Private by design", "Works in your browser", and an "Open the app" link plus waitlist form.
3. **Waitlist form** component (email, validation, success state "You're on the list!"). It must **not** post anywhere yet: add `// TODO: connect waitlist backend` and store nothing remotely. Reuse it in the hero and final CTA.
4. Use the mockup images from `design/` as temporary placeholders (copy needed ones into `public/images/`, with a TODO to replace with licensed photos). Optimize for fast load (lazy-load below-the-fold images).
5. SEO basics: title "SitGlow: Sit better. Feel brighter.", meta description from the subhead, Open Graph tags, favicon from the logo.
6. Fully responsive and accessible (landmarks, heading order, alt text). Run a Lighthouse check and report the scores.

**How to verify**
- Open the local URL in a private window → you see the landing page with "Sit better. Feel brighter."
- Scroll through: every section from `docs/landing-page.md` is there; testimonials and pricing say PLACEHOLDER.
- Enter an invalid email → friendly error; a valid one → "You're on the list!" and the DevTools Network tab shows no request was sent.
- Search the page text for "UK", "GDPR", "DSE", "cure": none found.
- Looks good on a phone-sized window.
- `npm run build` passes.
