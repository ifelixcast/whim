// Home tab: lists open events that haven't expired yet, and lets you join them.
import { useCallback, useState } from 'react'
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { BuddyStatus, Event } from '../../../shared/types'
import { colors, space } from '../../lib/theme'

// An event as the feed loads it: with the host's name and everyone's join status attached.
type FeedEvent = Event & {
  profiles: { name: string | null; username: string | null } | null
  event_buddies: { status: BuddyStatus }[]
}

// "3 spots left", "1 spot left", "Full", or "2 going" when there's no limit.
function spotsLabel(event: FeedEvent) {
  const going = event.event_buddies.filter((b) => b.status === 'accepted').length
  if (event.max_participants == null) return `${going} going`
  const left = event.max_participants - going
  if (left <= 0) return 'Full'
  return left === 1 ? '1 spot left' : `${left} spots left`
}

// How many whole minutes until an event expires (never negative).
function minutesLeft(expiresAt: string) {
  return Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000))
}

export default function Feed() {
  // Who's logged in, the events on screen, and whether the list is reloading.
  const { session } = useAuth()
  const userId = session?.user.id
  const [events, setEvents] = useState<FeedEvent[]>([])
  // Where the current user stands with each event (event id -> status), so we can show "You're in".
  const [myStatus, setMyStatus] = useState<Map<number, BuddyStatus>>(new Map())
  const [refreshing, setRefreshing] = useState(false)

  // Fetches the open events and which of them you've joined.
  const load = useCallback(async () => {
    setRefreshing(true)

    // Open or full events that haven't expired yet, soonest to expire first,
    // with the host's name and the join list (for counting spots).
    // TODO: filter by distance once events have lat/lng (radius feature).
    const { data, error } = await supabase
      .from('events')
      .select('*, profiles(name, username), event_buddies(status)')
      .in('status', ['open', 'full'])
      .gt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true })

    if (error) Alert.alert('Could not load events', error.message)
    else setEvents((data ?? []) as FeedEvent[])

    // Which of these has the current user joined?
    if (userId) {
      const { data: mine } = await supabase
        .from('event_buddies')
        .select('event_id, status')
        .eq('profile_id', userId)
        .eq('status', 'accepted')
      setMyStatus(new Map((mine ?? []).map((row) => [row.event_id, row.status])))
    }

    setRefreshing(false)
  }, [userId])

  // Reload every time this tab comes into view (e.g. after posting an event).
  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  // Joins the event.
  // The server checks capacity (see join_event in server/supabase/join_events.sql).
  async function join(eventId: number) {
    if (!userId) return
    const { data, error } = await supabase.rpc('join_event', { p_event_id: eventId })
    if (error) return Alert.alert('Could not join', error.message)
    setMyStatus((prev) => new Map(prev).set(eventId, data as BuddyStatus))
    load() // refresh the spot counts
  }

  // One event card. The button depends on whether you host it, joined, or it's full.
  function renderItem({ item }: { item: FeedEvent }) {
    const isHost = item.profile_id === userId
    const status = myStatus.get(item.id)
    const hostName = item.profiles?.name || item.profiles?.username || 'Someone'

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.host}>Hosted by {isHost ? 'you' : hostName}</Text>
        {item.description ? <Text style={styles.cardBody}>{item.description}</Text> : null}
        <Text style={styles.meta}>
          Expires in {minutesLeft(item.expires_at)} min · {spotsLabel(item)}
        </Text>

        {isHost ? null : status === 'accepted' ? (
          <Text style={styles.joined}>You're in</Text>
        ) : item.status === 'full' ? (
          <Text style={styles.meta}>Full</Text>
        ) : (
          <Pressable style={styles.button} onPress={() => join(item.id)}>
            <Text style={styles.buttonText}>Join</Text>
          </Pressable>
        )}
      </View>
    )
  }

  // Scrollable list of event cards; pull down to refresh, with a message when it's empty.
  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={{ padding: space.md }}
      data={events}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      ListEmptyComponent={
        refreshing ? undefined : <Text style={styles.empty}>Nothing happening nearby yet. Start one with the + button.</Text>
      }
    />
  )
}

const styles = StyleSheet.create({
  // Screen background and the white event cards.
  list: { flex: 1, backgroundColor: colors.background },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
    marginBottom: space.md,
  },
  // Text inside a card: title, description, and grey details like the expiry time.
  cardTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  host: { fontSize: 14, color: colors.muted, marginTop: 2 },
  cardBody: { fontSize: 15, color: colors.text, marginTop: space.xs },
  meta: { fontSize: 14, color: colors.muted, marginTop: space.sm },
  // "You're in" label and the Join button.
  joined: { fontSize: 15, color: colors.primary, fontWeight: '600', marginTop: space.sm },
  button: { backgroundColor: colors.primary, borderRadius: 8, padding: space.sm, alignItems: 'center', marginTop: space.sm },
  buttonText: { color: '#fff', fontWeight: '600' },
  // Message shown when there are no events.
  empty: { textAlign: 'center', color: colors.muted, marginTop: space.lg },
})
