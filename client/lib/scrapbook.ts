// Everything the scrapbook needs that isn't a screen: the built-in papers, scraps,
// fonts and ink colors, plus helpers for photo access and uploads.
import { Alert, Linking } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from './supabase'
import { fonts } from './theme'
import { ScrapbookFont, ScrapbookItem, ScrapbookTextItem } from '../../shared/types'

// Every page is 300 x 400 "page units"; the app scales this to fit the screen.
export const PAGE = { width: 300, height: 400 }

// The private Supabase Storage bucket photos go in (created by server/supabase/scrapbook.sql).
export const PHOTO_BUCKET = 'scrapbook'

// ---- Papers (page backgrounds) ----
// `ink` is the color used for the page's header line, so it stays readable on dark papers.
export const PAPERS: Record<string, { label: string; source: number; ink: string }> = {
  grid: { label: 'Grid', source: require('../assets/images/scrapbook/paper-grid.svg'), ink: '#16262E' },
  lined: { label: 'Lined', source: require('../assets/images/scrapbook/paper-lined.svg'), ink: '#16262E' },
  dots: { label: 'Dots', source: require('../assets/images/scrapbook/paper-dots.svg'), ink: '#16262E' },
  cream: { label: 'Cream', source: require('../assets/images/scrapbook/paper-cream.svg'), ink: '#16262E' },
  kraft: { label: 'Kraft', source: require('../assets/images/scrapbook/paper-kraft.svg'), ink: '#2B1D00' },
  green: { label: 'Whim green', source: require('../assets/images/scrapbook/paper-green.svg'), ink: '#F7F0E6' },
}
export const DEFAULT_PAPER = 'grid'

// ---- Scraps (built-in stickers) ----
// `aspect` is height / width of the artwork; `width` is its starting size in page units.
export const SCRAPS: Record<string, { label: string; source: number; aspect: number; width: number }> = {
  'tape-white': { label: 'Clear tape', source: require('../assets/images/scrapbook/scrap-tape-white.svg'), aspect: 36 / 160, width: 110 },
  'tape-stripe': { label: 'Striped tape', source: require('../assets/images/scrapbook/scrap-tape-stripe.svg'), aspect: 36 / 160, width: 110 },
  'tape-green': { label: 'Green tape', source: require('../assets/images/scrapbook/scrap-tape-green.svg'), aspect: 36 / 160, width: 110 },
  'torn-grid': { label: 'Torn paper', source: require('../assets/images/scrapbook/scrap-torn-grid.svg'), aspect: 110 / 140, width: 130 },
  stamp: { label: 'Stamp', source: require('../assets/images/scrapbook/scrap-stamp.svg'), aspect: 1, width: 80 },
  star: { label: 'Star', source: require('../assets/images/scrapbook/scrap-star.svg'), aspect: 1, width: 70 },
  burst: { label: 'Burst', source: require('../assets/images/scrapbook/scrap-burst.svg'), aspect: 1, width: 70 },
  arrow: { label: 'Arrow', source: require('../assets/images/scrapbook/scrap-arrow.svg'), aspect: 140 / 80, width: 34 },
  circle: { label: 'Circle', source: require('../assets/images/scrapbook/scrap-circle.svg'), aspect: 80 / 200, width: 140 },
  heart: { label: 'Heart', source: require('../assets/images/scrapbook/scrap-heart.svg'), aspect: 110 / 120, width: 60 },
  ticket: { label: 'Ticket', source: require('../assets/images/scrapbook/scrap-ticket.svg'), aspect: 80 / 160, width: 110 },
  clip: { label: 'Paperclip', source: require('../assets/images/scrapbook/scrap-clip.svg'), aspect: 110 / 40, width: 22 },
  smiley: { label: 'Smiley', source: require('../assets/images/scrapbook/scrap-smiley.svg'), aspect: 1, width: 56 },
}

// ---- Text styles ----
// Fonts are loaded in client/app/_layout.tsx. `lineHeight` is a multiple of the font size.
export const TEXT_FONTS: Record<ScrapbookFont, { label: string; family: string; lineHeight: number }> = {
  hand: { label: 'Handwritten', family: fonts.hand, lineHeight: 1.1 },
  mono: { label: 'Typewriter', family: fonts.mono, lineHeight: 1.3 },
  headline: { label: 'Bold', family: fonts.bold, lineHeight: 1.15 },
  serif: { label: 'Serif', family: fonts.serif, lineHeight: 1.15 },
}

// Pen colors for text.
export const INKS = ['#16262E', '#0B5F5C', '#F04400', '#2E5AAC', '#F7F0E6']

