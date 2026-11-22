-- New whim (create activity) screen: extra event details and photo storage.
-- Run this once in the Supabase SQL editor, after setup.sql and join_events.sql.

------------------------------------------------------------
-- 1. Event details picked on the create screen
------------------------------------------------------------
alter table public.events add column if not exists category text;
alter table public.events add column if not exists location_name text;
alter table public.events add column if not exists visibility text not null default 'nearby'
  check (visibility in ('nearby', 'school', 'friends'));
-- TODO: join_event() doesn't check this yet; everyone still joins instantly.
alter table public.events add column if not exists requires_approval boolean not null default true;
alter table public.events add column if not exists cover_url text;
alter table public.events add column if not exists backdrop text not null default 'meadow'
  check (backdrop in ('meadow', 'mist', 'paper', 'cocoa', 'photo'));
alter table public.events add column if not exists backdrop_url text;

------------------------------------------------------------
-- 2. Cover and backdrop photos: a public "event-photos" bucket.
--    Each user can only write inside a folder named after their own id.
------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('event-photos', 'event-photos', true)
on conflict (id) do nothing;

create policy "users upload own event photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'event-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users delete own event photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'event-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
