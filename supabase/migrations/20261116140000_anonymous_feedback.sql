-- Optional thumbs feedback for DeskZen.
-- Not applied to production yet. Run this in the SQL editor for project
-- qhsnirxaarcvxkwoafly when you are ready. Do not run it twice.
-- The browser uses the public anon key only. Do not put a secret key in the client.
--
-- A row is a thumbs rating, an optional note, a random per-tab id, an optional
-- page path, and the time. No email, account id, IP address, photo, video,
-- camera snapshot, or posture data.

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
  'Optional thumbs feedback. No email, account id, IP, photo, video, or posture data.';
comment on column public.feedback.anon_session is
  'Same random per-tab id as usage_events.anon_session. Not an account id.';
comment on column public.feedback.message is
  'Optional note, at most 1000 characters. No name or email is requested.';
comment on column public.feedback.page is
  'Page path only. Query strings and hashes are rejected so tokens and emails cannot be stored.';

alter table public.feedback enable row level security;

-- Supabase grants new public tables to anon and authenticated. Take that back.
revoke all on table public.feedback from public, anon, authenticated;
revoke all on sequence public.feedback_id_seq from public, anon, authenticated;

-- Insert-only on the four data columns. id and created_at stay server-side.
-- There is no select, update, or delete privilege, and no policy for those commands.
grant insert (rating, message, anon_session, page) on table public.feedback to anon;
grant usage on sequence public.feedback_id_seq to anon;

create policy "Anon inserts feedback"
  on public.feedback
  for insert
  to anon
  with check (
    rating in ('up', 'down')
    and (message is null or char_length(message) <= 1000)
    and anon_session ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and (page is null or page ~ '^/[a-z0-9/_-]{0,79}$')
  );

grant insert (rating, message, anon_session, page) on table public.feedback to authenticated;
grant usage on sequence public.feedback_id_seq to authenticated;

create policy "Authenticated inserts feedback"
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

-- Read notes in the SQL editor (table owner). Days are US Pacific.
-- The browser cannot run this. Clients have no read privilege.
-- select
--   (created_at at time zone 'America/Los_Angeles')::date as day,
--   created_at at time zone 'America/Los_Angeles' as at_pt,
--   rating,
--   message,
--   page,
--   anon_session
-- from public.feedback
-- where created_at >= now() - interval '30 days'
-- order by created_at desc;
