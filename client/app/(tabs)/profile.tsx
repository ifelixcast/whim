// "You" tab: two gradient "bubbles" that scroll together.
// Top bubble: your ID card (photo, name, @username, bio) and the Edit profile / Share / More buttons.
// Bottom bubble: a frosted stats strip (rank, activities, hosted, shows up), your interests,
// the events you've joined, and a row of your newest Scrapbook pages (the Scrapbook itself is a teammate's feature).
import { ComponentRef, useCallback, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { BlurTargetView } from 'expo-blur'
import { Image } from 'expo-image'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Profile, ProfileStats } from '../../../shared/types'
import Frosted from '../../components/Frosted'
import ScrapbookPreview from '../../components/scrapbook/ScrapbookPreview'
import GradientFill, { GradientFallback } from '../../components/GradientFill'
import StarBorder from '../../components/StarBorder'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { fonts, whimColors, youColors } from '../../lib/theme'

// Bubble gradients: soft color blobs (radial) over a vertical base (linear).
const TOP_GRADIENT = {
  css: [
    'radial-gradient(70% 60% at 10% 0%, #B4C8D6, transparent 70%)',
    'radial-gradient(60% 55% at 95% 20%, #7FA66A, transparent 70%)',
    'radial-gradient(70% 60% at 0% 80%, #4A8640, transparent 70%)',
    'radial-gradient(60% 50% at 95% 95%, #A7BCCB, transparent 70%)',
    'linear-gradient(180deg, #A9C0CE, #7EA46E 50%, #5A9148)',
  ].join(', '),
  fallback: { colors: ['#A9C0CE', '#7EA46E', '#5A9148'], locations: [0, 0.5, 1] } as GradientFallback,
}
const BOTTOM_GRADIENT = {
  css: [
    'radial-gradient(70% 45% at 90% 0%, #A7BCCB, transparent 70%)',
    'radial-gradient(70% 45% at 0% 35%, #7FA66A, transparent 70%)',
    'radial-gradient(70% 45% at 100% 80%, #8FB07E, transparent 70%)',
    'radial-gradient(70% 40% at 10% 100%, #B4C8D6, transparent 70%)',
    'linear-gradient(180deg, #9DBA8C, #A3BE8E 55%, #B3C8C6)',
  ].join(', '),
  fallback: { colors: ['#9DBA8C', '#A3BE8E', '#B3C8C6'], locations: [0, 0.55, 1] } as GradientFallback,
}

// An event you joined, with its host's name, as loaded for the "Joined" list.
type JoinedEvent = {
  event_id: number
  events: {
    title: string
    expires_at: string
    profiles: { name: string | null; username: string | null } | null
  } | null
}

// "Expires in 12 min" while it's open, "Ended" after.
function timeLabel(expiresAt: string) {
  const minutes = Math.round((new Date(expiresAt).getTime() - Date.now()) / 60000)
  return minutes > 0 ? `Expires in ${minutes} min` : 'Ended'
}

