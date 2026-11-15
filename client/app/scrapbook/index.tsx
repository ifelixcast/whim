// Scrapbook: one page for every activity you joined or hosted, newest first.
// Each tile is a small preview of the page; tap it to open the editor.
import { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ScrapbookItem } from '../../../shared/types'
import PageCanvas from '../../components/scrapbook/PageCanvas'
import { DEFAULT_PAPER, defaultItems, pageDateLabel, photoPaths, signedPhotoUrls } from '../../lib/scrapbook'
import { fonts, profileColors, scrapbookColors } from '../../lib/theme'

// One tile: the activity plus its saved page, if you've started one.
type Entry = {
  eventId: number
  title: string
  startsAt: string
  hosted: boolean
  paper: string
  items: ScrapbookItem[]
  started: boolean
}

const GAP = 14
const SIDE = 16

export default function Scrapbook() {
  const { session } = useAuth()
  const userId = session?.user.id
  const { width } = useWindowDimensions()
  const tileWidth = (width - SIDE * 2 - GAP) / 2

  const [entries, setEntries] = useState<Entry[]>([])
  const [username, setUsername] = useState<string | null>(null)
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  // Finds every event you joined or hosted, and your pages for them.
  const load = useCallback(async () => {
    if (!userId) return

    const { data: me } = await supabase.from('profiles').select('username').eq('id', userId).single()
    setUsername(me?.username ?? null)

    // Events you joined...
    const { data: joinedRows } = await supabase.from('event_buddies').select('event_id').eq('profile_id', userId)
    const joinedIds: number[] = (joinedRows ?? []).map((row) => row.event_id)
    // ...plus events you hosted. Cancelled ones are left out.
    const filter = joinedIds.length > 0 ? `profile_id.eq.${userId},id.in.(${joinedIds.join(',')})` : `profile_id.eq.${userId}`
    const { data: events } = await supabase
      .from('events')
      .select('id, title, starts_at, profile_id, status')
      .or(filter)
      .neq('status', 'cancelled')
      .order('starts_at', { ascending: false })

    const { data: pages } = await supabase.from('scrapbook_pages').select('event_id, paper, items').eq('profile_id', userId)
    const pageByEvent = new Map<number, { paper: string; items: ScrapbookItem[] }>(
      (pages ?? []).map((page) => [page.event_id, page])
    )

    const list: Entry[] = (events ?? []).map((event) => {
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
    setEntries(list)
    setPhotoUrls(await signedPhotoUrls(list.flatMap((entry) => photoPaths(entry.items))))
    setLoading(false)
  }, [userId])

  // Reload when you come back from editing a page, so the previews update.
  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={scrapbookColors.selection} />
      </View>
    )
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={entries}
      keyExtractor={(entry) => String(entry.eventId)}
      numColumns={2}
      columnWrapperStyle={{ gap: GAP }}
      ListHeaderComponent={
        <Text style={styles.intro}>
          A page for every activity you've been to. Add photos, notes and scraps to remember it.
        </Text>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>Join an activity on Home and its page shows up here.</Text>
      }
      renderItem={({ item: entry }) => (
        <Pressable
          onPress={() => router.push({ pathname: '/scrapbook/[eventId]', params: { eventId: String(entry.eventId) } })}
          accessibilityRole="button"
          accessibilityLabel={`Open the page for ${entry.title}`}
          style={({ pressed }) => [styles.tile, { width: tileWidth }, pressed && styles.pressed]}
        >
          <View style={styles.pageShadow}>
            <PageCanvas
              paper={entry.paper}
              items={entry.items}
              width={tileWidth}
              header={[pageDateLabel(entry.startsAt), 'WHIM SCRAPBOOK', username ? `@${username}` : '@you']}
              photoUrls={photoUrls}
            />
          </View>
          <Text style={styles.tileTitle} numberOfLines={1}>
            {entry.title}
          </Text>
          <Text style={styles.tileMeta}>
            {entry.hosted ? 'You hosted' : 'You went'}
            {entry.started ? '' : ', page not started'}
          </Text>
        </Pressable>
      )}
    />
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: scrapbookColors.desk },
  content: { padding: SIDE, gap: GAP + 6 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: scrapbookColors.desk },
  intro: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: profileColors.slate, marginBottom: 4 },
  empty: { fontFamily: fonts.regular, fontSize: 15, color: profileColors.slate, textAlign: 'center', marginTop: 40 },
  // One page preview with its title underneath.
  tile: { gap: 4 },
  pageShadow: { borderRadius: 3, overflow: 'hidden', boxShadow: '0px 6px 14px -8px rgba(22, 38, 46, 0.6)', marginBottom: 4 },
  tileTitle: { fontFamily: fonts.semiBold, fontSize: 15, color: profileColors.ink },
  tileMeta: { fontFamily: fonts.regular, fontSize: 12, color: profileColors.slate },
  pressed: { opacity: 0.7 },
})
