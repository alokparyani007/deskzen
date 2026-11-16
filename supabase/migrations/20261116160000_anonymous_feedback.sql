-- Anonymous feedback for DeskZen.
-- Apply this file in the Supabase SQL editor for project qhsnirxaarcvxkwoafly.
-- Do not apply it from the app, and do not put a secret key in the client.
--
-- A row stores a thumbs rating, an optional note, a random per-tab id, an optional
-- page path, and the time. No email, account id, IP address, photo, video, or posture data.

create table public.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  rating text not null,
  message text,
  anon_session text not null,
  page text,
  constraint feedback_rating_check check (rating in ('up', 'down')),
  constraint feedback_message_check check (message is null or char_length(message) <= 1000),
  constraint feedback_anon_session_check check (
    anon_session ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  constraint feedback_page_check check (
    page is null or page ~ '^/[a-z0-9/_-]{0,79}$'
  )
);

comment on table public.feedback is
  'Anonymous feedback. No email, account id, IP, photo, video, or posture data.';
comment on column public.feedback.anon_session is
  'Random id for one browser tab. Same format as usage_events. Not an account id.';
comment on column public.feedback.page is
  'Page path only. Query strings and hashes are rejected so tokens and emails cannot be stored.';
comment on column public.feedback.message is
  'Optional note, at most 1000 characters. No camera snapshot.';

alter table public.feedback enable row level security;

-- Supabase grants new public tables to anon and authenticated. Take that back.
revoke all on table public.feedback from public, anon, authenticated;
revoke all on sequence public.feedback_id_seq from public, anon, authenticated;

-- Anon and authenticated may insert the four data columns only. id and created_at stay server-side.
grant insert (rating, message, anon_session, page) on table public.feedback to anon, authenticated;
grant usage on sequence public.feedback_id_seq to anon, authenticated;

-- No select, update, or delete policy, so clients cannot read or change rows.
-- The SQL editor connects as the table owner and can still read recent feedback.
create policy "Anon inserts anonymous feedback"
  on public.feedback
  for insert
  to anon
  with check (
    rating in ('up', 'down')
    and (message is null or char_length(message) <= 1000)
    and anon_session ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and (page is null or page ~ '^/[a-z0-9/_-]{0,79}$')
  );

create policy "Authenticated inserts anonymous feedback"
  on public.feedback
  for insert
  to authenticated
  with check (
    rating in ('up', 'down')
    and (message is null or char_length(message) <= 1000)
    and anon_session ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and (page is null or page ~ '^/[a-z0-9/_-]{0,79}$')
  );

create index feedback_created_at_idx on public.feedback (created_at);

-- Recent feedback. Run in the SQL editor. Clients cannot read these rows.
-- select id, created_at, rating, left(message, 80) as message, anon_session, page
-- from public.feedback
-- order by created_at desc
-- limit 50;
