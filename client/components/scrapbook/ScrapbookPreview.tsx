// Your newest scrapbook pages in one horizontal row, for the You tab.
// Each page is drawn with PageCanvas (read-only), straight, with its activity underneath;
// tap one to open it in the page editor. Reloads when the tab comes back into view.
import { useCallback, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, useFocusEffect } from 'expo-router'
import { useAuth } from '../../context/AuthContext'
import { loadScrapbookEntries, pageDateLabel, photoPaths, ScrapbookEntry, signedPhotoUrls } from '../../lib/scrapbook'
import { fonts, youColors } from '../../lib/theme'
import PageCanvas from './PageCanvas'

// How many pages to show here; "See all" opens the full Scrapbook.
const MAX_PAGES = 6
const PAGE_WIDTH = 140

export default function ScrapbookPreview({ username }: { username: string | null }) {
  const { session } = useAuth()
  const userId = session?.user.id
  // null until the first load finishes, so nothing flashes "empty" while loading.
  const [entries, setEntries] = useState<ScrapbookEntry[] | null>(null)
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})

  useFocusEffect(
    useCallback(() => {
      if (!userId) return
      loadScrapbookEntries(userId, MAX_PAGES).then(async (list) => {
        setEntries(list)
        setPhotoUrls(await signedPhotoUrls(list.flatMap((entry) => photoPaths(entry.items))))
      })
    }, [userId])
  )

  if (entries === null) return <View style={styles.loading} />

  if (entries.length === 0) {
    return <Text style={styles.empty}>Join an activity on Home and its page shows up here.</Text>
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.row} contentContainerStyle={styles.rowContent}>
      {entries.map((entry) => (
        <Pressable
          key={entry.eventId}
          onPress={() => router.push({ pathname: '/scrapbook/[eventId]', params: { eventId: String(entry.eventId) } })}
          accessibilityRole="button"
          accessibilityLabel={`Open the page for ${entry.title}`}
          style={({ pressed }) => [styles.item, pressed && styles.pressed]}
        >
          <View style={styles.pageShadow}>
            <View style={styles.pageClip}>
              <PageCanvas
                paper={entry.paper}
                items={entry.items}
                width={PAGE_WIDTH}
                header={[pageDateLabel(entry.startsAt), 'WHIM SCRAPBOOK', username ? `@${username}` : '@you']}
                photoUrls={photoUrls}
              />
            </View>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {entry.title}
          </Text>
          <Text style={styles.subtitle}>
            {entry.hosted ? 'You hosted' : 'You joined'}
            {entry.started ? '' : ', page not started'}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  // Bleeds to the bubble's edges so pages scroll off-screen; padding lines the first page up.
  row: { marginHorizontal: -16 },
  rowContent: { paddingHorizontal: 16, paddingVertical: 6, gap: 14 },
  item: { width: PAGE_WIDTH, gap: 2 },
  // Shadow on the outer view, rounded clip on the inner one, so the shadow isn't cut off.
  pageShadow: {
    marginBottom: 8,
    borderRadius: 6,
    backgroundColor: youColors.scrapPaper,
    shadowColor: '#1E321E',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  pageClip: { borderRadius: 6, overflow: 'hidden' },
  title: { fontFamily: fonts.interSemiBold, fontSize: 14, color: youColors.ink },
  subtitle: { fontFamily: fonts.interRegular, fontSize: 12, color: youColors.secondary },
  // Keeps the row's height while loading, so the page doesn't jump.
  loading: { height: (PAGE_WIDTH * 4) / 3 + 60 },
  empty: { fontFamily: fonts.interMedium, fontSize: 14, color: youColors.ink, paddingHorizontal: 4 },
  pressed: { opacity: 0.75 },
})