export default function ProfileScreen() {
  // Logged-in user, safe-area sizes (notch / home indicator), and the data shown on the page.
  const { session } = useAuth()
  const userId = session?.user.id
  const insets = useSafeAreaInsets()
  // The content the frosted cards blur on Android.
  const blurTarget = useRef<ComponentRef<typeof View>>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<ProfileStats | null>(null)
  const [rank, setRank] = useState<number | null>(null)
  const [joined, setJoined] = useState<JoinedEvent[]>([])
  // Whether the small "..." menu (Sign out) is showing.
  const [menuOpen, setMenuOpen] = useState(false)

  // Fetches your profile, your hosted/attended counts, and your leaderboard rank.
  const load = useCallback(async () => {
    if (!userId) return

    // select('*') so this still works before newer columns exist (server/supabase/setup.sql).
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) Alert.alert('Could not load profile', error.message)
    else setProfile(data)

    // Counts come from the profile_stats view (see server/supabase/setup.sql).
    const { data: statsRow } = await supabase.from('profile_stats').select('*').eq('id', userId).single()
    setStats(statsRow)

    // Your row in the sidequest leaderboard; there's none until you've been to or hosted something.
    const { data: rankRow } = await supabase
      .from('sidequest_leaderboard')
      .select('rank')
      .eq('profile_id', userId)
      .maybeSingle()
    setRank(rankRow?.rank ?? null)

    // Events you're currently in (not ones you left), most recently joined first.
    const { data: joinedRows } = await supabase
      .from('event_buddies')
      .select('event_id, events(title, expires_at, profiles(name, username))')
      .eq('profile_id', userId)
      .eq('status', 'accepted')
      .order('joined_at', { ascending: false })
    setJoined((joinedRows ?? []) as unknown as JoinedEvent[])

  }, [userId])

  // Reload every time this tab comes into view (e.g. after editing the profile or interests).
  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  const username = profile?.username ? `@${profile.username}` : '@username'
  const interests = profile?.interests ?? []

  // Opens the phone's share sheet.
  async function share() {
    try {
      await Share.share({ message: `Find me on Whim! ${username}` })
    } catch {
      // Sharing isn't available on every platform (e.g. some desktop browsers).
    }
  }

  return (
    <View style={styles.screen}>
      <BlurTargetView ref={blurTarget} style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* A) Top bubble: ID card and action buttons. */}
          <View style={[styles.topBubble, { paddingTop: insets.top + 48 }]}>
            <GradientFill css={TOP_GRADIENT.css} fallback={TOP_GRADIENT.fallback} style={styles.topBubbleShape} />

            <View style={styles.idCard}>
              <StarBorder color={youColors.stars} />
              <View style={styles.photo}>
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : null}
              </View>
              <View style={styles.idText}>
                <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
                  {profile?.name || 'Your name'}
                </Text>
                <Text style={styles.handle} numberOfLines={1}>
                  {username}
                </Text>
                {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={() => router.push('/profile/edit')}
                accessibilityRole="button"
                style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
              >
                <Text style={styles.editText}>Edit profile</Text>
              </Pressable>
              <Pressable onPress={share} accessibilityRole="button" accessibilityLabel="Share profile">
                <Frosted radius={23} blurTarget={blurTarget} style={styles.roundButton}>
                  <Image source={require('../../assets/images/profile/share-icon.svg')} tintColor={youColors.ink} style={styles.icon} />
                </Frosted>
              </Pressable>
              <Pressable
                onPress={() => setMenuOpen((open) => !open)}
                accessibilityRole="button"
                accessibilityLabel="More options"
                accessibilityState={{ expanded: menuOpen }}
              >
                <Frosted radius={23} blurTarget={blurTarget} style={styles.roundButton}>
                  <Image source={require('../../assets/images/icons/ellipsis.svg')} style={styles.icon} />
                </Frosted>
              </Pressable>
            </View>

            {/* Small pop-up under "..." with Sign out. */}
            {menuOpen ? (
              <View style={styles.menu}>
                <Pressable onPress={() => supabase.auth.signOut()} accessibilityRole="button" style={styles.menuItem}>
                  <Text style={styles.menuText}>Sign out</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* B) 10pt of page background between the bubbles, then C) the bottom bubble. */}
          <View style={[styles.bottomBubble, { paddingBottom: 120 + insets.bottom }]}>
            <GradientFill css={BOTTOM_GRADIENT.css} fallback={BOTTOM_GRADIENT.fallback} style={styles.bottomBubbleShape} />

            {/* 1. Stats strip: rank bubble (opens the leaderboard) and three counts. */}
            <Frosted radius={26} blurTarget={blurTarget} style={styles.stats}>
              <Pressable
                onPress={() => router.push('/profile/leaderboard')}
                accessibilityRole="button"
                accessibilityLabel={`Your rank is ${rank ?? 'not set yet'}. Open leaderboard`}
                style={({ pressed }) => [styles.rankRing, pressed && styles.pressed]}
              >
                <View style={styles.rankBubble}>
                  <Text style={styles.rankValue}>{rank ? `#${rank}` : '–'}</Text>
                  <Text style={styles.rankLabel}>RANK</Text>
                </View>
              </Pressable>
              <Stat value={stats?.events_attended ?? 0} label="Activities" />
              <Divider />
              <Stat value={stats?.events_hosted ?? 0} label="Hosted" />
              <Divider />
              {/* TODO: no attendance history yet to compute "Shows up", so everyone is "New". */}
              <Stat value="New" label="Shows up" />
            </Frosted>

            {/* 2. Interests, on one scrollable line. */}
            <Frosted radius={20} blurTarget={blurTarget} style={styles.into}>
              <View style={styles.sectionHeader}>
                <Text style={styles.monoLabel} accessibilityRole="header">
                  Into
                </Text>
                <Pressable
                  onPress={() => router.push('/profile/interests')}
                  accessibilityRole="button"
                  accessibilityLabel="Edit interests"
                  hitSlop={12}
                >
                  <Text style={styles.linkText}>Edit</Text>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {interests.length === 0 ? (
                  <Text style={styles.chip}>Pick what you’re into</Text>
                ) : (
                  interests.map((interest) => (
                    <Text key={interest} style={styles.chip}>
                      {interest}
                    </Text>
                  ))
                )}
              </ScrollView>
            </Frosted>

            {/* Events you're in right now. */}
            <Frosted radius={20} blurTarget={blurTarget} style={styles.joined}>
              <Text style={styles.monoLabel} accessibilityRole="header">
                Joined
              </Text>
              {joined.length === 0 ? (
                <Text style={styles.joinedMeta}>You haven&apos;t joined anything yet.</Text>
              ) : (
                joined.map((row) => (
                  <View key={row.event_id} style={styles.joinedRow}>
                    <Text style={styles.joinedTitle} numberOfLines={1}>
                      {row.events?.title ?? 'Event'}
                    </Text>
                    <Text style={styles.joinedMeta} numberOfLines={1}>
                      Hosted by {row.events?.profiles?.name || row.events?.profiles?.username || 'Someone'}
                      {row.events ? ` · ${timeLabel(row.events.expires_at)}` : ''}
                    </Text>
                  </View>
                ))
              )}
            </Frosted>

            {/* 3. Scrapbook slot. */}
            <View style={styles.scrapbook}>
              <View style={[styles.sectionHeader, styles.scrapbookHeader]}>
                <Text style={styles.monoLabel} accessibilityRole="header">
                  Scrapbook
                </Text>
                <Pressable onPress={() => router.push('/scrapbook')} accessibilityRole="link" hitSlop={12}>
                  <Text style={styles.linkText}>See all ›</Text>
                </Pressable>
              </View>
              {/* Your newest pages, straight, newest first. */}
              <ScrapbookPreview username={profile?.username ?? null} />
            </View>
          </View>
        </ScrollView>
      </BlurTargetView>
    </View>
  )
}

