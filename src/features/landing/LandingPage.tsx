import { Link } from 'react-router-dom';
import { Logo } from '../../components/Logo';
import { WaitlistForm } from './WaitlistForm';

const benefits = [
  ['Fewer aches by Friday', 'Small posture resets add up over the week.'],
  ['Breaks that actually happen', "Friendly reminders that know when you've been sitting too long."],
  ['Set up in 60 seconds', 'Open your browser, allow the camera, and set your Zen. Done.'],
] as const;

const steps = [
  ['Set my Zen.', 'Sit comfortably tall for a few short holds. DeskZen remembers what "great" looks like for you and saves your Posture Print.'],
  ['Work like normal.', 'DeskZen quietly watches for leaning in, head drops, and tense shoulders, right in your browser.'],
  ['Get a gentle nudge.', 'When you\'ve slipped for a while, you\'ll get a kind reminder. Tap "Fixed it" and watch your score glow back up.'],
] as const;

const features = [
  ['Live posture score', 'A simple 0-100 score compared with your own best posture.'],
  ['Gentle nudges', 'Kind, specific tips like "Lean back a little," never nagging.'],
  ['Smart break reminders', 'Move, stretch, and refill your water at the right moments.'],
  ['Guided stretches', 'One-to-three-minute routines for your neck, shoulders, back, and wrists.'],
  ['Screen-distance check', "Know when you've crept too close to your screen, in inches."],
  ['Progress and streaks', 'Daily scores, weekly trends, and streaks that keep you going.'],
] as const;

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-white text-ink">
      <header className="sticky top-0 z-20 border-b border-ink/10 bg-white/95">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3" aria-label="Landing">
          <Logo />
          <div className="hidden items-center gap-4 text-sm font-medium text-ink-muted md:flex">
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
            <a href="#privacy">Privacy</a>
            <a href="#teams">For teams</a>
            <a href="#pricing">Pricing</a>
          </div>
          <a href="#waitlist" className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white">
            Join the waitlist
          </a>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">Sit better. Feel brighter.</h1>
            <p className="mt-4 text-lg text-ink-muted">
              You spend 8 hours a day at your desk. DeskZen uses your camera to gently nudge your posture, remind you to move, and track your progress. All on your device.
            </p>
            <div className="mt-6" id="waitlist">
              <WaitlistForm id="hero-waitlist" />
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
              <a className="text-brand" href="#how-it-works">See how it works ↓</a>
              <Link className="text-brand" to="/welcome">Open the app</Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-ink">
              {['On-device AI', 'Private by design', 'Works in your browser'].map((badge) => (
                <li key={badge} className="rounded-full bg-brand-tint px-3 py-1">{badge}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-brand-tint via-white to-glow-tint p-6 shadow-sm">
            {/* TODO: replace with a licensed sunlit-desk photo from design/ */}
            <div className="rounded-2xl bg-white p-6 shadow-lg">
              <p className="text-4xl font-semibold text-brand">84 · Good</p>
              <p className="mt-2 text-sm text-ink-muted">A person sitting tall at a sunlit desk, with an amber glow around the score.</p>
            </div>
          </div>
        </section>

        <section className="bg-surface" aria-label="Benefits">
          <ul className="mx-auto grid max-w-6xl gap-4 px-4 py-8 md:grid-cols-3">
            {benefits.map(([title, body]) => (
              <li key={title}>
                <h2 className="font-semibold text-ink">{title}</h2>
                <p className="mt-1 text-sm text-ink-muted">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-semibold">How it works</h2>
          <ol className="mt-4 grid gap-4 md:grid-cols-3">
            {steps.map(([title, body], index) => (
              <li key={title} className="rounded-2xl border border-ink/10 p-4">
                <p className="text-sm font-semibold text-brand">{index + 1}</p>
                <h3 className="mt-1 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-4">
          <h2 className="text-2xl font-semibold">Features</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, body]) => (
              <li key={title} className="rounded-2xl bg-surface p-4">
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-ink-muted">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="privacy" className="mt-10 bg-brand px-4 py-12 text-white">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-semibold">Your camera never leaves your device.</h2>
            <p className="mt-3 max-w-2xl">
              DeskZen&apos;s AI runs right in your browser. No video is recorded, saved, or uploaded. Ever. Only simple numbers like your daily score are stored, on your computer, and you can delete them anytime.
            </p>
            <ul className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
              <li>On-device AI</li>
              <li>No video saved</li>
              <li>Delete your data in one click</li>
            </ul>
          </div>
        </section>

        <section id="teams" className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-semibold">Healthier desks, happier teams.</h2>
          <p className="mt-3 max-w-2xl text-ink-muted">
            DeskZen for Teams offers an anonymous team wellbeing dashboard to support workplace ergonomics programs. See participation and trends, never individual video or scores.
          </p>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-ink-muted">
            <li>Anonymous, aggregate-only insights</li>
            <li>Team challenges and streaks</li>
            <li>Ergonomics program reports</li>
            <li>SSO and admin console</li>
          </ul>
          {/* TODO: connect Teams mailto */}
          <a className="mt-4 inline-block font-semibold text-brand" href="#waitlist">Talk to us about Teams</a>
        </section>

        <section className="bg-surface px-4 py-12" aria-label="Testimonials">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-semibold">Testimonials</h2>
            <p className="mt-2 text-sm font-semibold text-ink">PLACEHOLDER: replace with real, permissioned quotes before launch. Do not publish invented testimonials.</p>
            <ul className="mt-4 grid gap-4 md:grid-cols-3">
              <li className="rounded-2xl bg-white p-4 text-sm">&quot;PLACEHOLDER quote about feeling better at the end of the workday.&quot; - Name, Role, City, State</li>
              <li className="rounded-2xl bg-white p-4 text-sm">&quot;PLACEHOLDER quote about break reminders actually working.&quot; - Name, Role</li>
              <li className="rounded-2xl bg-white p-4 text-sm">&quot;PLACEHOLDER quote about setup being fast and private.&quot; - Name, Role</li>
            </ul>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl font-semibold">Pricing</h2>
          <p className="mt-2 text-sm font-semibold">PLACEHOLDER: pricing not final.</p>
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink/10">
                <th className="py-2">Plan</th>
                <th>Price</th>
                <th>Includes</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-ink/10"><td className="py-2">Free</td><td>PLACEHOLDER</td><td>Live score, nudges, break reminders</td></tr>
              <tr className="border-b border-ink/10"><td className="py-2">Plus</td><td>PLACEHOLDER /mo</td><td>Stretch library, focus mode, progress and streaks, mini widget</td></tr>
              <tr><td className="py-2">Teams</td><td>PLACEHOLDER /user/mo</td><td>Everything in Plus + team dashboard, reports, SSO</td></tr>
            </tbody>
          </table>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-12" aria-label="FAQ">
          <h2 className="text-2xl font-semibold">FAQ</h2>
          <h3 className="mt-4 font-semibold">Does DeskZen record me?</h3>
          <p className="text-sm text-ink-muted">No. Video is processed in your browser and never saved or uploaded.</p>
          <h3 className="mt-4 font-semibold">Do I need to install anything?</h3>
          <p className="text-sm text-ink-muted">No. It works in Chrome, Edge, and other modern browsers. You can also install it as an app.</p>
          <h3 className="mt-4 font-semibold">Is this medical advice?</h3>
          <p className="text-sm text-ink-muted">No. DeskZen is a wellness tool to help you build healthier desk habits, not a medical device.</p>
        </section>

        <section className="bg-glow-tint px-4 py-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-semibold">Start glowing at your desk</h2>
            <p className="mt-2 text-ink-muted">Join the waitlist and be first to try DeskZen.</p>
            <div className="mt-4">
              <WaitlistForm id="final-waitlist" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink/10 px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-ink-muted">
          <Logo />
          <div className="flex flex-wrap gap-4">
            <Link to="/privacy">Privacy</Link>
            <span>Terms {/* TODO: terms page */}</span>
            <span>Contact {/* TODO: contact */}</span>
          </div>
          <p>DeskZen is a wellness tool, not a medical device.</p>
          <p>All rights reserved © 2026 DeskZen</p>
        </div>
      </footer>
    </div>
  );
}
