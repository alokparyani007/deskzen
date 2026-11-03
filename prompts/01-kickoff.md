# Prompt 01: Kickoff: scaffold the app

Copy everything below the line into Cursor's Agent chat.

---

You are building **SitGlow**, a browser-based, on-device webcam posture and desk-health PWA. Before writing code, read `README.md`, `.cursor/rules/sitglow.mdc`, `docs/product-spec.md` (sections 1.1, 1.8, 1.9), and `docs/brand.md`, and look at `design/screens/desktop-dashboard.jpg` and `design/screens/phone-home.jpg`.

Do this step only (later prompts add camera, scoring, etc.):

1. Scaffold a **Vite + React + TypeScript** app in this folder (the current root, not a subfolder). Keep the existing `docs/`, `design/`, `prompts/`, `.cursor/`, `README.md`, `START-HERE.md`, and `.gitignore`. Enable TypeScript `strict`.
2. Add **Tailwind CSS** with the SitGlow theme from `docs/brand.md` as tokens (brand, glow, sky, ink, surface) and **Inter** font.
3. Add **PWA** support with `vite-plugin-pwa`: manifest (name "SitGlow", short_name "SitGlow", theme color `#047857`, white background), placeholder icons generated from an SVG logo, auto-update service worker.
4. Create an SVG `<Logo />` component: seated figure with a glowing amber sun as its head + "SitGlow" wordmark (see `design/brand/logo-concepts.jpg`).
5. Build the **app shell** with `react-router-dom`: desktop sidebar (Home, Live view, Progress, Reminders, Settings, and the "On-device only - Your data stays private" footer badge) and a mobile bottom tab bar. Create placeholder pages for each route plus `/privacy` and `/calibrate`. Home should roughly match the layout of the mockups using static placeholder data (score ring 84, tiles, "Start break" button).
6. Set up folders per the rules (`src/app`, `src/features`, `src/components`, `src/lib`, `src/hooks`, `src/styles`), ESLint + Prettier, and **Vitest** with one sample test.
7. Add npm scripts: `dev`, `build`, `preview`, `test`, `lint`.
8. Run `npm install`, then confirm `npm run build` and `npm test` pass.

When finished, tell me in plain language what you built and how to view it.

**How to verify**
- `npm run dev` → open the local URL (usually http://localhost:5173).
- You see the SitGlow logo, emerald sidebar nav, and a Home page with a score ring that looks like the mockup.
- Shrink the browser window narrow → a bottom tab bar appears.
- Clicking each nav item changes the page without a full reload.
- In Chrome, an "Install app" icon appears in the address bar (PWA works).
- `npm run build` and `npm test` finish with no errors.
