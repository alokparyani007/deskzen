import { Link } from 'react-router-dom';
import { siteFocus } from './SiteChrome';
import { GuidePage, ProductFigure } from './GuidePage';
import { MAC_FAQS } from './seo';

const linkClass = `rounded font-semibold text-outline underline underline-offset-2 hover:text-white ${siteFocus}`;

export function MacWindowsPage() {
  return (
    <GuidePage
      path="/posture-reminder-mac-windows"
      crumb="Mac and Windows"
      title="Posture reminder for Mac and Windows"
      lede="A free posture reminder for Mac, Windows, and any laptop with a webcam. Nothing to download. DeskZen runs in the browser, and the camera stays on your device."
      faqs={MAC_FAQS}
    >
      <h2>What to look for before you install anything</h2>
      <p>
        Search results for a posture reminder app for Mac are full of menu-bar utilities. Windows has its own set of
        desktop apps. Many of them are fine if you want a dedicated install and you are comfortable giving that program
        permission to run all day. A few questions are worth asking first.
      </p>
      <ul>
        <li>Does it watch for a slouch, or does it only ring a timer?</li>
        <li>Does the camera stay on the computer, or can video leave the machine?</li>
        <li>Can you try it with no sign-up?</li>
        <li>Does the same tool exist for your work PC and your home Mac?</li>
      </ul>
      <p>
        Native apps can sit beside the clock and stay out of the browser. That is a real advantage if you never want a
        tab open. The tradeoff is an installer, a separate update cycle, and sometimes a different app on each system.
      </p>

      <h2>One laptop posture reminder for both</h2>
      <p>
        DeskZen is the browser option. Open it on a Mac. Open the same site on a Windows laptop. There is no App Store
        step and no .exe to run. A posture reminder for Mac and a posture reminder for Windows can be the same tab.
      </p>
      <p>
        Your laptop webcam is enough. Set your Zen once on that computer, then work. When you slouch, you get a nudge
        that helps you notice it. When you want a break, DeskZen can remind you to stand, look away, or drink water.
        Quiet hours keep it silent during a meeting or a deep work block.
      </p>
      <p>
        It does not claim to fix how your back feels. It is a wellness tool, not a medical device. The job is a gentle
        tap so you can sit tall again and keep going.
      </p>

      <ProductFigure
        src="/site/reminders.webp"
        alt="DeskZen reminders screen on a dark background, with a spot check next and a day list of eye breaks and water tips."
        width={1150}
        height={498}
        caption="Break reminders run beside the posture check, on a Mac or a Windows laptop."
      />

      <h2>How to start on this computer</h2>
      <ol>
        <li>Use Chrome, Edge, Safari, or another current browser. Phones are not the focus. A laptop camera sees your desk posture more steadily.</li>
        <li>Allow the camera when the browser asks. The picture is checked on this device and is never uploaded.</li>
        <li>Choose Set my Zen and sit your best for about 30 seconds. No sign-up.</li>
        <li>Leave the tab open while you work. Pause the camera any time from the on-screen control.</li>
      </ol>
      <p>
        If you switch computers, set your Zen again there. The outline is stored in that browser, not on a server. That
        is intentional. It is how photos and video stay off our systems. Numbers such as a weekly score can stay in this
        browser too. They are not a recording of you.
      </p>
      <p>
        Want the posture check itself, step by step? The{' '}
        <Link to="/webcam-posture-checker" className={linkClass}>
          free webcam posture checker
        </Link>{' '}
        page walks through the slouch nudge, privacy, and the difference between a camera check and a sit-up timer.
      </p>

      <h2>Mac and Windows, without two installs</h2>
      <p>
        On a Mac, you do not need a menu-bar item to get a reminder. On Windows, you do not need a startup program.
        Updates ship with the website, so you are not managing two versions. If your workplace laptop blocks app
        stores but allows the browser, the page still opens.
      </p>
      <p>
        Give the camera a clear view of your head and shoulders. About an arm&apos;s length from the screen, roughly 20
        to 28 inches, is a comfortable place to start. Then forget about the tool until it has something useful to say.
      </p>
    </GuidePage>
  );
}
