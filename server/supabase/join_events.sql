
------------------------------------------------------------
-- 1. Link event_buddies to events, one row per person per event
------------------------------------------------------------
alter table public.event_buddies drop constraint if exists event_buddies_event_id_fkey;
alter table public.event_buddies
  add constraint event_buddies_event_id_fkey
  foreign key (event_id) references public.events (id) on update cascade on delete cascade;

alter table public.event_buddies drop constraint if exists request_buddies_profile_id_key;
alter table public.event_buddies drop constraint if exists event_buddies_event_profile_key;
alter table public.event_buddies
  add constraint event_buddies_event_profile_key unique (event_id, profile_id);

------------------------------------------------------------
-- 2. Track who's in vs. who left (existing rows become 'accepted')
------------------------------------------------------------
alter table public.event_buddies add column if not exists status text not null default 'accepted'
  check (status in ('accepted', 'left'));

------------------------------------------------------------
-- 3. Join and leave (called with supabase.rpc)
------------------------------------------------------------
-- supabase.rpc('join_event', { p_event_id }) returns 'accepted'.
-- max_participants counts guests, not the host.
create or replace function public.join_event(p_event_id bigint)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_event public.events;
  v_taken int;
begin
  -- Lock the event so two people can't take the last spot at once.
  select * into v_event from public.events where id = p_event_id for update;
  if not found or v_event.expires_at <= now() then
    raise exception 'This event is no longer open';
  end if;
  if v_event.profile_id = auth.uid() then
    raise exception 'You''re hosting this event';
  end if;

  select count(*) into v_taken from public.event_buddies
  where event_id = p_event_id and status = 'accepted';
  if v_event.max_participants is not null and v_taken >= v_event.max_participants then
    raise exception 'This event is full';
  end if;

  -- Insert, or rejoin if this person left earlier.
  insert into public.event_buddies (event_id, profile_id, status)
  values (p_event_id, auth.uid(), 'accepted')
  on conflict (event_id, profile_id) do update set status = 'accepted';

  if v_event.max_participants is not null and v_taken + 1 >= v_event.max_participants then
    update public.events set status = 'full' where id = p_event_id;
  end if;

  return 'accepted';
end;
$$;

-- supabase.rpc('leave_event', { p_event_id })
create or replace function public.leave_event(p_event_id bigint)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.event_buddies set status = 'left'
  where event_id = p_event_id and profile_id = auth.uid();

  -- A spot opened up.
  update public.events set status = 'open' where id = p_event_id and status = 'full';
end;
$$;

-- Remove the old direct insert/delete so everyone goes through the functions above.
drop policy if exists "users join as themselves" on public.event_buddies;
drop policy if exists "users leave events they joined" on public.event_buddies;

-- Make the API notice the changes right away.
notify pgrst, 'reload schema';
