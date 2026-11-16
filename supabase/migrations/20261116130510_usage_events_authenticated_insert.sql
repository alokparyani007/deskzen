-- Already applied in production (project qhsnirxaarcvxkwoafly) when the usage_events
-- table was created. This file records that change so the repo matches the database.
--
-- Signed-in browsers use the authenticated role. Without this grant and policy,
-- their inserts fail quietly and those counts never land.
-- Still insert-only: no select, update, or delete. Same row checks as anon.

grant insert (event, anon_session, path) on table public.usage_events to authenticated;
grant usage on sequence public.usage_events_id_seq to authenticated;

create policy "Authenticated inserts anonymous usage events"
  on public.usage_events
  for insert
  to authenticated
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
