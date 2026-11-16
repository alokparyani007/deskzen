-- Optional in-use feedback for DeskZen.
-- Run this in the Supabase SQL editor for project qhsnirxaarcvxkwoafly when you want it live.
-- The app does not apply this file. The browser uses the public anon key only.
--
-- One popup shares a client-generated feedback_id. Each answer is its own row,
-- so the client only inserts and never reads or updates.
-- No email, account id, IP address, photo, video, or posture data.

create table public.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  feedback_id uuid not null,
  anon_session text not null,
  question text not null,
  answer text,
  page text,
  constraint feedback_feedback_id_check check (
    feedback_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  constraint feedback_anon_session_check check (
    anon_session ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  constraint feedback_question_check check (
    question in (
      'helping',
      'wish',
      'source',
      'frequency',
      'setup',
      'alerts',
      'recommend',
      'pay',
      'comment'
    )
  ),
  constraint feedback_answer_check check (
    answer is null
    or (question = 'helping' and answer in ('yes', 'a_little', 'not_really'))
    or (question = 'wish' and answer in ('better_alerts', 'fewer_reminders', 'easier_setup', 'other'))
    or (question = 'source' and answer in ('tiktok', 'instagram', 'reddit', 'google', 'friend', 'other'))
    or (question = 'frequency' and answer in ('every_day', 'a_few_times_a_week', 'first_time'))
    or (question = 'setup' and answer in ('easy', 'okay', 'confusing'))
    or (question = 'alerts' and answer in ('just_right', 'too_many', 'too_few'))
    or (question = 'recommend' and answer in ('yes', 'maybe', 'no'))
    or (question = 'pay' and answer in ('yes', 'maybe', 'no'))
    or (question = 'comment' and char_length(answer) between 1 and 1000)
  ),
  constraint feedback_page_check check (
    page is null or page ~ '^/[a-z0-9/_-]{0,79}$'
  )
);

comment on table public.feedback is
  'Optional in-use feedback. No email, account id, IP, photo, video, or posture data.';
comment on column public.feedback.feedback_id is
  'Client-generated id shared by the answers from one popup. Not an account id.';
comment on column public.feedback.anon_session is
  'Random id for one browser tab. Same format as usage_events.anon_session. Not an account id.';
comment on column public.feedback.question is
  'Which prompt this row answers, or comment for the optional note.';
comment on column public.feedback.answer is
  'The chosen value, or free text up to 1000 characters for a comment.';
comment on column public.feedback.page is
  'Page path only. Query strings and hashes are rejected so tokens and emails cannot be stored.';

alter table public.feedback enable row level security;

-- Supabase grants new public tables to anon and authenticated. Take that back.
revoke all on table public.feedback from public, anon, authenticated;
revoke all on sequence public.feedback_id_seq from public, anon, authenticated;

-- Insert the answer columns only. id and created_at stay server-side.
grant insert (feedback_id, anon_session, question, answer, page) on table public.feedback to anon;
grant usage on sequence public.feedback_id_seq to anon;
grant insert (feedback_id, anon_session, question, answer, page) on table public.feedback to authenticated;
grant usage on sequence public.feedback_id_seq to authenticated;

-- No policy except insert, so anon and authenticated cannot read or change rows.
create policy "Anon inserts feedback"
  on public.feedback
  for insert
  to anon
  with check (
    feedback_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and anon_session ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and question in (
      'helping',
      'wish',
      'source',
      'frequency',
      'setup',
      'alerts',
      'recommend',
      'pay',
      'comment'
    )
    and (
      answer is null
      or (question = 'helping' and answer in ('yes', 'a_little', 'not_really'))
      or (question = 'wish' and answer in ('better_alerts', 'fewer_reminders', 'easier_setup', 'other'))
      or (question = 'source' and answer in ('tiktok', 'instagram', 'reddit', 'google', 'friend', 'other'))
      or (question = 'frequency' and answer in ('every_day', 'a_few_times_a_week', 'first_time'))
      or (question = 'setup' and answer in ('easy', 'okay', 'confusing'))
      or (question = 'alerts' and answer in ('just_right', 'too_many', 'too_few'))
      or (question = 'recommend' and answer in ('yes', 'maybe', 'no'))
      or (question = 'pay' and answer in ('yes', 'maybe', 'no'))
      or (question = 'comment' and char_length(answer) between 1 and 1000)
    )
    and (page is null or page ~ '^/[a-z0-9/_-]{0,79}$')
  );

create policy "Authenticated inserts feedback"
  on public.feedback
  for insert
  to authenticated
  with check (
    feedback_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and anon_session ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and question in (
      'helping',
      'wish',
      'source',
      'frequency',
      'setup',
      'alerts',
      'recommend',
      'pay',
      'comment'
    )
    and (
      answer is null
      or (question = 'helping' and answer in ('yes', 'a_little', 'not_really'))
      or (question = 'wish' and answer in ('better_alerts', 'fewer_reminders', 'easier_setup', 'other'))
      or (question = 'source' and answer in ('tiktok', 'instagram', 'reddit', 'google', 'friend', 'other'))
      or (question = 'frequency' and answer in ('every_day', 'a_few_times_a_week', 'first_time'))
      or (question = 'setup' and answer in ('easy', 'okay', 'confusing'))
      or (question = 'alerts' and answer in ('just_right', 'too_many', 'too_few'))
      or (question = 'recommend' and answer in ('yes', 'maybe', 'no'))
      or (question = 'pay' and answer in ('yes', 'maybe', 'no'))
      or (question = 'comment' and char_length(answer) between 1 and 1000)
    )
    and (page is null or page ~ '^/[a-z0-9/_-]{0,79}$')
  );

create index feedback_created_at_idx on public.feedback (created_at);
create index feedback_feedback_id_idx on public.feedback (feedback_id);

-- Recent popups. Run in the SQL editor. Each feedback_id is one card.
-- select
--   feedback_id,
--   min(created_at) as started_at,
--   max(page) as page,
--   max(answer) filter (where question = 'helping') as helping,
--   max(answer) filter (where question = 'wish') as wish,
--   max(answer) filter (where question = 'source') as source,
--   max(answer) filter (where question = 'frequency') as frequency,
--   max(answer) filter (where question = 'setup') as setup,
--   max(answer) filter (where question = 'alerts') as alerts,
--   max(answer) filter (where question = 'recommend') as recommend,
--   max(answer) filter (where question = 'pay') as pay,
--   max(answer) filter (where question = 'comment') as comment
-- from public.feedback
-- where created_at >= now() - interval '30 days'
-- group by feedback_id
-- order by started_at desc;

-- Answer counts per question.
-- select question, answer, count(*) as answers
-- from public.feedback
-- group by question, answer
-- order by question, answers desc;
