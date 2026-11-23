import { Link } from 'react-router-dom';
import { ProductFigure } from './GuidePage';
import { ArticleCta, ArticleFaqs, ArticleShell, Disclaimer, RelatedGuides, Sources, linkClass } from './LearnPages';
import { ARTICLE_SEO, STAND_STRETCH_FAQS } from './seo';

const PATH = '/learn/stand-up-and-stretch-reminders' as const;

export function StandStretchPage() {
  const seo = ARTICLE_SEO[PATH];
  return (
    <ArticleShell path={PATH} headline={seo.headline} crumb={seo.crumb} published={seo.published} modified={seo.modified}>
      <p>
        A stand up reminder only works if you can answer it without wrecking the task in front of you. If the prompt
        asks for a workout, you will snooze it. If it asks for one minute and a
        clear next move, you will often do it. This is how to set reminders you will keep, beside a posture nudge.
      </p>
      <p>
        DeskZen is a wellness tool, not a medical device. The ideas below are general habits. They may help you feel
        better at your desk. They do not diagnose or treat anything. If something hurts, talk with a health
        professional.
      </p>

      <h2>Decide what the reminder is for</h2>
      <p>
        &quot;Take a break&quot; is too vague to follow. Pick one job for each prompt so your hand knows what to do
        before you have to think. A stand up reminder means leave the chair. A stretch reminder means one or two easy
        moves for your shoulders, neck, or hips. An eye reminder means look farther away than the screen. A water
        reminder means drink, not a new productivity system.
      </p>
      <p>
        OSHA&apos;s computer workstation notes on{' '}
        <a href="https://www.osha.gov/etools/computer-workstations/work-process" target="_blank" rel="noopener noreferrer" className={linkClass}>
          work process
        </a>{' '}
        encourage changes in position and reasonable breaks, not heroics at the keyboard. Harvard Health&apos;s overview
        of{' '}
        <a href="https://www.health.harvard.edu/staying-healthy/the-dangers-of-sitting" target="_blank" rel="noopener noreferrer" className={linkClass}>
          long periods of sitting
        </a>{' '}
        makes the same practical point: breaking up a long sit is worthwhile. You do not need to read either page as a
        scare story. The takeaway is that your body does better when it is not locked in one chair-shaped pose until
        quitting time.
      </p>
      <h2>Pick an interval you will not resent</h2>
      <p>
        The right interval is the one you still follow on a busy Tuesday. For a lot of desk days, a stand up reminder
        every 30 to 60 minutes is enough. Shorter can feel like nagging. Longer can mean you have already been still
        for too long by the time it rings. Start in the middle and adjust after a few days, instead of designing a
        perfect schedule on Sunday night.
      </p>
      <p>
        In DeskZen, move breaks can be set to 30, 45, 60, or 90 minutes. Forty-five is a steady starting point: long
        enough to finish a thought, short enough that the afternoon does not disappear in one shape. If you switch
        between sitting and standing, you can also turn on a prompt to change position, so a standing desk does not
        become a new place to freeze. Water reminders can run every 45, 60, 90, or 120 minutes. Eye reminders can run
        every 20, 30, 45, or 60 minutes. Turn on the ones you want. Leave the rest off.
      </p>
      <p>
        Give yourself an exit. DeskZen lets you mark a prompt done or snooze it. Quiet hours keep every tip silent in
        the window you choose. They stay off until you turn them on, so a break reminder app can be quiet during a call.
      </p>

      <h2>Make the stretch shorter than the excuse</h2>
      <p>
        A stretch reminder fails when the stretch is a production. Keep a list of moves that take about a minute and
        need no equipment. Use one, not all of them, when the prompt arrives.
      </p>
      <ul>
        <li>Stand and roll your shoulders up, back, and down, three slow times.</li>
        <li>Reach both arms overhead and take three easy breaths.</li>
        <li>Turn your head gently to each side, only as far as is comfortable, then look across the room.</li>
        <li>Step away from the desk and walk to a window, the kitchen, or the end of the hall.</li>
        <li>If you have been standing, sit back down and let the chair support you.</li>
      </ul>
      <p>
        DeskZen includes a stretch library for those short resets, separate from the posture check. Open one when a
        move break arrives, or ignore the library and just stand. The point is the change of position. You are not
        training for anything.
      </p>
      <ProductFigure
        src="/site/reminders.webp"
        alt="DeskZen reminders screen with an upcoming spot check and a day list of eye breaks and water tips."
        width={1150}
        height={498}
        caption="Break reminders for eyes, water, and a short reset, on the same day as the posture check."
      />

      <h2>Put the timer next to a slouch check</h2>
      <p>
        A clock cannot see you. You can be sitting well when it rings and folded forward for the next half hour. That is
        why a break reminder app and a slouch detector are a better pair than either one alone. The timer owns the
        scheduled stand and stretch. The camera owns the drift in between.
      </p>
      <p>
        The difference is spelled out in{' '}
        <Link to="/learn/slouch-detector-vs-sit-up-timer" className={linkClass}>
          webcam slouch detector vs a sit-up timer
        </Link>
        . Short version: a posture timer rings even when you are already sitting well. A slouch detector stays quiet
        until your outline changes. DeskZen does the camera check in the browser after you set your Zen once. The
        camera stays on your device. Photos and video are never saved or uploaded.
      </p>
      <p>
        You can read the product side on the{' '}
        <Link to="/webcam-posture-checker" className={linkClass}>
          free webcam posture checker
        </Link>{' '}
        page, or see how the same tab works as a{' '}
        <Link to="/posture-reminder-mac-windows" className={linkClass}>
          posture reminder for Mac and Windows
        </Link>
        . There is nothing to install on either computer.
      </p>

      <h2>A sample afternoon that stays realistic</h2>
      <p>
        Here is one way to run the reminders from lunch to the end of the day. It assumes a sitting desk and a 45
        minute move break. Change the numbers if your work does not look like this.
      </p>
      <ul>
        <li>1:00 PM. After lunch, sit back in the chair with your feet on the floor and the screen high enough that you are not hanging your head.</li>
        <li>1:45 PM. Stand up reminder. Roll your shoulders, refill water, sit back down.</li>
        <li>2:30 PM. Another move break. Look farther away than the screen.</li>
        <li>Any minute in between. If you start to slouch, the camera nudge can speak up. You do not wait for the clock.</li>
        <li>3:15 PM. One minute with your arms overhead, then a short walk if you have been still.</li>
        <li>4:00 PM. If you are in a meeting, snooze. The reminder can wait.</li>
      </ul>
      <p>
        The 3 PM hour is when a lot of people fold without noticing. Movement will not replace sleep, and it will not
        erase a short night. It can make the next hour less heavy. The guide on{' '}
        <Link to="/learn/afternoon-slump" className={linkClass}>
          why you crash at 3 PM
        </Link>{' '}
        goes further into that dip. Chair and screen setup, which makes every reminder easier to follow, is in{' '}
        <Link to="/learn/stop-slouching-at-your-desk" className={linkClass}>
          how to stop slouching at your desk
        </Link>
        .
      </p>

      <h2>Keep the tone closer to a colleague than a coach with a whistle</h2>
      <p>
        You will miss reminders, and you will snooze a deadline afternoon. That is not a failure. If you are ignoring
        prompts because they are too frequent, make the interval longer. If you finish the day stiff from not moving,
        make it shorter. A silent on-screen tip is kinder than a loud chime when you share a room or you are on a call.
      </p>
      <p>
        Privacy stays the same while the reminders run. The posture check, if you leave it on, still happens on your
        device. Break reminders themselves are just times and labels. They do not need a photo of you. The details are
        in{' '}
        <Link to="/learn/private-posture-reminder" className={linkClass}>
          a private posture reminder that never saves your camera
        </Link>
        .
      </p>

      <Sources
        items={[
          { href: 'https://www.osha.gov/etools/computer-workstations/work-process', label: 'OSHA, Computer Workstations: Work Process' },
          { href: 'https://www.health.harvard.edu/staying-healthy/the-dangers-of-sitting', label: 'Harvard Health, The dangers of sitting' },
        ]}
      />
      <ArticleFaqs items={STAND_STRETCH_FAQS} />
      <RelatedGuides current={PATH} />
      <ArticleCta>
        Set a move break, then get a quiet nudge when you slouch between them. Your camera stays on your device.
      </ArticleCta>
      <Disclaimer />
    </ArticleShell>
  );
}
