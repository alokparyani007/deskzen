import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { CONTACT_EMAIL, SitePage, siteFocus } from './SiteChrome';
import { PAGE_META } from './seo';
import type { PublicPath } from './seo';

function ContactLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className={`rounded font-semibold text-outline underline-offset-2 hover:underline ${siteFocus}`}>
      {CONTACT_EMAIL}
    </a>
  );
}

function LegalPage({ title, path, children }: { title: string; path: PublicPath; children: ReactNode }) {
  useEffect(() => {
    document.title = PAGE_META[path].title;
  }, [path]);
  return (
    <SitePage>
      <article className="mx-auto max-w-3xl px-5 pb-20 pt-8 sm:px-8 sm:pt-12">
        <p className="inline-flex rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200">
          Draft
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-white/60">
          This is a draft written in plain language while DeskZen is in early access. It is not final and is not legal
          advice. The final version will replace it before accounts open.
        </p>
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
    <LegalPage title="Privacy Policy" path="/privacy">
      <section>
        <h2>Your camera stays on your device</h2>
        <ul>
          <li>DeskZen checks your posture inside your browser. The camera picture is never sent to us.</li>
          <li>Photos and video are never saved or uploaded.</li>
          <li>What DeskZen keeps, like your Posture Print outline, settings and daily scores, is stored in this browser.</li>
        </ul>
      </section>
      <section>
        <h2>Your account</h2>
        <p>
          When sign-in opens, we will keep only what an account needs, like your email address. This section will list
          exactly what is stored and who provides sign-in before accounts go live.
        </p>
      </section>
      <section>
        <h2>Your choices</h2>
        <ul>
          <li>You can pause the camera any time.</li>
          <li>You can export or delete everything DeskZen saved from Settings in the app.</li>
        </ul>
      </section>
      <section>
        <h2>Questions</h2>
        <p>
          Email us at <ContactLink />. You can also find us at @deskzenapp.
        </p>
      </section>
    </LegalPage>
  );
}

export function TermsPage() {
  return (
    <LegalPage title="Terms of Use" path="/terms">
      <section>
        <h2>Using DeskZen</h2>
        <p>
          DeskZen is free during early access. Features may change while we build it, and we may pause or end early
          access at any time.
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
        <h2>Coming soon</h2>
        <p>Full terms, including accounts, will be posted here before sign-up opens.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Questions about these terms? Email us at <ContactLink />.
        </p>
      </section>
    </LegalPage>
  );
}
