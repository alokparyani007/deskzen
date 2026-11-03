# Next fixes: slow down Setup check, then fix Lock, Catch Me and Glow-up

Do these four parts in order. Finish and test each part before starting the next.

## Part 1. Setup check moves on too fast
Setup should stay easy, but it must never jump ahead before the user has seen the outline and their score.
- Remove ALL auto-advance from SetupStep. The user always taps to continue.
- The user stays on this screen for at least 5 s (setup.minStayMs = 5_000).
- After that:
  - At 90 or more: show "Great setup!" and an emerald "Continue" button.
  - At 100: show "Perfect setup!", the pulse, and the spoken line.
  - Below 90: show "Good enough, keep going" after 15 s at 75 or more, and after 25 s otherwise.
- Speak at most once every 4 s.
- Update the tests.
(If prompts/09b-fix-setup-honest.md has already been done, keep its numbers.)

## Part 2. Step 3 Lock
Follow prompts/09b-fix-lock-v2.md completely. It guides the user into good posture, then locks it in.

## Part 3. Step 4 Catch Me
Follow ONLY the "Step 4: Catch Me" section of prompts/09b-fix-lock-and-catch.md, and its Catch Me tests. Skip its Step 3 section, which is replaced by lock-v2.

## Part 4. Step 5 Glow-up
Follow prompts/09b-fix-glow-up.md completely. Make sure the debug fetches to 127.0.0.1:7679 (the "#region agent log" blocks) are removed from PrintFlow.tsx and anywhere else.

When done, tell me in plain English how to test the whole flow, Step 1 through Step 5.
