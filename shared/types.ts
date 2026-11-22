// Row types matching the Supabase schema, shared by the app (client/) and any server code.
// If you rename a column in Supabase, update it here too.
// Keep this file free of React Native imports so server code can use it.

// The states an event can be in.
export type EventStatus = 'open' | 'full' | 'cancelled' | 'completed'

// Whether someone is in an event or left it (event_buddies.status).
// Only 'accepted' people count toward spots; see server/supabase/join_events.sql.
export type BuddyStatus = 'accepted' | 'left'

// One user's profile (the "profiles" table).
export type Profile = {
  id: string // uuid, same as auth.users.id
  username: string | null
  name: string | null
  birthday: string | null // 'YYYY-MM-DD'
  bio: string | null // up to 80 characters (Edit profile limits it)
  phone: string | null // see setup.sql section 6
  university_id: number | null
  interests: string[] | null // shown as the "Into" chips; see server/supabase/setup.sql section 4
  avatar_url: string | null // public URL of the photo in the "avatars" bucket; see setup.sql section 5
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
  max_participants: number | null // guests allowed, not counting the host
  status: EventStatus
  created_at: string
}

// Someone who joined an event (the "event_buddies" table).
export type EventBuddy = {
  id: number
  event_id: number
  profile_id: string
  status: BuddyStatus
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

// ---- Scrapbook (the "scrapbook_pages" table, see server/supabase/scrapbook.sql) ----
// Positions and sizes are in "page units": every page is 300 wide and 400 tall, and the
// app scales that to the phone's screen, so a page looks the same on every phone.

// Text styles on a page. The app maps each one to a font.
export type ScrapbookFont = 'hand' | 'mono' | 'headline' | 'serif'

// How a photo is framed.
export type ScrapbookFrame = 'print' | 'polaroid' | 'plain'

// Fields every item on a page has: top-left corner, width, and tilt in degrees.
type ScrapbookItemBase = {
  id: string
  x: number
  y: number
  w: number
  rotation: number
}

// A photo from the phone. `path` is where it lives in the "scrapbook" storage bucket;
// `aspect` is height divided by width.
export type ScrapbookPhotoItem = ScrapbookItemBase & {
  kind: 'photo'
  path: string
  aspect: number
  frame: ScrapbookFrame
}

// Typed text. `label` puts a strip of tape behind it.
export type ScrapbookTextItem = ScrapbookItemBase & {
  kind: 'text'
  text: string
  font: ScrapbookFont
  color: string
  size: number
  label: boolean
}

// A built-in sticker (tape, stamp, arrow...). `scrap` is its key in client/lib/scrapbook.ts.
export type ScrapbookScrapItem = ScrapbookItemBase & {
  kind: 'scrap'
  scrap: string
}

export type ScrapbookItem = ScrapbookPhotoItem | ScrapbookTextItem | ScrapbookScrapItem

// One person's page for one event. Items are drawn in array order, so the last is on top.
export type ScrapbookPage = {
  id: number
  profile_id: string
  event_id: number
  paper: string
  items: ScrapbookItem[]
  updated_at: string
}
