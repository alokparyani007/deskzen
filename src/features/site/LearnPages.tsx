import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SETUP_BLURB } from '../../lib/copy/setupTime';
import { GUIDE_LINKS } from './guideLinks';
import { SitePage, TryLink, ctaClass, siteFocus } from './SiteChrome';
import { PAGE_META } from './seo';
import type { PublicPath } from './seo';

const linkClass = `rounded font-semibold text-outline underline underline-offset-2 hover:text-white ${siteFocus}`;

export const STOP_SLOUCHING_PATH = '/learn/stop-slouching-at-your-desk' as const;
export const AFTERNOON_SLUMP_PATH = '/learn/afternoon-slump' as const;

function ArticleShell({
  path,
  headline,
  children,
}: {
  path: PublicPath;
  headline: string;
  children: ReactNode;
}) {
  useEffect(() => {
    document.title = PAGE_META[path].title;
  }, [path]);

  return (
    <SitePage>
      <article className="mx-auto max-w-3xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-outline">
          <Link to="/learn" className={`rounded ${siteFocus}`}>
            Learn
          </Link>
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">{headline}</h1>
        <p className="mt-3 text-sm text-white/55">Published November 9, 2026</p>
        <div className="mt-8 space-y-5 text-base leading-7 text-white/80 [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </SitePage>
  );
}

