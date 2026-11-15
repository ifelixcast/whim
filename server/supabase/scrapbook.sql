-- Scrapbook: one page per person per event they attended, plus a private photo bucket.
-- Run in the Supabase SQL editor after setup.sql. Safe to run once; if you run it again,
-- drop the policies first (or skip those lines).

------------------------------------------------------------
-- 1. The pages. Everything placed on a page (photos, text, scraps)
--    is stored together in `items` as JSON, so saving is one upsert.
--    event_id must match the type of events.id (bigint if events.id is int8).
------------------------------------------------------------
create table if not exists public.scrapbook_pages (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  event_id bigint not null references public.events (id) on delete cascade,
  paper text not null default 'grid',
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (profile_id, event_id)
);

alter table public.scrapbook_pages enable row level security;

-- Pages are private: only the owner can see or change them.
create policy "users read own scrapbook pages" on public.scrapbook_pages
  for select to authenticated using ((select auth.uid()) = profile_id);

-- You can only start a page for an event you joined or hosted.
create policy "users add pages for events they attended" on public.scrapbook_pages
  for insert to authenticated with check (
    (select auth.uid()) = profile_id
    and (
      exists (
        select 1 from public.event_buddies b
        where b.event_id = scrapbook_pages.event_id and b.profile_id = (select auth.uid())
      )
      or exists (
        select 1 from public.events e
        where e.id = scrapbook_pages.event_id and e.profile_id = (select auth.uid())
      )
    )
  );

create policy "users edit own scrapbook pages" on public.scrapbook_pages
  for update to authenticated using ((select auth.uid()) = profile_id);

create policy "users delete own scrapbook pages" on public.scrapbook_pages
  for delete to authenticated using ((select auth.uid()) = profile_id);

------------------------------------------------------------
-- 2. Photo storage. A private bucket; each person's photos go in a
--    folder named after their user id (e.g. 4f1c.../1731400000-ab12.jpg).
------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scrapbook', 'scrapbook', false, 10485760, array['image/jpeg', 'image/png', 'image/heic', 'image/webp'])
on conflict (id) do nothing;

create policy "users read own scrapbook photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'scrapbook' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users upload own scrapbook photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'scrapbook' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users delete own scrapbook photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'scrapbook' and (storage.foldername(name))[1] = (select auth.uid())::text);
