// Row types matching the Supabase schema, shared by the app (client/) and any server code.
// If you rename a column in Supabase, update it here too.
// Keep this file free of React Native imports so server code can use it.

// The states an event can be in.
export type EventStatus = 'open' | 'full' | 'cancelled' | 'completed'

// One user's profile (the "profiles" table).
export type Profile = {
  id: string // uuid, same as auth.users.id
  username: string | null
  name: string | null
  birthday: string | null // 'YYYY-MM-DD'
  bio: string | null
  university_id: number | null
  interests: string[] | null // shown as the "Into" chips; see server/supabase/setup.sql section 4
  onboarding_completed: boolean // false until they finish or skip the interests screen
  created_at: string
}

// Counts from the "profile_stats" view (computed by Supabase, not stored).
export type ProfileStats = {
  id: string
  events_hosted: number
  events_attended: number
}

// A saved location events can happen at (the "places" table).
export type Place = {
  id: number
  profile_id: string | null
  name: string
  address: string | null
  lat: number | null
  lng: number | null
  created_at: string
}

// An activity someone posted (the "events" table). profile_id is the host.
export type Event = {
  id: number
  profile_id: string
  place_id: number | null
  title: string
  description: string | null
  starts_at: string
  expires_at: string
  lat: number | null
  lng: number | null
  max_participants: number | null
  status: EventStatus
  created_at: string
}

// Someone who joined an event (the "event_buddies" table).
export type EventBuddy = {
  id: number
  event_id: number
  profile_id: string
  joined_at: string
}

// Ranked sidequest counts derived from the event_buddies table.
export type SidequestLeaderboardRow = {
  profile_id: string
  username: string | null
  name: string | null
  sidequests_went_on: number
  rank: number
}
