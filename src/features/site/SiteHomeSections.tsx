import { Link } from 'react-router-dom';
import { GUIDE_LINKS } from './guideLinks';
import { siteFocus } from './SiteChrome';

const shots: readonly { src: string; alt: string; width: number; height: number; caption: string; wide?: boolean }[] = [
  {
    src: '/site/slouch-nudge.svg',
    alt: 'DeskZen live view on a laptop, with an amber slouch label and a nudge that says to sit tall. Photos and video stay on the laptop.',
    width: 800,
    height: 500,
    caption: 'A quiet slouch nudge while you work.',
    wide: true,
  },
  {
    src: '/site/reminders.webp',
    alt: 'DeskZen reminders screen with a spot check coming up, plus water and eye break tips across a workday.',
    width: 1150,
    height: 498,
    caption: 'Break reminders for eyes, water, and a short reset.',
  },
  {
    src: '/site/progress.webp',
    alt: 'DeskZen weekly progress screen with a score of 84 and a chart comparing this week with last week.',
    width: 1138,
    height: 763,
    caption: 'A simple weekly score, kept on this device.',
  },
];

/** Product UI in the prerendered home page. Illustrations only, no photos of people. */
export function ProductShots() {
  return (
    <section aria-labelledby="product-title" className="px-5 pb-12 sm:px-8 sm:pb-16">
      <div className="mx-auto max-w-5xl">
        <h2 id="product-title" className="text-center text-2xl font-bold tracking-tight text-white sm:text-4xl">
          The app, in your browser
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-white/70">
          A free webcam posture reminder. The camera stays on your device, and nothing from it is uploaded.
        </p>
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {shots.map((shot) => (
            <figure key={shot.src} className={shot.wide ? 'lg:col-span-2' : undefined}>
              <img
                src={shot.src}
                alt={shot.alt}
                width={shot.width}
                height={shot.height}
                loading="lazy"
                decoding="async"
                className="h-auto w-full rounded-2xl border border-white/10 bg-stage"
              />
              <figcaption className="mt-2 text-center text-sm text-white/60">{shot.caption}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Body links to the guides and the keyword landing pages. */
export function HomeLearn() {
  return (
    <section aria-labelledby="learn-title" className="px-5 pb-12 sm:px-8 sm:pb-16">
      <div className="mx-auto max-w-5xl">
        <h2 id="learn-title" className="text-center text-2xl font-bold tracking-tight text-white sm:text-4xl">
          <Link to="/learn" className={`rounded-lg hover:text-outline ${siteFocus}`}>
            Learn
          </Link>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-white/70">
          Ways to try DeskZen, and short guides on desk habits that may help.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {GUIDE_LINKS.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                className={`block h-full rounded-3xl border border-white/15 bg-white/[0.03] px-5 py-5 hover:border-outline/40 hover:bg-print/[0.06] ${siteFocus}`}
              >
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-white/70">{item.text}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
