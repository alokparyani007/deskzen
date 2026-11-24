import { Link } from 'react-router-dom';
import { ArticleCta, ArticleFaqs, ArticleShell, Disclaimer, RelatedGuides, Sources, linkClass } from './LearnPages';
import { ARTICLE_SEO, SLOUCH_TIMER_FAQS } from './seo';

const PATH = '/learn/slouch-detector-vs-sit-up-timer' as const;

export function SlouchTimerPage() {
  const seo = ARTICLE_SEO[PATH];
  return (
    <ArticleShell path={PATH} headline={seo.headline} crumb={seo.crumb} published={seo.published} modified={seo.modified}>
      <p>
        A sit up straight reminder can mean two very different things. One is a posture timer: a clock that rings every
        20 or 30 minutes and hopes you will reset. The other is a slouch detector: a webcam check that stays quiet until
        your shape actually changes. Both can be useful. They are not interchangeable, and picking the wrong one is why
        a lot of reminders end up ignored by lunch.
      </p>
      <p>
        DeskZen is a wellness tool, not a medical device. This guide may help you notice slouching sooner. It does not
        diagnose or treat anything. If something hurts, or a new ache keeps coming back, please talk with a health
        professional.
      </p>

      <h2>A posture timer rings whether you need it or not</h2>
      <p>
        A posture timer is a calendar with a beep. You choose an interval, often 20, 30, or 45 minutes, and it fires on
        that schedule. The strength is simplicity. You do not grant camera access. You do not think about lighting. You
        get a reliable tap that says, stand up, look away, or sit back in the chair.
      </p>
      <p>
        The weakness is that the clock does not know what you are doing. It rings while you are already sitting tall,
        which trains you to dismiss it. It stays silent for the 19 minutes you spent folded toward the keyboard. Over a
        week, the sound becomes background noise. A reminder you swipe away without looking is not a reminder anymore.
      </p>
      <p>
        Timers still earn a place. They are a good stand up reminder and a good stretch reminder, because movement is
        worth doing even when your posture is fine. Bodies like a change of position. A clock is honest about that job:
        it marks time, and it does not pretend to see you. The{' '}
        <Link to="/learn/stand-up-and-stretch-reminders" className={linkClass}>
          guide to stand-up and stretch reminders
        </Link>{' '}
        is the practical version of that routine.
      </p>

      <h2>A slouch detector waits until you actually drift</h2>
      <p>
        A slouch detector uses the webcam to compare you with a shape you chose. In DeskZen you sit your best once.
        That outline is your Zen, saved in the browser on this device. Then you work. When your head drifts toward the
        screen or your shoulders round away from that outline, a nudge shows up. If you are already close to the shape
        you set, it leaves you alone.
      </p>
      <p>
        That is the whole difference. A sit up straight reminder that only rings on a clock is a timer. A sit up
        straight reminder that speaks up when you leave your own outline is a slouch detector. One answers &quot;has it
        been 30 minutes?&quot; The other answers &quot;have I melted?&quot;
      </p>
      <p>
        The useful moment is the slow slide, not the dramatic collapse. Hips inch forward. The chest folds. The head
        follows the type. None of it feels like a decision, which is why you can spend an hour in a shape you would not
        have chosen at 9 AM. A detector is there for that gap. It helps you notice. It does not force a military pose,
        and it should not scold you.
      </p>
      <p>
        In DeskZen, amber is reserved for that slouch cue so you can tell it apart from an ordinary break. The picture
        itself is not the product. The camera stays on your device. Photos and video are never saved or uploaded. The
        snapshot used for the check stays in memory only.
      </p>

      <h2>What to ask before you trust either one</h2>
      <p>You can sort most apps with four questions. The answers matter more than the marketing line on the home page.</p>
      <ul>
        <li>Does it look at you, or only at the clock?</li>
        <li>Does it stay quiet when you are already sitting the way you chose?</li>
        <li>Can you snooze it without guilt when you are in the middle of a sentence?</li>
        <li>If it uses a camera, does the video stay on the computer?</li>
      </ul>
      <p>
        A timer that fails the first two questions can still be a fine break reminder. A camera app that fails the last
        question is not a private posture tool, no matter how gentle the copy sounds. If privacy is the reason you have
        avoided webcam tools, read{' '}
        <Link to="/learn/private-posture-reminder" className={linkClass}>
          how a private posture reminder handles the camera
        </Link>
        . The short version is the rule above: nothing from the camera is saved or sent.
      </p>
      <p>
        The U.S. Occupational Safety and Health Administration describes a{' '}
        <a href="https://www.osha.gov/etools/computer-workstations/positions" target="_blank" rel="noopener noreferrer" className={linkClass}>
          neutral working position
        </a>{' '}
        for computer work: a supported back, feet on the floor or a footrest, relaxed shoulders, and a screen you are
        not craning toward. Harvard Health&apos;s overview of{' '}
        <a href="https://www.health.harvard.edu/staying-healthy/why-good-posture-matters" target="_blank" rel="noopener noreferrer" className={linkClass}>
          why posture matters
        </a>{' '}
        is a calm place to read more about comfort through the day. Neither source says you need a perfect pose every
        second. They point at a setup you can sustain, and at changing position instead of freezing.
      </p>

      <h2>Use both, and give each one a job</h2>
      <p>
        Let the timer own movement, and let the slouch detector own the drift between alarms. DeskZen is built as that
        pair. The webcam check is the slouch detector. Separate reminders can invite you to
        move, stretch, rest your eyes, or drink water. You can mark one done or snooze it. Quiet hours keep the tips
        silent when you are on a call or in a deep block of work. The{' '}
        <Link to="/webcam-posture-checker" className={linkClass}>
          free webcam posture checker
        </Link>{' '}
        page walks through the camera side. The{' '}
        <Link to="/posture-reminder-mac-windows" className={linkClass}>
          posture reminder for Mac and Windows
        </Link>{' '}
        explains the same browser tab on either computer, with nothing to install.
      </p>
      <p>
        Put the camera near eye level, about an arm&apos;s length from the screen (roughly 20 to 28 inches). Set your
        Zen in a shape you can keep. A strained pose makes every normal breath look like a slouch.
      </p>

      <h2>Why the ignored beep is usually a design problem</h2>
      <p>
        People blame themselves when they mute a reminder. Most of the time the reminder was asking the wrong question.
        A chime on the half hour cannot tell a focused, well-supported hour from a folded one. A detector can fail the
        other way: if the camera cannot see you, or you set an outline you cannot maintain, the nudges feel random.
        Pause the camera, sit back, and set your Zen again. The outline lives in this browser.
      </p>
      <p>
        You still need a desk that is not fighting you. A low laptop and a chair you perch on will beat any app. The
        guide on{' '}
        <Link to="/learn/stop-slouching-at-your-desk" className={linkClass}>
          how to stop slouching at your desk
        </Link>{' '}
        covers chair height, screen height, and the small resets that matter more than a perfect pose. If afternoons
        are when you fold,{' '}
        <Link to="/learn/afternoon-slump" className={linkClass}>
          why you crash at 3 PM
        </Link>{' '}
        looks at how a long, still sit can make that dip feel heavier.
      </p>

      <h2>A kind standard for the workday</h2>
      <p>
        The goal is not a scoreboard. Sit tall when the nudge arrives, or stand for a minute, then go back to the
        sentence you were writing. You are going to slouch. A posture timer can carry the breaks. A slouch detector can
        carry the moments in between. Skip any tool that shames you for being a person at a desk.
      </p>

      <Sources
        items={[
          { href: 'https://www.osha.gov/etools/computer-workstations/positions', label: 'OSHA, Computer Workstations: Positions' },
          { href: 'https://www.health.harvard.edu/staying-healthy/why-good-posture-matters', label: 'Harvard Health, Why posture matters' },
        ]}
      />
      <ArticleFaqs items={SLOUCH_TIMER_FAQS} />
      <RelatedGuides current={PATH} />
      <ArticleCta>
        Sit your best once, then get a nudge when you actually slouch, not only when a clock says so. Your camera stays
        on your device.
      </ArticleCta>
      <Disclaimer />
    </ArticleShell>
  );
}
