import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SitePage, siteFocus } from './SiteChrome';
import { PAGE_META } from './seo';
import type { PublicPath } from './seo';

function ContactFormLink({ children }: { children: string }) {
  return (
    <Link to="/contact" className={`rounded font-semibold text-outline underline-offset-2 hover:underline ${siteFocus}`}>
      {children}
    </Link>
  );
}

function LegalPage({ title, path, updated, children }: { title: string; path: PublicPath; updated: string; children: ReactNode }) {
  useEffect(() => {
    document.title = PAGE_META[path].title;
  }, [path]);
  return (
    <SitePage>
      <article className="mx-auto max-w-3xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm text-white/55">Last updated {updated}</p>
        <div className="mt-8 space-y-6 text-white/80 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
          {children}
        </div>
        <p className="mt-10 text-sm text-outline/80">DeskZen is a wellness tool, not a medical device.</p>
      </article>
    </SitePage>
  );
}

export function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" path="/privacy" updated="November 24, 2026">
      <section>
        <h2>Your camera stays on your device</h2>
        <ul>
          <li>DeskZen checks your posture inside your browser with an on-device model. The camera picture is never sent to us.</li>
          <li>Photos and video are never saved or uploaded. The snapshot stays in memory only.</li>
          <li>Your Posture Print outline, settings, daily scores and similar app data stay in this browser on your device.</li>
        </ul>
      </section>
      <section>
        <h2>Your account</h2>
        <p>
          Sign-in uses an email magic link through Supabase Auth. We store the email address and account data needed to
          keep you signed in. App data like your Posture Print and progress stays in your browser; it is not synced to
          our servers today.
        </p>
      </section>
      <section>
        <h2>Where DeskZen runs</h2>
        <ul>
          <li>The website and app are hosted on Vercel.</li>
          <li>Accounts and authentication are provided by Supabase.</li>
          <li>
            The public website pages use Google Analytics to count visits and see how people find the site. The DeskZen
            app does not load Google Analytics. The camera feed stays on your device and is never uploaded or saved.
          </li>
          <li>
            DeskZen counts anonymous usage events, like &quot;started Live view&quot;, to see if the product is working.
            A count stores a short event name, a random id for this browser tab, and sometimes the page path. It includes
            no personal info and no camera data. We do not store your email, account id, or IP address with these counts.
          </li>
          <li>Optional feedback answers and any note you write are stored without your name or email.</li>
          <li>
            If you write through the contact form, we store your name, the email address you type, and your message so
            we can reply. That note is not a photo or a video, and we do not use it for advertising.
          </li>
          <li>We do not use advertising cookies.</li>
        </ul>
      </section>
      <section>
        <h2>Your choices</h2>
        <ul>
          <li>You can pause the camera any time.</li>
          <li>You can clear what DeskZen saved in this browser from Settings in the app, or by clearing site data in your browser.</li>
          <li>To delete your account or ask a privacy question, use the <ContactFormLink>contact form</ContactFormLink>.</li>
        </ul>
      </section>
      <section>
        <h2>Questions</h2>
        <p>
          Questions? Use the <ContactFormLink>contact form</ContactFormLink>. You can also find us at @deskzenapp.
        </p>
      </section>
    </LegalPage>
  );
}

export function TermsPage() {
  return (
    <LegalPage title="Terms of Use" path="/terms" updated="November 24, 2026">
      <section>
        <h2>Using DeskZen</h2>
        <p>
          DeskZen is free during early access. Features may change while we build it, and we may pause or end early
          access at any time.
        </p>
      </section>
      <section>
        <h2>Your account</h2>
        <p>
          You sign in with an email magic link. Keep your inbox secure, and only use DeskZen on devices you control.
          You are responsible for activity on your account.
        </p>
      </section>
      <section>
        <h2>A wellness tool</h2>
        <p>
          DeskZen offers general wellness tips like posture nudges and break reminders. It does not diagnose, treat or
          prevent any condition. If something hurts, please talk to a health professional.
        </p>
      </section>
      <section>
        <h2>Be kind to your setup</h2>
        <p>Use DeskZen on your own devices, and only point the camera at people who are fine with it.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms? Use the <ContactFormLink>contact form</ContactFormLink>.
        </p>
      </section>
    </LegalPage>
  );
}