// One count in the stats strip: a big number with a small label under it.
function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

// Thin line between two stats; hidden from screen readers.
function Divider() {
  return <View style={styles.divider} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: youColors.page },
  // flexGrow lets the bottom bubble stretch to the bottom of the screen on short pages.
  scrollContent: { flexGrow: 1 },
  pressed: { opacity: 0.75 },

  // A) Top bubble
  // zIndex keeps the "..." pop-up above the bottom bubble.
  topBubble: { paddingHorizontal: 14, paddingBottom: 18, gap: 16, zIndex: 1 },
  topBubbleShape: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  idCard: {
    backgroundColor: youColors.cardCream,
    borderRadius: 26,
    paddingVertical: 40,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    shadowColor: whimColors.ink,
    shadowOpacity: 0.18,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  photo: {
    width: 104,
    height: 126,
    borderWidth: 3,
    borderColor: youColors.photoBorder,
    backgroundColor: whimColors.photoPlaceholder,
    overflow: 'hidden',
  },
  // Text column, centered like the original profile card.
  idText: { flex: 1, gap: 6, alignItems: 'center' },
  name: { fontFamily: fonts.spaceMonoBold, fontSize: 26, color: youColors.ink, textAlign: 'center' },
  handle: { fontFamily: fonts.spaceMono, fontSize: 13, color: youColors.handle, textAlign: 'center' },
  bio: { fontFamily: fonts.interRegular, fontSize: 13, lineHeight: 18, color: youColors.bio, marginTop: 4, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  editButton: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: whimColors.brown,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: whimColors.brown,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  editText: { fontFamily: fonts.spaceMonoBold, fontSize: 15, color: whimColors.brownText },
  roundButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  icon: { width: 20, height: 20 },
  // The "..." pop-up, just under the round buttons.
  menu: {
    position: 'absolute',
    right: 14,
    bottom: -40,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: youColors.ink,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  menuItem: { height: 44, justifyContent: 'center' },
  menuText: { fontFamily: fonts.interSemiBold, fontSize: 15, color: youColors.ink },

  // C) Bottom bubble (marginTop is the 10pt gap of page background).
  bottomBubble: { flexGrow: 1, marginTop: 10, padding: 16, gap: 14 },
  bottomBubbleShape: { borderTopLeftRadius: 32, borderTopRightRadius: 32 },

  // 1. Stats strip
  stats: {
    padding: 12,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#1E321E',
    shadowOpacity: 0.16,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
  // Rank bubble: 2pt green ring outside a 3pt cream ring around the brown circle.
  rankRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: youColors.ring },
  rankBubble: {
    flex: 1,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: whimColors.cream,
    backgroundColor: whimColors.brown,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankValue: { fontFamily: fonts.interBold, fontSize: 24, color: whimColors.brownText },
  rankLabel: { fontFamily: fonts.spaceMonoBold, fontSize: 9, letterSpacing: 0.9, color: whimColors.brownSecondary },
  stat: { flex: 1, alignItems: 'center', gap: 6 },
  statValue: { fontFamily: fonts.interBold, fontSize: 24, color: youColors.ink },
  statLabel: {
    fontFamily: fonts.spaceMonoBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: youColors.secondary,
  },
  divider: { width: 1, alignSelf: 'stretch', marginVertical: 10, backgroundColor: youColors.statDivider },

  // 2. Into box and 3. Scrapbook headers
  into: { paddingTop: 14, paddingBottom: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  monoLabel: {
    fontFamily: fonts.spaceMonoBold,
    fontSize: 13,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: youColors.ink,
  },
  linkText: { fontFamily: fonts.interBold, fontSize: 14, color: youColors.ink },
  chips: { paddingHorizontal: 16, gap: 6 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: youColors.page,
    fontFamily: fonts.interMedium,
    fontSize: 14,
    color: youColors.ink,
  },

  // "Joined" list: one light row per event you're in.
  joined: { padding: 16, gap: 8 },
  joinedRow: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.7)' },
  joinedTitle: { fontFamily: fonts.interSemiBold, fontSize: 15, color: youColors.ink },
  joinedMeta: { fontFamily: fonts.interRegular, fontSize: 13, color: youColors.secondary, marginTop: 2 },

  // 3. Scrapbook slot (no box of its own)
  scrapbook: { gap: 12 },
  scrapbookHeader: { paddingHorizontal: 4 },
})
