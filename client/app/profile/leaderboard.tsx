// Leaderboard: opened from the rank bubble on the You tab.
// Your rank and sidequest count on top, then the top 5 (yours highlighted). Shows sample rows
// until anyone is on the real leaderboard, same as the original profile page did.
import { ComponentRef, useCallback, useRef, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { BlurTargetView } from 'expo-blur'
import { useFocusEffect } from 'expo-router'
import { ProfileStats, SidequestLeaderboardRow } from '../../../shared/types'
import Frosted from '../../components/Frosted'
import GradientFill, { GradientFallback } from '../../components/GradientFill'
import ScreenHeader from '../../components/ScreenHeader'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { fonts, youColors } from '../../lib/theme'

// Same gradient as the You tab's bottom bubble.
const GRADIENT = {
  css: [
    'radial-gradient(70% 45% at 90% 0%, #A7BCCB, transparent 70%)',
    'radial-gradient(70% 45% at 0% 35%, #7FA66A, transparent 70%)',
    'radial-gradient(70% 45% at 100% 80%, #8FB07E, transparent 70%)',
    'radial-gradient(70% 40% at 10% 100%, #B4C8D6, transparent 70%)',
    'linear-gradient(180deg, #9DBA8C, #A3BE8E 55%, #B3C8C6)',
  ].join(', '),
  fallback: { colors: ['#9DBA8C', '#A3BE8E', '#B3C8C6'], locations: [0, 0.55, 1] } as GradientFallback,
}

// Sample rows shown until the real leaderboard has anyone on it.
const MOCK_LEADERBOARD: SidequestLeaderboardRow[] = [
  { profile_id: 'mock-1', username: 'milo', name: 'Milo', sidequests_went_on: 18, rank: 1 },
  { profile_id: 'mock-2', username: 'sasha', name: 'Sasha', sidequests_went_on: 15, rank: 2 },
  { profile_id: 'mock-3', username: 'nora', name: 'Nora', sidequests_went_on: 12, rank: 3 },
  { profile_id: 'mock-4', username: 'leo', name: 'Leo', sidequests_went_on: 9, rank: 4 },
  { profile_id: 'mock-5', username: 'you', name: 'You', sidequests_went_on: 7, rank: 5 },
]

export default function Leaderboard() {
  const { session } = useAuth()
  const userId = session?.user.id
  // The content the frosted card blurs on Android.
  const blurTarget = useRef<ComponentRef<typeof View>>(null)
  const [leaderboard, setLeaderboard] = useState<SidequestLeaderboardRow[]>([])
  const [yourRow, setYourRow] = useState<SidequestLeaderboardRow | null>(null)
  const [stats, setStats] = useState<ProfileStats | null>(null)

  // Fetches the top 5, your own row (you may be outside the top 5), and your counts as a fallback.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return
      supabase
        .from('sidequest_leaderboard')
        .select('*')
        .order('sidequests_went_on', { ascending: false })
        .limit(5)
        .then(({ data, error }) => setLeaderboard(error || !data?.length ? MOCK_LEADERBOARD : (data as SidequestLeaderboardRow[])))
      supabase
        .from('sidequest_leaderboard')
        .select('*')
        .eq('profile_id', userId)
        .maybeSingle()
        .then(({ data }) => setYourRow((data as SidequestLeaderboardRow | null) ?? null))
      supabase
        .from('profile_stats')
        .select('*')
        .eq('id', userId)
        .single()
        .then(({ data }) => setStats(data))
    }, [userId])
  )

  // Sidequests = activities attended + hosted; use your counts if you're not ranked yet.
  const sidequests = yourRow?.sidequests_went_on ?? (stats?.events_attended ?? 0) + (stats?.events_hosted ?? 0)

  return (
    <View style={styles.screen}>
      <BlurTargetView ref={blurTarget} style={styles.screen}>
        <GradientFill css={GRADIENT.css} fallback={GRADIENT.fallback} />
        <ScrollView contentContainerStyle={styles.content}>
          <ScreenHeader title="Leaderboard" />

          <Frosted radius={20} blurTarget={blurTarget} style={styles.card}>
            <View style={styles.yourRank}>
              <Text style={styles.yourRankLabel}>Your rank</Text>
              <Text style={styles.yourRankValue}>#{yourRow?.rank ?? '—'}</Text>
              <Text style={styles.yourRankCount}>{`${sidequests} sidequests`}</Text>
            </View>

            {leaderboard.map((entry) => {
              const isYou = entry.profile_id === userId
              const displayName = entry.username ? `@${entry.username}` : entry.name || 'Unknown user'
              return (
                <View
                  key={entry.profile_id}
                  style={[styles.row, isYou && styles.rowYou]}
                  accessible
                  accessibilityLabel={`Rank ${entry.rank}, ${isYou ? 'you' : displayName}, ${entry.sidequests_went_on} sidequests`}
                >
                  <Text style={styles.rank}>#{entry.rank}</Text>
                  <Text style={styles.name} numberOfLines={1}>
                    {isYou ? 'You' : displayName}
                  </Text>
                  <Text style={styles.count}>{entry.sidequests_went_on}</Text>
                </View>
              )
            })}
          </Frosted>
        </ScrollView>
      </BlurTargetView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: youColors.page },
  content: { paddingHorizontal: 18, paddingBottom: 40, gap: 22 },
  card: { padding: 16, gap: 8 },
  // Your rank, highlighted in green above the list.
  yourRank: {
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: youColors.ring,
    backgroundColor: '#F2FAF0',
  },
  yourRankLabel: { fontFamily: fonts.interRegular, fontSize: 12, color: youColors.secondary },
  yourRankValue: { fontFamily: fonts.interBold, fontSize: 22, color: youColors.ink },
  yourRankCount: { fontFamily: fonts.interRegular, fontSize: 13, color: youColors.ink },
  // One row of the top 5; yours gets the same green highlight.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  rowYou: { borderWidth: 1, borderColor: youColors.ring, backgroundColor: '#F2FAF0' },
  rank: { width: 32, fontFamily: fonts.spaceMonoBold, fontSize: 14, color: youColors.ink },
  name: { flex: 1, marginHorizontal: 8, fontFamily: fonts.interMedium, fontSize: 14, color: youColors.ink },
  count: { fontFamily: fonts.interBold, fontSize: 16, color: youColors.ink },
})
