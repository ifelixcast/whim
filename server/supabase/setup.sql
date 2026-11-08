-- Run in the Supabase SQL editor AFTER your tables exist.
-- Assumes: profiles, places, events, event_buddies, reviews,
-- with every "person" column named profile_id (profiles uses id).
-- If a policy with the same name already exists, drop it first or skip that line.

------------------------------------------------------------
-- 1. Create a profile row automatically when someone signs up
--    (profiles.id must reference auth.users.id, and the other
--    profiles columns must be nullable or have defaults)
------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

------------------------------------------------------------
-- 2. Hosted / attended counts (instead of storing them)
------------------------------------------------------------
create or replace view public.profile_stats
with (security_invoker = true) as
select
  p.id,
  (select count(*) from public.events e where e.profile_id = p.id) as events_hosted,
  (select count(*) from public.event_buddies b where b.profile_id = p.id) as events_attended
from public.profiles p;

------------------------------------------------------------
-- 3. Row Level Security policies (first pass)
--    Logged-in users can read everything; they can only
--    write rows that belong to them.
------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.places enable row level security;
alter table public.events enable row level security;
alter table public.event_buddies enable row level security;
alter table public.reviews enable row level security;

-- profiles
create policy "profiles readable by logged-in users" on public.profiles
  for select to authenticated using (true);
create policy "users update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id);

-- places
create policy "places readable by logged-in users" on public.places
  for select to authenticated using (true);
create policy "users add places as themselves" on public.places
  for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "users edit own places" on public.places
  for update to authenticated using ((select auth.uid()) = profile_id);
create policy "users delete own places" on public.places
  for delete to authenticated using ((select auth.uid()) = profile_id);

-- events
create policy "events readable by logged-in users" on public.events
  for select to authenticated using (true);
create policy "users host events as themselves" on public.events
  for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "hosts edit own events" on public.events
  for update to authenticated using ((select auth.uid()) = profile_id);
create policy "hosts delete own events" on public.events
  for delete to authenticated using ((select auth.uid()) = profile_id);

-- event_buddies
create policy "buddies readable by logged-in users" on public.event_buddies
  for select to authenticated using (true);
create policy "users join as themselves" on public.event_buddies
  for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "users leave events they joined" on public.event_buddies
  for delete to authenticated using ((select auth.uid()) = profile_id);

-- reviews
create policy "reviews readable by logged-in users" on public.reviews
  for select to authenticated using (true);
create policy "users review as themselves" on public.reviews
  for insert to authenticated with check ((select auth.uid()) = profile_id);
create policy "users edit own reviews" on public.reviews
  for update to authenticated using ((select auth.uid()) = profile_id);
create policy "users delete own reviews" on public.reviews
  for delete to authenticated using ((select auth.uid()) = profile_id);

-- TODO: once mobile/birthday move to a private table, give it
-- owner-only select/update policies.

------------------------------------------------------------
-- 4. Interests shown as the "Into" chips on the profile page
------------------------------------------------------------
alter table public.profiles add column if not exists interests text[] not null default '{}';

------------------------------------------------------------
-- 5. Leaderboard/ranking
------------------------------------------------------------
create or replace view public.sidequest_leaderboard
with (security_invoker = true) as 
select
  b.profile_id,
  count(*) as sidequests_attended
  row_number() over (
    order by count(*) desc, b.profile_id
  ) as rank
from public.event_buddies b
join public.events e on e.id = b.event_id
where e.status = "completed"
group by b.profile_id;
select 
  l.profile_id,
  l.rank,
  l.sidequests_went_on,
  p.username,
  p.name
from public.sidequest_leaderboard l
join public.profiles p on p.id = l.profile_id
order by l.rank
