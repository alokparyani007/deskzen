import { Link } from 'react-router-dom';
import { PAGE_ART } from './pageArt';
import { GuidePage, ProductFigure } from './GuidePage';
import { CHECKER_FAQS } from './seo';
import { siteFocus } from './SiteChrome';

export function WebcamPostureCheckerPage() {
  return (
    <GuidePage
      path="/webcam-posture-checker"
      crumb="Webcam posture checker"
      title="Free webcam posture checker"
      lede="Check your posture in the browser, with no download and no sign-up. DeskZen is a slouch detector that helps you notice when you drift. The camera stays on your device."
      faqs={CHECKER_FAQS}
    >
      <h2>How the checker works</h2>
      <p>
        DeskZen is a webcam posture checker that lives in a browser tab. You sit your best once. That shape becomes your
        Zen, a personal outline stored on this device. Then you work as usual. When your head drifts toward the screen or
        your shoulders round away from that outline, a quiet nudge shows up.
      </p>
      <ol>
        <li>Set your Zen. Sit tall and comfortable for a few seconds while DeskZen learns your outline.</li>
        <li>Leave the tab open on your laptop and get on with the work in front of you.</li>
        <li>Get a nudge when you slouch. Sit tall when you can, then keep going. There is no score to chase in the moment.</li>
      </ol>
      <p>
        It is a sit up straight reminder that watches you, not a clock. A timer can ring while you are already sitting
        well, or stay quiet while you fold toward the keyboard. A browser posture checker looks at the shape you are
        actually in.
      </p>

      <ProductFigure
        src={PAGE_ART['/webcam-posture-checker'].src}
        alt={PAGE_ART['/webcam-posture-checker'].alt}
        width={PAGE_ART['/webcam-posture-checker'].width}
        height={PAGE_ART['/webcam-posture-checker'].height}
        caption={PAGE_ART['/webcam-posture-checker'].caption}
        loading="eager"
      />

      <h2>No download, and no account</h2>
      <p>
        A lot of people search for a free posture corrector app with no download. Here is the plain version of that
        idea. DeskZen does not correct you, and it is not a medical device. It is a reminder. It helps you notice
        slouching so you can reset on your own.
      </p>
      <p>
        There is nothing to install. Chrome, Edge, Safari, or Firefox on a laptop is enough, plus the webcam you already
        have. Choose Set my Zen and you are in the guest flow: no sign-up, no credit card, and no extra program running
        in the menu bar. An account is optional later, if you want one.
      </p>
      <p>
        The same page works on a Mac and on a Windows PC. If you use both, open{' '}
        <Link to="/posture-reminder-mac-windows" className={`rounded font-semibold text-outline underline underline-offset-2 hover:text-white ${siteFocus}`}>
          the Mac and Windows guide
        </Link>{' '}
        for what to expect on each computer. The outline stays in the browser where you set it, which is how the camera
        data stays off our servers.
      </p>

      <h2>What stays on your device</h2>
      <p>
        The camera stays on your device. Photos and video are never saved or uploaded. DeskZen does not build a clip of
        your workday, and it does not send landmarks or images to a server. You can pause the camera with one click.
        You can clear the outline and other saved numbers from Settings in the app, or by clearing site data in the
        browser.
      </p>
      <p>
        DeskZen can also remind you to look away, drink water, stand, or stretch. Those break reminders are separate
        from the posture check. Use the ones you want, and quiet hours keep the tips silent when you need to focus.
      </p>

      <h2>A simple setup before the first check</h2>
      <ul>
        <li>Put the webcam near eye level. A short stack of books under a laptop, or an external camera on the monitor, is enough.</li>
        <li>Sit about an arm&apos;s length from the screen, roughly 20 to 28 inches, so you are not craning forward to read.</li>
        <li>Plant both feet and let the chair support your back. The goal is a shape you can keep, not a stiff pose.</li>
        <li>Set your Zen in that shape. It takes about 30 seconds. Then leave Live view open while you work.</li>
      </ul>
      <p>
        If the nudge shows up, it is information, not a verdict. Sit tall, stand for a minute, or snooze it and finish
        the sentence you were on. The useful part is noticing sooner.
      </p>
    </GuidePage>
  );
}
