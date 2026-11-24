-- Contact form notes for DeskZen.
-- The public site inserts with the anon key and never reads rows back.
-- No photos, video, camera frames, or posture data.
-- The inbox address is not stored here. Mail is sent by the notify-contact edge function.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table public.contact_messages (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  message text not null,
  emailed_at timestamptz,
  constraint contact_messages_name_check check (char_length(btrim(name)) between 1 and 80),
  constraint contact_messages_email_check check (
    char_length(email) between 6 and 200
    and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$'
  ),
  constraint contact_messages_message_check check (char_length(btrim(message)) between 1 and 4000)
);

comment on table public.contact_messages is
  'Contact form notes so the founder can reply. Name, email, and message only. No photos or video.';

alter table public.contact_messages enable row level security;

revoke all on table public.contact_messages from public, anon, authenticated;
revoke all on sequence public.contact_messages_id_seq from public, anon, authenticated;

grant insert (name, email, message) on table public.contact_messages to anon;
grant usage on sequence public.contact_messages_id_seq to anon;
grant insert (name, email, message) on table public.contact_messages to authenticated;
grant usage on sequence public.contact_messages_id_seq to authenticated;

create policy "Anon inserts contact messages"
  on public.contact_messages
  for insert
  to anon
  with check (
    char_length(btrim(name)) between 1 and 80
    and char_length(email) between 6 and 200
    and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$'
    and char_length(btrim(message)) between 1 and 4000
  );

create policy "Authenticated inserts contact messages"
  on public.contact_messages
  for insert
  to authenticated
  with check (
    char_length(btrim(name)) between 1 and 80
    and char_length(email) between 6 and 200
    and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$'
    and char_length(btrim(message)) between 1 and 4000
  );

create index contact_messages_email_created_idx on public.contact_messages (lower(email), created_at desc);
create index contact_messages_created_at_idx on public.contact_messages (created_at desc);

-- Rate limit lives outside the exposed API. The trigger can count rows.
-- Callers still cannot select them.
create or replace function private.limit_contact_messages()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_email integer;
  recent_total integer;
begin
  select count(*) into recent_email
  from public.contact_messages
  where lower(email) = lower(new.email)
    and created_at > now() - interval '1 hour';

  if recent_email >= 3 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  select count(*) into recent_total
  from public.contact_messages
  where created_at > now() - interval '10 minutes';

  if recent_total >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function private.limit_contact_messages() from public;
grant execute on function private.limit_contact_messages() to anon, authenticated;

create trigger contact_messages_rate_limit
  before insert on public.contact_messages
  for each row
  execute function private.limit_contact_messages();