// A short random id for a new item on a page.
export function newItemId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

// A small random tilt, so things look stuck on by hand.
export function randomTilt(maxDegrees = 6) {
  return Math.round((Math.random() * 2 - 1) * maxDegrees)
}

// What a page looks like before anyone has edited it: grid paper with the event title.
export function defaultItems(title: string): ScrapbookItem[] {
  const titleItem: ScrapbookTextItem = {
    id: 'title',
    kind: 'text',
    text: title,
    font: 'hand',
    color: '#16262E',
    size: 24,
    label: false,
    x: 22,
    y: 38,
    w: 250,
    rotation: -2,
  }
  return [titleItem]
}

// "NOV '26" for the page's header line.
export function pageDateLabel(iso: string) {
  const date = new Date(iso)
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  return `${month} '${String(date.getFullYear()).slice(2)}`
}

// ---- Photo library access ----
// Asks for photo access the first time. Returns 'all', 'limited' (iOS/Android 14+ when the
// person picks "Limit Access"), or 'none'. If they said no before, offers a link to Settings,
// because the phone won't show the system prompt a second time.
export async function ensurePhotoAccess(): Promise<'all' | 'limited' | 'none'> {
  let permission = await ImagePicker.getMediaLibraryPermissionsAsync()
  if (!permission.granted && permission.canAskAgain) {
    permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  }

  if (permission.granted) {
    return permission.accessPrivileges === 'limited' ? 'limited' : 'all'
  }

  Alert.alert('Allow photo access', 'To add photos to your scrapbook, let Whim! use your photos in Settings.', [
    { text: 'Not now', style: 'cancel' },
    { text: 'Open Settings', onPress: () => Linking.openSettings() },
  ])
  return 'none'
}

// Uploads one picked photo to the user's folder in the scrapbook bucket.
// Returns its storage path, which is what gets saved on the page.
export async function uploadScrapbookPhoto(userId: string, asset: ImagePicker.ImagePickerAsset) {
  const contentType = asset.mimeType ?? 'image/jpeg'
  const extension = contentType === 'image/png' ? 'png' : 'jpg'
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`

  // Read the file from the phone as raw bytes, which is what Supabase Storage expects.
  const body = await (await fetch(asset.uri)).arrayBuffer()
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, body, { contentType })
  if (error) throw error
  return path
}

// Turns storage paths into temporary links the app can show (valid for an hour,
// since the bucket is private). Returns { path: url }.
export async function signedPhotoUrls(paths: string[]) {
  const urls: Record<string, string> = {}
  if (paths.length === 0) return urls
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 60 * 60)
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) urls[row.path] = row.signedUrl
  }
  return urls
}

// Every photo path on a list of pages, for signedPhotoUrls().
export function photoPaths(items: ScrapbookItem[]) {
  return items.flatMap((item) => (item.kind === 'photo' ? [item.path] : []))
}

// ---- Loading your pages ----
// One entry per activity you joined or hosted (newest first), with your saved page for it,
// or the default page if you haven't started one. Cancelled activities are left out.
export type ScrapbookEntry = {
  eventId: number
  title: string
  startsAt: string
  hosted: boolean
  paper: string
  items: ScrapbookItem[]
  started: boolean
}

export async function loadScrapbookEntries(userId: string, limit?: number): Promise<ScrapbookEntry[]> {
  // Events you joined...
  const { data: joinedRows } = await supabase.from('event_buddies').select('event_id').eq('profile_id', userId)
  const joinedIds: number[] = (joinedRows ?? []).map((row) => row.event_id)
  // ...plus events you hosted.
  const filter = joinedIds.length > 0 ? `profile_id.eq.${userId},id.in.(${joinedIds.join(',')})` : `profile_id.eq.${userId}`
  let query = supabase
    .from('events')
    .select('id, title, starts_at, profile_id, status')
    .or(filter)
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: false })
  if (limit) query = query.limit(limit)
  const { data: events } = await query

  const { data: pages } = await supabase.from('scrapbook_pages').select('event_id, paper, items').eq('profile_id', userId)
  const pageByEvent = new Map<number, { paper: string; items: ScrapbookItem[] }>((pages ?? []).map((page) => [page.event_id, page]))

  return (events ?? []).map((event) => {
    const page = pageByEvent.get(event.id)
    return {
      eventId: event.id,
      title: event.title,
      startsAt: event.starts_at,
      hosted: event.profile_id === userId,
      paper: page?.paper ?? DEFAULT_PAPER,
      items: page?.items ?? defaultItems(event.title),
      started: !!page,
    }
  })
}