function Sources({ items }: { items: readonly { href: string; label: string }[] }) {
  return (
    <section>
      <h2>Sources</h2>
      <ul>
        {items.map((item) => (
          <li key={item.href}>
            <a href={item.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ArticleCta({ children }: { children: ReactNode }) {
  return (
    <div className="mt-10 rounded-3xl border border-outline/40 bg-print/[0.06] px-6 py-8 text-center shadow-[0_0_40px_rgb(5_150_105/0.25)] sm:px-8">
      <h2 className="text-2xl font-semibold tracking-tight text-white">Try DeskZen free</h2>
      <p className="mx-auto mt-3 max-w-xl text-outline/90">{children}</p>
      <TryLink className={`${ctaClass} mt-6`} />
      <p className="mt-3 text-sm text-white/60">{SETUP_BLURB}</p>
      <p className="mt-1 text-sm text-white/70">
        <Link to="/login" className={`rounded font-semibold text-outline underline underline-offset-2 hover:text-white ${siteFocus}`}>
          Sign in
        </Link>{' '}
        if you already have an account.
      </p>
    </div>
  );
}

function Disclaimer() {
  return <p className="mt-10 text-sm text-outline/80">DeskZen is a wellness tool, not a medical device.</p>;
}

export function LearnIndexPage() {
  useEffect(() => {
    document.title = PAGE_META['/learn'].title;
  }, []);

  return (
    <SitePage>
      <article className="mx-auto max-w-3xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <h1 className="text-4xl font-bold tracking-tight">Learn</h1>
        <p className="mt-4 text-lg text-white/75">
          Friendly guides on desk posture, the 3 PM slump, and small habits that may help you feel better at your desk.
        </p>
        <ul className="mt-10 space-y-4">
          {GUIDE_LINKS.slice(0, 2).map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                className={`block rounded-3xl border border-white/15 bg-white/[0.03] px-6 py-6 hover:border-outline/40 hover:bg-print/[0.06] ${siteFocus}`}
              >
                <h2 className="text-xl font-semibold text-white">{item.title}</h2>
                <p className="mt-2 text-white/70">{item.text}</p>
              </Link>
            </li>
          ))}
          <li>
            <Link
              to={STOP_SLOUCHING_PATH}
              className={`block rounded-3xl border border-white/15 bg-white/[0.03] px-6 py-6 hover:border-outline/40 hover:bg-print/[0.06] ${siteFocus}`}
            >
              <h2 className="text-xl font-semibold text-white">How to stop slouching at your desk</h2>
              <p className="mt-2 text-white/70">Desk setup and daily habits that may help you sit taller, without turning it into a chore.</p>
            </Link>
          </li>
          <li>
            <Link
              to={AFTERNOON_SLUMP_PATH}
              className={`block rounded-3xl border border-white/15 bg-white/[0.03] px-6 py-6 hover:border-outline/40 hover:bg-print/[0.06] ${siteFocus}`}
            >
              <h2 className="text-xl font-semibold text-white">Why you crash at 3 PM (and how your posture plays a part)</h2>
              <p className="mt-2 text-white/70">Why afternoons feel heavy, how sitting still may play a part, and simple resets that may help.</p>
            </Link>
          </li>
        </ul>
        <p className="mt-10 text-sm text-outline/80">DeskZen is a wellness tool, not a medical device.</p>
      </article>
    </SitePage>
  );
}

export function StopSlouchingPage() {
  return (
    <ArticleShell path={STOP_SLOUCHING_PATH} headline="How to stop slouching at your desk">
      <p>
        If you sit down tall at 9 AM and notice yourself folded into the chair by 3 PM, you are in good company. Most desk
        days start with good intentions and slowly slide. The goal is not a stiff, military pose. It is a setup and a few
        small habits that make it easier to sit in a relaxed, supported way, and to notice when you start to melt.
      </p>
      <p>
        DeskZen is a wellness tool, not a medical device. The tips below are general. They may help you feel more
        comfortable at your desk. They do not diagnose or treat pain or any condition. If something hurts, or pain keeps
        coming back, please talk to a health professional.
      </p>

      <h2>Why slouching sneaks up on you</h2>
      <p>
        Slouching rarely happens all at once. Your hips slide forward an inch. Your shoulders round. Your head drifts
        toward the screen. None of it feels dramatic in the moment, which is why it is so easy to spend an afternoon in a
        shape you never meant to hold.
      </p>
      <p>
        Harvard Health notes that posture is about more than looking poised. The way you hold yourself can affect how you
        feel through the day, including comfort in your back, neck, and shoulders. Their guides on{' '}
        <a href="https://www.health.harvard.edu/staying-healthy/why-good-posture-matters" target="_blank" rel="noopener noreferrer" className={linkClass}>
          why posture matters
        </a>{' '}
        and on{' '}
        <a href="https://www.health.harvard.edu/pain/3-surprising-risks-of-poor-posture" target="_blank" rel="noopener noreferrer" className={linkClass}>
          surprising risks of poor posture
        </a>{' '}
        are written for regular readers, not specialists, and they are a calm place to start if you want more background.
      </p>
      <p>
        You do not need perfect posture every second. Bodies like to move. What tends to wear people down is staying in
        one slumped shape for a long stretch without a break.
      </p>

      <h2>What a comfortable desk posture looks like</h2>
      <p>
        The U.S. Occupational Safety and Health Administration describes a{' '}
        <a href="https://www.osha.gov/etools/computer-workstations/positions" target="_blank" rel="noopener noreferrer" className={linkClass}>
          neutral working position
        </a>{' '}
        for computer work. In plain language, that means:
      </p>
      <ul>
        <li>Your back is supported by the chair, with a slight curve in the lower back rather than a deep C-shape.</li>
        <li>Your feet rest flat on the floor or on a footrest, and your knees sit at about the same height as your hips.</li>
        <li>Your shoulders stay relaxed, not shrugged up toward your ears.</li>
        <li>Your elbows stay close to your body, roughly at a right angle, with your wrists straight as you type.</li>
        <li>The top of the monitor sits at or a little below eye level, about an arm&apos;s length away, so you are not peering down or craning forward.</li>
      </ul>
      <p>
        OSHA&apos;s{' '}
        <a href="https://www.osha.gov/etools/computer-workstations" target="_blank" rel="noopener noreferrer" className={linkClass}>
          computer workstation pages
        </a>{' '}
        walk through this in more detail, including how to adjust a chair and where to place the keyboard, mouse, and
        screen. The aim is a position you can sustain, not a pose you have to freeze in.
      </p>
      <p>
        If your chair is too low, the desk is too high, or the laptop sits in your lap, your body will find a workaround.
        That workaround is often a slouch.
      </p>

      <h2>Set up the chair, then the screen</h2>
      <p>Start with the chair, because everything else hangs on it.</p>
      <p>
        Raise or lower the seat so your feet are grounded and your thighs are roughly level. If the seat is too high and
        your legs dangle, tuck a footrest or a sturdy box under your feet. Sit back so the backrest actually meets your
        back. If the chair has lumbar support, place it in the small of your back. If it does not, a small cushion can
        stand in.
      </p>
      <p>
        Next, bring the work to you. If you use a laptop, a simple stand or a stack of books plus a separate keyboard and
        mouse can lift the screen and keep your wrists happier. For a monitor, raise it so you are not looking down for
        hours. Keep the things you grab all day, like the mouse, your notebook, and your water, close, so you are not
        twisting again and again.
      </p>
      <p>
        OSHA&apos;s workstation guidance is built around this same order: support the body first, then place the tools
        where your hands and eyes can reach them without stretching. A few minutes of setup in the morning may help more
        than reminding yourself to &quot;sit up&quot; a hundred times.
      </p>

      <h2>Small habits that may help more than a perfect pose</h2>
      <p>A beautiful setup still cannot save a four-hour stretch with no movement. Try stacking a few of these.</p>
      <ul>
        <li>
          <strong className="text-white">The 20-minute reset.</strong> Every so often, sit all the way back in the chair,
          roll your shoulders up and back, and let your head float over your ribs instead of out toward the screen. Ten
          seconds is enough.
        </li>
        <li>
          <strong className="text-white">Stand to think.</strong> Take calls or reread a draft on your feet. You do not
          need a standing desk. Pushing the chair back and standing for a few minutes counts.
        </li>
        <li>
          <strong className="text-white">Look farther away.</strong> Lift your gaze to something across the room. It
          reminds your neck that it does not have to chase the pixels.
        </li>
        <li>
          <strong className="text-white">Uncross and plant.</strong> If you tend to hook a foot under the chair or sit on
          one foot, plant both feet again. It is a quiet way to stack your hips more evenly.
        </li>
        <li>
          <strong className="text-white">Change something every hour.</strong> Stand, stretch your arms overhead, walk to
          get water, or do a slow shoulder roll. Movement is the point.
        </li>
      </ul>
      <p>
        None of this has to be a workout. Harvard Health&apos;s pieces on posture and on long periods of sitting both
        point back to a simple idea: your body does better when it is not locked in one position all day.
      </p>

      <h2>Notice it sooner, without nagging yourself</h2>
      <p>
        The hard part is not knowing what better looks like. The hard part is noticing that you have left it. By the time
        your neck feels cranky, you may have been rounded forward for an hour.
      </p>
      <p>
        That is the gap a gentle reminder can fill. DeskZen uses your webcam, right in the browser, to watch the outline
        of your posture after you sit your best once to set your Zen. When you sink, it gives you a nudge. The camera
        feed stays on your device. Photos and video are never saved or uploaded.
      </p>
      <p>
        It will not force you into a rigid pose, and it is not a substitute for medical care. It is a quiet tap on the
        shoulder so you can sit tall again and keep going.
      </p>

      <h2>When to get extra help</h2>
      <p>
        General desk tips are not the right tool for everything. Please see a health professional if you have sharp or
        lasting pain, numbness or tingling, pain that travels down an arm or leg, or anything that worries you after an
        injury. A clinician can look at your specific situation. These articles cannot.
      </p>

      <Sources
        items={[
          { href: 'https://www.osha.gov/etools/computer-workstations', label: 'OSHA, Computer Workstations eTool' },
          { href: 'https://www.osha.gov/etools/computer-workstations/positions', label: 'OSHA, Computer Workstations: Positions' },
          { href: 'https://www.health.harvard.edu/staying-healthy/why-good-posture-matters', label: 'Harvard Health, Why posture matters' },
          { href: 'https://www.health.harvard.edu/pain/3-surprising-risks-of-poor-posture', label: 'Harvard Health, 3 surprising risks of poor posture' },
        ]}
      />

      <p>
        You may also like{' '}
        <Link to={AFTERNOON_SLUMP_PATH} className={linkClass}>
          why you crash at 3 PM, and how your posture plays a part
        </Link>
        , or try the{' '}
        <Link to="/webcam-posture-checker" className={linkClass}>
          free webcam posture checker
        </Link>
        .
      </p>

      <ArticleCta>
        Sit your best once, then get a gentle, private nudge when you start to slouch. Your camera stays on your device.
      </ArticleCta>
      <Disclaimer />
    </ArticleShell>
  );
}

export function AfternoonSlumpPage() {
  return (
    <ArticleShell path={AFTERNOON_SLUMP_PATH} headline="Why you crash at 3 PM (and how your posture plays a part)">
      <p>
        There is a moment, most workdays, when the words on the screen get a little fuzzy and your chair starts to win.
        For a lot of people that moment arrives around 3 PM. It can feel like your energy just walked out of the room.
      </p>
      <p>
        Some of that is ordinary. Your body runs on a roughly 24-hour clock, called the circadian rhythm, which helps
        time sleep, alertness, and other daily patterns. The{' '}
        <a href="https://www.nigms.nih.gov/education/fact-sheets/Pages/circadian-rhythms.aspx" target="_blank" rel="noopener noreferrer" className={linkClass}>
          National Institute of General Medical Sciences
        </a>{' '}
        explains that this clock is built into the body and does not stay perfectly flat through the day. A dip in the
        afternoon is common, even if you slept decently the night before.
      </p>
      <p>
        That does not mean you are stuck with a slump. How you sit, how often you move, and how you slept can all change
        how hard that dip feels. The ideas below are general wellness tips. They may help. They do not diagnose or treat
        any condition. DeskZen is a wellness tool, not a medical device. If you feel unwell, or exhaustion is new or
        severe, please talk to a health professional.
      </p>

      <h2>The afternoon dip is real, and it is not a character flaw</h2>
      <p>
        It is easy to blame willpower. A more useful picture is that alertness naturally rises and falls. NIGMS describes
        circadian rhythms as the body&apos;s internal timing system, shaped by light and daily routines. When the
        afternoon arrives, many people feel a bit slower, even on a good sleep schedule.
      </p>
      <p>
        Sleep still matters. The{' '}
        <a href="https://www.nhlbi.nih.gov/health/sleep-deprivation" target="_blank" rel="noopener noreferrer" className={linkClass}>
          National Heart, Lung, and Blood Institute
        </a>{' '}
        notes that not getting enough sleep can affect attention, mood, and how you function the next day. If you are
        running on a short night, the 3 PM wall may feel taller. Getting a more regular sleep window, when you can, may
        help more than another cup of coffee at 2:45.
      </p>
      <p>A short walk or a glass of water will not replace sleep. They can still make the next hour kinder.</p>

      <h2>Sitting still may turn a dip into a slump</h2>
      <p>
        Now add a desk. By mid-afternoon you may have been sitting in roughly the same shape since lunch.{' '}
        <a href="https://www.health.harvard.edu/staying-healthy/the-dangers-of-sitting" target="_blank" rel="noopener noreferrer" className={linkClass}>
          Harvard Health&apos;s overview of the dangers of sitting
        </a>{' '}
        describes how long stretches of sitting are a modern habit, and why breaking them up is worthwhile. You do not
        need to read that as a scare story. The practical takeaway is simple: your body is not built to hold one
        chair-shaped pose until quitting time.
      </p>
      <p>
        When you slouch through that stretch, extra work often lands on your neck and lower back. Your chest folds
        inward. Breathing can feel a little shallower. None of this causes the 3 PM crash on its own, and no article
        should claim that sitting a certain way will fix fatigue. It is reasonable to say that a rounded, still posture
        may make an already sleepy stretch feel heavier.
      </p>
      <p>
        OSHA&apos;s computer workstation guidance on{' '}
        <a href="https://www.osha.gov/etools/computer-workstations/work-process" target="_blank" rel="noopener noreferrer" className={linkClass}>
          work process
        </a>{' '}
        encourages changes in position and reasonable breaks, not heroics at a keyboard. That advice fits the afternoon
        especially well.
      </p>

      <h2>A desk setup that asks less of you at 3 PM</h2>
      <p>
        You do not need new furniture to make the second half of the day easier. Check a few basics from OSHA&apos;s
        description of a{' '}
        <a href="https://www.osha.gov/etools/computer-workstations/positions" target="_blank" rel="noopener noreferrer" className={linkClass}>
          neutral working position
        </a>
        .
      </p>
      <ul>
        <li>Sit back so the chair supports you, instead of perching on the front edge.</li>
        <li>Keep your feet on the floor or a footrest.</li>
        <li>Raise the screen so you are not hanging your head over a laptop for the whole afternoon.</li>
        <li>Bring the keyboard and mouse in so your shoulders can drop.</li>
      </ul>
      <p>
        If your laptop is low and close, you will drift toward it as your focus fades. Lifting the screen and using an
        external keyboard, even a cheap one, may help you stay stacked without thinking about it all day. Combined with a
        chair you can actually lean against, that small change often does more than a sticky note that says &quot;sit
        up.&quot;
      </p>

      <h2>Movement snacks beat a heroic workout</h2>
      <p>When 3 PM hits, a hard workout is rarely what you want. Tiny movement snacks are more realistic.</p>
      <ul>
        <li>Stand up and roll your shoulders while a file saves or a meeting loads.</li>
        <li>Walk to refill your water, even if the kitchen is close.</li>
        <li>Look out a window and let your eyes focus farther away.</li>
        <li>Stretch your arms overhead and take three easy breaths.</li>
        <li>If you can, step outside for two minutes of daylight.</li>
      </ul>
      <p>
        Outdoor light is one of the cues that helps keep circadian timing on track, something NIGMS discusses when it
        describes how daily rhythms stay aligned with the world around you. You do not have to train for a race.
        Standing, walking, and changing position count. OSHA likewise points to variation and breaks as part of a
        healthier computer work process. Think of them as part of the job, not a detour from it.
      </p>
      <p>
        If you have been still since lunch, even one lap down the hallway may help you come back to your chair a little
        more awake than another scroll through your inbox.
      </p>

      <h2>A gentle nudge when you start to melt</h2>
      <p>
        Awareness is the missing piece. You can know all of this and still slump without noticing, especially when you
        are deep in a task and a little tired.
      </p>
      <p>
        DeskZen watches your posture through your webcam, on your device, after you sit your best once to set your Zen.
        When you sink, it nudges you to sit tall. It can also remind you to take breaks. Your video never leaves your
        computer, and nothing is saved or uploaded.
      </p>
      <p>
        Use it as a friendly tap, not a verdict on your character. Combined with a decent chair setup and a couple of
        real breaks, it may help you come through the afternoon a bit more upright and a bit less drained.
      </p>
      <p>
        If pain shows up, or tiredness feels out of proportion, skip the internet advice and check in with a professional
        who can see you.
      </p>

      <Sources
        items={[
          { href: 'https://www.nigms.nih.gov/education/fact-sheets/Pages/circadian-rhythms.aspx', label: 'NIGMS, Circadian Rhythms' },
          { href: 'https://www.nhlbi.nih.gov/health/sleep-deprivation', label: 'NHLBI, Sleep Deprivation and Deficiency' },
          { href: 'https://www.health.harvard.edu/staying-healthy/the-dangers-of-sitting', label: 'Harvard Health, The dangers of sitting' },
          { href: 'https://www.osha.gov/etools/computer-workstations/work-process', label: 'OSHA, Computer Workstations: Work Process' },
          { href: 'https://www.osha.gov/etools/computer-workstations/positions', label: 'OSHA, Computer Workstations: Positions' },
        ]}
      />

      <p>
        You may also like{' '}
        <Link to={STOP_SLOUCHING_PATH} className={linkClass}>
          how to stop slouching at your desk
        </Link>
        , or a{' '}
        <Link to="/posture-reminder-mac-windows" className={linkClass}>
          posture reminder for Mac and Windows
        </Link>
        .
      </p>

      <ArticleCta>
        Get a private nudge to sit tall and take a break when the afternoon slump hits. Your camera stays on your device.
      </ArticleCta>
      <Disclaimer />
    </ArticleShell>
  );
}
