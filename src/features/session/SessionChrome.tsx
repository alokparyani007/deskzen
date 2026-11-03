import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isZenPath } from '../../app/zenPath';
import { nudgeCopy } from '../../lib/posture/score';
import { inchesFromBest } from '../../lib/posture/readSignals';
import { isQuietHour } from '../../lib/settings';
import { isHeld } from '../../lib/reminders/holds';
import { useReminderHolds } from '../reminders/useReminderHolds';
import { applyWorkStyle, featuresFor } from '../../lib/settings/visibility';
import { glowCheckDue } from '../../lib/posture/glow';
import { loadGlowCheckDay, saveGlowCheckDay, todayKey } from '../../lib/posture/glowStore';
import { stretchById } from '../stretches/data';
import { useBaseline } from '../posture/baseline-context';
import { useWellness } from '../wellness/wellness-context';
import { useSession } from './session-context';

export function SessionChrome() {
  const session = useSession();
  const wellness = useWellness();
  const { baseline, standing, ready } = useBaseline();
  const location = useLocation();
  const [today] = useState(() => todayKey());
  const [route, setRoute] = useState(location.pathname);
  const [checkDay, setCheckDay] = useState<string | null>(() => loadGlowCheckDay());
  if (route !== location.pathname) {
    setRoute(location.pathname);
    setCheckDay(loadGlowCheckDay());
  }
  const checkDue = Boolean(baseline) && !isZenPath(location.pathname) && location.pathname !== '/app' && glowCheckDue(checkDay, today);
  const quietPage = location.pathname === '/reminders' || location.pathname === '/progress';
  const cameraPage = location.pathname === '/live' || location.pathname === '/app';
  const fixedGlow = checkDue && !quietPage && location.pathname !== '/live';
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7679/ingest/221158fa-c39f-4432-bae7-b525f5f13e2e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'aaefe4'},body:JSON.stringify({sessionId:'aaefe4',runId:'pre-fix',hypothesisId:'A',location:'SessionChrome.tsx:check',message:'chrome cards',data:{path:location.pathname,spotHold:session.spotHold,hasBaseline:Boolean(baseline),checkDue,ready,checkDay,today},timestamp:Date.now()})}).catch(()=>{});
  }, [location.pathname, session.spotHold, baseline, checkDue, ready, checkDay, today]);
  useEffect(() => {
    fetch('http://127.0.0.1:7679/ingest/221158fa-c39f-4432-bae7-b525f5f13e2e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'aaefe4'},body:JSON.stringify({sessionId:'aaefe4',runId:'post-fix',hypothesisId:'C',location:'SessionChrome.tsx:cover',message:'page cover',data:{path:location.pathname,quietPage,checkDue,hasToast:Boolean(session.spotToast),spotHold:session.spotHold},timestamp:Date.now()})}).catch(()=>{});
  }, [location.pathname, quietPage, checkDue, session.spotToast, session.spotHold]);
  useEffect(() => {
    fetch('http://127.0.0.1:7679/ingest/221158fa-c39f-4432-bae7-b525f5f13e2e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'aaefe4'},body:JSON.stringify({sessionId:'aaefe4',runId:'post-fix',hypothesisId:'D',location:'SessionChrome.tsx:fixedGlow',message:'fixed glow popup',data:{path:location.pathname,fixedGlow,checkDue},timestamp:Date.now()})}).catch(()=>{});
  }, [location.pathname, fixedGlow, checkDue]);
  useEffect(() => {
    const cards = [
      session.spotCountdown !== null ? 'countdown' : '',
      session.spotChecking ? 'checking' : '',
      session.spotToast ? 'toast' : '',
      session.spotFixCopy ? 'fix' : '',
      session.spotHold ? 'hold' : '',
      session.nudgePhase === 'nudging' ? 'nudge' : '',
      session.banner ? 'banner' : '',
      wellness.message ? 'wellness' : '',
      session.toast ? 'sessionToast' : '',
    ].filter(Boolean);
    fetch('http://127.0.0.1:7679/ingest/221158fa-c39f-4432-bae7-b525f5f13e2e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'aaefe4'},body:JSON.stringify({sessionId:'aaefe4',runId:'post-fix',hypothesisId:'H',location:'SessionChrome.tsx:cards',message:'visible card flags',data:{path:location.pathname,cameraPage,cards},timestamp:Date.now()})}).catch(()=>{});
  }, [location.pathname, cameraPage, session.spotCountdown, session.spotChecking, session.spotToast, session.spotFixCopy, session.spotHold, session.nudgePhase, session.banner, wellness.message, session.toast]);
  // #endregion
  const quiet = isQuietHour(session.settings);
  const [holds] = useReminderHolds();
  // Snoozes from Reminders (one type or Snooze all) hold these cards too.
  const held = (kind: Parameters<typeof isHeld>[1]) => isHeld(holds, kind, Date.now());
  const features = featuresFor(session.settings.workStyle);
  const still =
    features.stillness &&
    session.settings.stillnessMinutes > 0 &&
    session.posture === 'standing' &&
    session.stillMs >= session.settings.stillnessMinutes * 60_000;
  const minutes = Math.max(1, Math.round(session.presenceMs / 60_000));
  const inches = baseline && session.readings ? inchesFromBest(baseline, session.readings) : undefined;
  const message = nudgeCopy(session.nudgeIssue, inches, session.readings?.screenDistanceIn);
  const allowSpotNow = () => {
    const today = new Date().getDay();
    const spotWorkDays = session.settings.spotWorkDays.includes(today)
      ? session.settings.spotWorkDays
      : [...session.settings.spotWorkDays, today];
    session.updateSettings({ quietHours: false, spotWorkDays });
    session.allowSpotChecks();
  };

  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-40 flex w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 flex-col gap-2 lg:bottom-6">
      {!quietPage && session.spotHold && (session.spotHold !== 'glow' || (ready && !baseline && !isZenPath(location.pathname) && location.pathname !== '/live' && location.pathname !== '/app')) ? (
        <SpotHoldNote hold={session.spotHold} onAllow={allowSpotNow} />
      ) : null}
      {!quietPage && !cameraPage && session.spotChecking ? (
        <p className="pointer-events-auto rounded-full bg-ink px-4 py-2 text-center text-sm font-semibold text-white shadow-lg" role="status">
          Checking posture
          <span className="mt-0.5 block text-xs font-medium text-white/80">Nothing is recorded. It stays on this device.</span>
        </p>
      ) : null}
      {!quietPage && !cameraPage && session.spotCountdown !== null && !session.spotChecking ? (
        <p className="pointer-events-auto rounded-full bg-white px-4 py-2 text-center text-sm font-semibold text-ink shadow-lg" role="status">
          Posture check in {session.spotCountdown}...{' '}
          <button type="button" className="font-semibold text-brand" onClick={session.skipSpot}>
            Skip
          </button>
        </p>
      ) : null}
      {session.spotDenied ? (
        <article className="pointer-events-auto rounded-2xl border border-glow/40 bg-white p-4 shadow-lg" aria-live="polite">
          <p className="text-sm font-semibold text-ink">The camera permission is off.</p>
          <button type="button" className="mt-3 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white" onClick={session.reenableCamera}>
            Re-enable camera
          </button>
        </article>
      ) : null}
      {!quietPage && !cameraPage && session.spotToast ? (
        <p className="pointer-events-auto rounded-full bg-brand px-4 py-2 text-center text-sm font-semibold text-white shadow-lg" role="status">
          {session.spotToast}
          <button type="button" className="ml-3 underline" onClick={session.dismissSpotToast}>
            Dismiss
          </button>
        </p>
      ) : null}
      {!quietPage && session.spotFixCopy ? (
        <article className="pointer-events-auto rounded-2xl border border-glow/40 bg-glow-tint p-4 shadow-lg" aria-live="polite">
          <p className="text-sm font-semibold text-ink">{session.spotFixCopy}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to={`/spot-fix?issue=${session.spotFixIssue ?? 'lean'}`} className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white">
              Guide me
            </Link>
            <button type="button" className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-ink" onClick={session.snoozeSpot}>
              Snooze checks 1 hr
            </button>
            <button type="button" className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-ink" onClick={session.dismissSpotFix}>
              Not now
            </button>
          </div>
        </article>
      ) : null}
      {!quietPage && session.spotStretchId && !isZenPath(location.pathname) ? <StretchHint id={session.spotStretchId} onDismiss={session.dismissSpotStretch} /> : null}
      {!quietPage && session.switchToast && !isZenPath(location.pathname) ? (
        <article className="pointer-events-auto rounded-2xl border border-brand/20 bg-white p-4 shadow-lg" aria-live="polite">
          <p className="text-sm font-semibold text-ink">
            {session.switchToast === 'standing' && !standing
              ? 'Set my Zen - standing'
              : session.switchToast === 'standing'
                ? 'Standing detected, using your standing baseline.'
                : 'Sitting detected, using your sitting baseline.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {session.switchToast === 'standing' && !standing ? (
              <Link to="/calibrate?pose=stand" className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white">
                Set my Zen - standing
              </Link>
            ) : null}
            <button type="button" className="rounded-xl bg-surface px-3 py-2 text-sm font-semibold text-ink" onClick={session.undoSwitch}>
              {session.switchToast === 'standing' ? "Actually I'm sitting" : "Actually I'm standing"}
            </button>
            <button type="button" className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-ink" onClick={session.dismissSwitch}>
              Dismiss
            </button>
          </div>
        </article>
      ) : null}
      {!quietPage && session.suggestStand && !isZenPath(location.pathname) ? (
        <article className="pointer-events-auto rounded-2xl border border-sky-brand/40 bg-white p-4 shadow-lg" aria-live="polite">
          <p className="text-sm font-semibold text-ink">Looks like you&apos;re standing. Switch to Sit and stand?</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white"
              onClick={() => {
                session.updateSettings(applyWorkStyle(session.settings, 'mixed'));
                session.dismissStandSuggest();
              }}
            >
              Switch
            </button>
            <button type="button" className="rounded-xl bg-surface px-3 py-2 text-sm font-semibold text-ink" onClick={session.dismissStandSuggest}>
              Not now
            </button>
          </div>
        </article>
      ) : null}
      {!quietPage && session.glowAsk && !isZenPath(location.pathname) ? (
        <article className="pointer-events-auto rounded-2xl border border-brand/20 bg-white p-4 shadow-lg" aria-live="polite">
          <p className="text-sm font-semibold text-ink">You looked great just now. Use this as your Glow?</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white" onClick={session.acceptGlow}>
              Yes
            </button>
            <button type="button" className="rounded-xl bg-surface px-3 py-2 text-sm font-semibold text-ink" onClick={session.dismissGlowOffer}>
              Not now
            </button>
          </div>
        </article>
      ) : null}
      {!quietPage && session.strictAsk && !isZenPath(location.pathname) ? (
        <article className="pointer-events-auto rounded-2xl border border-glow/40 bg-white p-4 shadow-lg" aria-live="polite">
          <p className="text-sm font-semibold text-ink">Feels too strict? Let&apos;s tune it to you (15 sec)</p>
          <div className="mt-3 flex gap-2">
            <Link to="/calibrate?tune=1" className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white" onClick={session.dismissStrict}>
              Tune it
            </Link>
            <button type="button" className="rounded-xl bg-surface px-3 py-2 text-sm font-semibold text-ink" onClick={session.dismissStrict}>
              Not now
            </button>
          </div>
        </article>
      ) : null}
      {!quietPage && session.setupAsk && !isZenPath(location.pathname) ? (
        <article className="pointer-events-auto rounded-2xl border border-glow/40 bg-white p-4 shadow-lg" aria-live="polite">
          <p className="text-sm font-semibold text-ink">Looks like your setup changed. Quick 10 second recheck?</p>
          <div className="mt-3 flex gap-2">
            <Link
              to={session.posture === 'standing' ? '/calibrate?pose=stand&recheck=1' : '/calibrate?pose=sit&recheck=1'}
              className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white"
            >
              Recheck
            </Link>
            <button type="button" className="rounded-xl bg-surface px-3 py-2 text-sm font-semibold text-ink" onClick={session.dismissSetup}>
              Not now
            </button>
          </div>
        </article>
      ) : null}
      {fixedGlow ? (
        <article className="pointer-events-auto rounded-2xl border border-brand/20 bg-white p-4 shadow-lg" aria-live="polite">
          <p className="text-sm font-semibold text-ink">Quick Glow check. Hold still for 3 seconds.</p>
          <div className="mt-3 flex gap-2">
            <Link
              to={session.posture === 'standing' ? '/calibrate?pose=stand&check=1' : '/calibrate?pose=sit&check=1'}
              className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white"
            >
              Start
            </Link>
            <button
              type="button"
              className="rounded-xl bg-surface px-3 py-2 text-sm font-semibold text-ink"
              onClick={() => {
                saveGlowCheckDay(today);
                setCheckDay(today);
              }}
            >
              Not now
            </button>
          </div>
        </article>
      ) : null}
      {!quietPage && session.focus ? <FocusBar /> : null}
      {!quietPage && session.toast ? (
        <p className="pointer-events-auto rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg" role="status">
          {session.toast}
          <button type="button" className="ml-3 underline" onClick={session.dismissToast}>
            Dismiss
          </button>
        </p>
      ) : null}
      {!quietPage && !quiet && session.posture === 'standing' && session.score?.cue ? (
        <p className="pointer-events-auto rounded-2xl border border-glow/40 bg-glow-tint px-4 py-3 text-sm font-semibold text-ink shadow-lg" role="status">
          {session.score.cue}
        </p>
      ) : null}
      {!quietPage && !quiet && still ? (
        <p className="pointer-events-auto rounded-2xl border border-glow/40 bg-glow-tint px-4 py-3 text-sm font-semibold text-ink shadow-lg" role="status">
          You&apos;ve been still for a while. Shift your weight or sit for a few minutes.
        </p>
      ) : null}
      {!quietPage && !quiet && !held('stand') && wellness.message ? (
        <article className="pointer-events-auto rounded-2xl border border-glow/40 bg-glow-tint p-4 shadow-lg" aria-live="polite">
          <p className="text-sm font-semibold text-ink">{wellness.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {wellness.interval.nudge === 'move' && session.settings.stretchSuggestions ? (
              <Link to="/break" className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white">
                Quick stretch
              </Link>
            ) : null}
            <button type="button" className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-ink" onClick={wellness.snooze}>
              Snooze 10 min
            </button>
            <button type="button" className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-ink" onClick={wellness.skip}>
              Skip this one
            </button>
          </div>
        </article>
      ) : null}
      {!quietPage && !quiet && wellness.note ? (
        <p className="pointer-events-auto rounded-2xl bg-sky-tint px-4 py-3 text-sm text-ink shadow-lg" role="status">
          {wellness.note}
          <button type="button" className="ml-3 font-semibold text-brand" onClick={wellness.dismissNote}>
            Got it
          </button>
        </p>
      ) : null}
      {!quietPage && session.nudgePhase === 'nudging' && !quiet && !held('posture') ? (
        <article className="pointer-events-auto rounded-2xl border border-glow/40 bg-glow-tint p-4 shadow-lg" aria-live="polite">
          <p className="text-sm font-semibold text-ink">{message}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white" onClick={session.fixedIt}>
              Fixed it
            </button>
            <button type="button" className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-ink" onClick={session.snooze}>
              Snooze 15 min
            </button>
          </div>
        </article>
      ) : null}
      {!quietPage && session.banner && !session.settings.intervalsOn && !held('move') ? (
        <article className="pointer-events-auto rounded-2xl bg-brand px-4 py-3 text-white shadow-lg" role="status">
          <p className="text-sm font-semibold">
            {session.settings.workStyle === 'stand'
              ? `You've been standing ${minutes} minutes. Shift your weight or sit for a few minutes.`
              : `You've been sitting ${minutes} minutes. Time for a short stretch.`}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/break" className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-brand" onClick={session.startBreak}>
              Take a break
            </Link>
            <button type="button" className="rounded-xl bg-brand-light/30 px-3 py-2 text-sm font-semibold" onClick={session.laterBreak}>
              Later
            </button>
            {session.settings.water ? (
              <button type="button" className="rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold" onClick={session.logWater}>
                Log a cup
              </button>
            ) : null}
          </div>
        </article>
      ) : null}
      {!quietPage && session.distanceAlertIn !== null ? (
        <p className="pointer-events-auto rounded-2xl bg-sky-tint px-4 py-3 text-sm text-ink shadow-lg" role="status">
          You&apos;re about {session.distanceAlertIn} in from your screen. Try sitting back to about 20-25 in.
          <button type="button" className="ml-3 font-semibold text-brand" onClick={session.dismissDistance}>
            Got it
          </button>
        </p>
      ) : null}
    </div>
  );
}

function SpotHoldNote({ hold, onAllow }: { hold: 'glow' | 'workday' | 'quiet' | 'paused' | 'focus'; onAllow: () => void }) {
  const copy =
    hold === 'glow'
      ? 'Set my Zen to save your Posture Print. The camera stays off until then.'
      : hold === 'workday'
        ? 'No check today. This day is turned off.'
        : hold === 'quiet'
          ? 'Quiet hours are on, so checks are paused.'
          : hold === 'paused'
            ? 'Checks are paused. Quiet hours are on, and today is not a work day.'
            : 'Focus time is on, so this check waits.';
  const canAllow = hold === 'workday' || hold === 'quiet' || hold === 'paused';
  return (
    <article className="pointer-events-auto rounded-2xl border border-ink/10 bg-white p-4 shadow-lg" aria-live="polite">
      <p className="text-sm font-semibold text-ink">{copy}</p>
      {hold === 'glow' ? (
        <Link to="/calibrate" className="mt-3 inline-flex rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white">
          Set my Zen
        </Link>
      ) : canAllow ? (
        <button type="button" className="mt-3 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white" onClick={onAllow}>
          Allow a check now
        </button>
      ) : null}
    </article>
  );
}

function StretchHint({ id, onDismiss }: { id: string; onDismiss: () => void }) {
  const stretch = stretchById(id);
  if (!stretch) return null;
  return (
    <article className="pointer-events-auto rounded-2xl border border-brand/20 bg-white p-4 shadow-lg" aria-live="polite">
      <div className="flex gap-3">
        {stretch.image ? <img src={stretch.image} alt="" className="size-16 rounded-xl object-cover" /> : null}
        <p className="text-sm font-semibold text-ink">That spot has come up a few times. A short {stretch.name.toLowerCase()} may help you feel looser.</p>
      </div>
      <div className="mt-3 flex gap-2">
        <Link to={`/stretches/${stretch.id}`} className="rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white">
          Try it
        </Link>
        <button type="button" className="rounded-xl bg-surface px-3 py-2 text-sm font-semibold text-ink" onClick={onDismiss}>
          Not now
        </button>
      </div>
    </article>
  );
}

function FocusBar() {
  const { focus, score, threshold, dismissFocus } = useSession();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!focus || focus.ended) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [focus]);
  if (!focus) return null;
  const remaining = Math.max(0, focus.endsAt - now);
  const quietGlow = !focus.ended && score !== null && score.smoothed < threshold;
  const clock = `${Math.floor(remaining / 60_000)}:${String(Math.floor((remaining % 60_000) / 1000)).padStart(2, '0')}`;

  return (
    <article className={`pointer-events-auto rounded-2xl px-4 py-3 shadow-lg ${quietGlow ? 'bg-glow text-ink' : 'bg-ink text-white'}`}>
      {focus.ended || remaining === 0 ? (
        <p className="text-sm">
          Focus complete.{' '}
          <Link className="font-semibold underline" to="/break">
            Take a stretch break
          </Link>
          <button type="button" className="ml-3 underline" onClick={dismissFocus}>
            Dismiss
          </button>
        </p>
      ) : (
        <p className="flex items-center justify-between text-sm">
          <span>Focus {clock}{quietGlow ? ' · sit back to glow' : ''}</span>
          <button type="button" className="underline" onClick={dismissFocus}>
            End
          </button>
        </p>
      )}
    </article>
  );
}
