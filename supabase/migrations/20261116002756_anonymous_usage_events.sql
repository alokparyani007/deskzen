-- Anonymous product counts for DeskZen.
-- Apply this file in the Supabase SQL editor for project qhsnirxaarcvxkwoafly.
-- The browser uses the public anon key only. Do not put a secret key in the client.
--
-- Rows store an event name, a random per-tab id, an optional page path, and the time.
-- No email, account id, IP address, photo, video, or posture data.

create table public.usage_events (
  id bigint generated always as identity primary key,
  event text not null,
  created_at timestamptz not null default now(),
  anon_session text not null,
  path text,
  constraint usage_events_event_check check (
    event in (
      'try_now_click',
      'app_open',
      'zen_started',
      'zen_saved',
      'live_started',
      'live_5min',
      'sign_in_completed'
    )
  ),
  constraint usage_events_anon_session_check check (
    anon_session ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  constraint usage_events_path_check check (
    path is null or path ~ '^/[a-z0-9/_-]{0,79}$'
  )
);

comment on table public.usage_events is
  'Anonymous usage counts. No email, account id, IP, photo, video, or posture data.';
comment on column public.usage_events.anon_session is
  'Random id for one browser tab. Not an account id.';
comment on column public.usage_events.path is
  'Page path only. Query strings and hashes are rejected so tokens and emails cannot be stored.';

alter table public.usage_events enable row level security;

-- Supabase grants new public tables to anon and authenticated. Take that back.
revoke all on table public.usage_events from public, anon, authenticated;
revoke all on sequence public.usage_events_id_seq from public, anon, authenticated;

-- Anon may insert the three data columns only. id and created_at stay server-side.
grant insert (event, anon_session, path) on table public.usage_events to anon;
grant usage on sequence public.usage_events_id_seq to anon;

-- No select, update, or delete policy for anon or authenticated, so those roles cannot read or change rows.
-- The SQL editor connects as the table owner and can still query counts.
create policy "Anon inserts anonymous usage events"
  on public.usage_events
  for insert
  to anon
  with check (
    event in (
      'try_now_click',
      'app_open',
      'zen_started',
      'zen_saved',
      'live_started',
      'live_5min',
      'sign_in_completed'
    )
    and anon_session ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and (path is null or path ~ '^/[a-z0-9/_-]{0,79}$')
  );

create index usage_events_created_at_idx on public.usage_events (created_at);

-- Daily funnel (US Pacific dates). Change the time zone name for another US zone.
-- select
--   (created_at at time zone 'America/Los_Angeles')::date as day,
--   count(*) filter (where event = 'try_now_click') as try_now_click,
--   count(distinct anon_session) filter (where event = 'try_now_click') as try_now_sessions,
--   count(*) filter (where event = 'app_open') as app_open,
--   count(*) filter (where event = 'zen_started') as zen_started,
--   count(*) filter (where event = 'zen_saved') as zen_saved,
--   count(*) filter (where event = 'live_started') as live_started,
--   count(*) filter (where event = 'live_5min') as live_5min,
--   count(*) filter (where event = 'sign_in_completed') as sign_in_completed
-- from public.usage_events
-- where created_at >= now() - interval '30 days'
-- group by 1
-- order by 1 desc;
