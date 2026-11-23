import { Link } from 'react-router-dom';
import { ProductFigure } from './GuidePage';
import { ArticleCta, ArticleFaqs, ArticleShell, Disclaimer, RelatedGuides, Sources, linkClass } from './LearnPages';
import { ARTICLE_SEO, PRIVATE_POSTURE_FAQS } from './seo';

const PATH = '/learn/private-posture-reminder' as const;

export function PrivatePosturePage() {
  const seo = ARTICLE_SEO[PATH];
  return (
    <ArticleShell path={PATH} headline={seo.headline} crumb={seo.crumb} published={seo.published} modified={seo.modified}>
      <p>
        A webcam posture reminder only deserves your trust if you can say, in one sentence, what happens to the
        picture. Here is DeskZen&apos;s sentence. The camera stays on your device. Photos and video are never saved or
        uploaded. The snapshot used for a check stays in memory only, and then it is gone. This page is the longer
        version of that rule, including the things DeskZen does store, so &quot;private&quot; is not a vague promise.
      </p>
      <p>
        DeskZen is a wellness tool, not a medical device. It helps you notice a slouch. It does not diagnose or treat
        anything. If something hurts, talk with a health professional.
      </p>

      <h2>What on-device posture actually means</h2>
      <p>
        On-device posture means the check runs on your computer, inside the browser, with a model that works locally.
        Your laptop webcam, or a camera you plug in, supplies the picture. DeskZen looks at that frame to compare you
        with the outline you set when you sat your best. The comparison happens in the browser tab. The picture is not
        sent to DeskZen, and it is not written into a file.
      </p>
      <p>
        That is different from a tool that uploads a clip or a stream of landmarks so a server can score you. A private
        posture app should be able to point at the place the picture stops. For DeskZen, it stops in memory on your
        device.
      </p>
      <p>
        You still have to allow the camera. The browser will ask, and you can say no. You can also pause the camera
        inside DeskZen any time, with one control, and the tracks stop. When you are done for the day, closing the tab
        or pausing is enough to end the check. You do not need to find a recording to delete, because there is not one.
      </p>

      <h2>What never gets saved</h2>
      <p>
        Photos and video are never saved or uploaded. DeskZen does not build a clip of your workday, does not keep a
        snapshot in a gallery, and does not send images or raw landmarks to a server. The frame used for the posture
        check stays in memory only. When the check moves on, that frame is not a file you could open later, and it is
        not a file we could open either.
      </p>
      <p>
        Webcam privacy, in this product, is that boundary. The camera is on so the slouch detector can help you notice
        a change in your outline. The camera is not on so anyone can watch you back. Amber on the screen means a slouch
        cue, not a saved moment. The illustration below is a drawing of that screen, not a photo from someone&apos;s
        laptop.
      </p>
      <ProductFigure
        src="/site/slouch-nudge.svg"
        alt="Illustrated DeskZen laptop screen with an amber slouch nudge. The caption says photos and video stay on the laptop and are not uploaded."
        width={800}
        height={500}
        caption="The nudge is drawn on your screen. The camera picture that produced it is not saved."
      />

      <h2>What can stay on this computer, and what an account is</h2>
      <p>
        &quot;Never saves your camera&quot; is not the same sentence as &quot;stores nothing.&quot; A useful private
        posture app still needs a few numbers so it can remember your setup. DeskZen keeps your posture outline,
        settings, and daily scores in this browser, on your device. Those are measurements and preferences. They are
        not photos or video.
      </p>
      <p>
        An account is optional. You can set your Zen and open Live view with no sign-up. If you do sign in, that uses
        an email magic link. We store the email address and the account data needed to keep you signed in. Your outline
        and progress stay in the browser. They are not synced to our servers today. Signing in does not start uploading
        the camera.
      </p>
      <ProductFigure
        src="/site/progress.webp"
        alt="DeskZen weekly progress screen with a score and a chart comparing this week with last week. The figures are numbers stored in the browser, not a camera image."
        width={1138}
        height={763}
        caption="A weekly score is a number kept in this browser. It is not a recording."
      />
      <p>
        You can clear what this browser saved from Settings in the app, or by clearing site data for DeskZen in your
        browser. To delete an account, or to ask a privacy question, the{' '}
        <Link to="/privacy" className={linkClass}>
          Privacy Policy
        </Link>{' '}
        lists the contact address. That policy is the source of the rules on this page. If the two ever disagree, the
        policy is the one to trust, and this page should be updated to match it.
      </p>

      <h2>The public website is not the camera check</h2>
      <p>
        It helps to separate two places. The marketing pages, including this guide, are a normal website. They use
        Google Analytics to count visits and see how people find the site. The DeskZen app, where the camera turns on,
        does not load Google Analytics. The camera feed stays on your device there and is never uploaded or saved.
      </p>
      <p>
        DeskZen also counts a few anonymous usage events, such as started Live view, to see if the product is working.
        A count stores a short event name, a random id for that browser tab, and sometimes the page path. It includes
        no personal info and no camera data. We do not store your email, account id, or IP address with these counts.
        Optional feedback you choose to send is stored without your name or email. We do not use advertising cookies.
      </p>
      <p>
        None of those events is a picture. If you never open the app, the camera never starts. Reading this article
        does not turn it on. The button to <a href="/set-my-zen" className={linkClass}>Set my Zen</a> is what asks the
        browser for the camera, and only after you continue.
      </p>

      <h2>Questions worth asking any webcam posture tool</h2>
      <p>
        If you compare DeskZen with another private posture app, the brochure words are easy to copy. These questions
        are harder, and they are the ones that matter for webcam privacy.
      </p>
      <ul>
        <li>Does the check run on the device, or does a server see the frame?</li>
        <li>Are photos, video, or landmarks written to disk or sent anywhere?</li>
        <li>Can you use it with no account?</li>
        <li>Can you pause the camera in one step, and does that stop the tracks?</li>
        <li>What numbers are stored, where, and how do you delete them?</li>
        <li>Does the marketing site use analytics that the camera screen does not?</li>
      </ul>
      <p>
        You should be able to get plain answers without a scavenger hunt. DeskZen&apos;s answers are the ones above.
        The same rules apply on a Mac and on a Windows PC, because it is the same browser page. There is nothing to
        install, which also means there is no separate desktop app with its own camera permission sitting in the menu
        bar. The{' '}
        <Link to="/posture-reminder-mac-windows" className={linkClass}>
          posture reminder for Mac and Windows
        </Link>{' '}
        page is the practical version of that, and the{' '}
        <Link to="/webcam-posture-checker" className={linkClass}>
          free webcam posture checker
        </Link>{' '}
        explains the slouch nudge itself.
      </p>

      <h2>Privacy does not replace a decent setup</h2>
      <p>
        A camera that stays on your laptop can still be a nuisance if the reminder is harsh or the chair is fighting
        you. On-device posture is the privacy half. The other half is a nudge you can live with: sit your best once,
        work as usual, and get a quiet tip when you drift. You can snooze it. You can ignore a single cue and keep
        typing. The tool helps you notice. It does not grade your character.
      </p>
      <p>
        The habit side is in{' '}
        <Link to="/learn/stop-slouching-at-your-desk" className={linkClass}>
          how to stop slouching at your desk
        </Link>
        ,{' '}
        <Link to="/learn/stand-up-and-stretch-reminders" className={linkClass}>
          stand-up and stretch reminders
        </Link>
        , and{' '}
        <Link to="/learn/slouch-detector-vs-sit-up-timer" className={linkClass}>
          a slouch detector versus a sit-up timer
        </Link>
        .
      </p>
      <p>
        Use DeskZen on devices you control, and only point the camera at people who are fine with it. Pause it when
        someone else sits down, or when you would rather not be in frame.
      </p>

      <Sources items={[{ href: 'https://www.deskzenapp.com/privacy', label: 'DeskZen Privacy Policy' }]} />
      <ArticleFaqs items={PRIVATE_POSTURE_FAQS} />
      <RelatedGuides current={PATH} />
      <ArticleCta>
        Set your Zen with the camera on your device. Photos and video are never saved or uploaded.
      </ArticleCta>
      <Disclaimer />
    </ArticleShell>
  );
}
