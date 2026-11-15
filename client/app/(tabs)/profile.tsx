// "You" tab: your profile card (photo, name, interests), action buttons, and activity stats.
// Sizes and positions come from the Figma profile design.
import { useCallback, useState } from 'react'
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { router, useFocusEffect } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Profile, ProfileStats } from '../../../shared/types'
import { fonts, profileColors } from '../../lib/theme'

// Figma profile frame: content is laid out in a 376pt column, centered on wider screens.
const COLUMN_WIDTH = 376
// The stamp card is 350x222; avatar and text positions below are relative to it.
const CARD = { width: 350, height: 222 }
const AVATAR = { left: 35, top: 40, width: 129, height: 142 }
// The avatar image is 126.97% of the box width, shifted left 11.64% (Figma crop).
const AVATAR_IMAGE = { left: -15.02, width: 163.79 }
const TEXT_COLUMN = { left: 175, width: 144 }

export default function ProfileScreen() {
  // Logged-in user, safe-area sizes (notch / status bar), and the data shown on the page.
  const { session } = useAuth()
  const userId = session?.user.id
  const insets = useSafeAreaInsets()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<ProfileStats | null>(null)
  // Whether the small "..." menu (Sign out) is showing.
  const [menuOpen, setMenuOpen] = useState(false)

  // Fetches your profile and your hosted/attended counts.
  const load = useCallback(async () => {
    if (!userId) return

    // select('*') so this still works before the interests column exists (server/supabase/setup.sql section 4).
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) Alert.alert('Could not load profile', error.message)
    else setProfile(data)

    // Counts come from the profile_stats view (see server/supabase/setup.sql).
    const { data: statsRow } = await supabase.from('profile_stats').select('*').eq('id', userId).single()
    setStats(statsRow)
  }, [userId])

  // Reload every time this tab comes into view (e.g. after editing the profile).
  useFocusEffect(
    useCallback(() => {
      load()
    }, [load])
  )

  // "@name" for display, with a placeholder until a username is set.
  const username = profile?.username ? `@${profile.username}` : '@username'

  // Opens the phone's share sheet.
  async function share() {
    try {
      await Share.share({ message: `Find me on Whim! ${username}` })
    } catch {
      // Sharing isn't available on every platform (e.g. some desktop browsers).
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Green header; insets.top keeps it clear of the status bar / notch. */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.column}>
          {/* Profile card: star-bordered background with the photo and text laid on top. */}
          <View style={styles.card}>
            <Image source={require('../../assets/images/profile/star-card.png')} style={StyleSheet.absoluteFill} />

            {/* Photo, cropped to its box, with a thin black frame drawn over it. */}

            <View style={styles.avatar}>
              {/* TODO: replace with the user's photo once profiles have an avatar column. */}
              <Image
                source={require('../../assets/images/profile/avatar-placeholder.png')}
                style={{ position: 'absolute', top: 0, left: AVATAR_IMAGE.left, width: AVATAR_IMAGE.width, height: AVATAR.height }}
              />
            </View>
            <Image source={require('../../assets/images/profile/avatar-frame.svg')} style={styles.avatarFrame} />

            {/* Right side of the card: name, @username, and "Into" interest chips. */}
            <View style={styles.textColumn}>
              <Text style={styles.name} numberOfLines={1} adjustsFontSizeToFit>
                {profile?.name || 'Your name'}
              </Text>
              <Text style={styles.handle} numberOfLines={1}>
                {username}
              </Text>
              <Text style={styles.into}>Into</Text>
              <View style={styles.chips}>
                {/* Two chips fit the card; the rest are left out. */}
                {(profile?.interests ?? []).slice(0, 2).map((interest) => (
                  <View key={interest} style={styles.chip}>
                    <Text style={styles.chipText} numberOfLines={1}>
                      {interest}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Action row: Edit profile, Share, and the "..." menu. */}
          <View style={styles.actions}>
            <Pressable onPress={() => router.push('/edit-profile')} accessibilityRole="button" style={styles.editButton}>
              <Image source={require('../../assets/images/profile/edit-pill.svg')} style={StyleSheet.absoluteFill} />
              <Text style={styles.editText}>Edit profile</Text>
            </Pressable>
            <Pressable onPress={share} accessibilityRole="button" accessibilityLabel="Share profile" style={styles.roundButton}>
              <Image source={require('../../assets/images/profile/round-button.svg')} style={StyleSheet.absoluteFill} />
              <Image source={require('../../assets/images/profile/share-icon.svg')} style={styles.shareIcon} />
            </Pressable>
            <Pressable
              onPress={() => setMenuOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityLabel="More options"
              style={[styles.roundButton, styles.moreButton]}
            >
              <Image source={require('../../assets/images/profile/round-button.svg')} style={StyleSheet.absoluteFill} />
              <Text style={styles.moreText}>...</Text>
            </Pressable>
          </View>

          {/* Small pop-up under "..." with Sign out. */}
          {menuOpen ? (
            <View style={styles.menu}>
              <Pressable onPress={() => supabase.auth.signOut()} accessibilityRole="button">
                <Text style={styles.menuItem}>Sign out</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      {/* Stats row below the header. */}
      <View style={[styles.column, styles.stats]}>
        <Stat value={stats?.events_attended ?? 0} label="Activities" />
        <Stat value={stats?.events_hosted ?? 0} label="Hosted" />
        {/* TODO: no attendance data yet to compute "Shows up". */}
        <Stat value="—" label="Shows up" />
      </View>

      {/* Link to the Scrapbook: pages for every activity you've been to. */}
      <View style={[styles.column, styles.scrapbookWrap]}>
        <Pressable
          onPress={() => router.push('/scrapbook')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.scrapbookCard, pressed && { opacity: 0.7 }]}
        >
          <View style={styles.scrapbookText}>
            <Text style={styles.scrapbookTitle}>Scrapbook</Text>
            <Text style={styles.scrapbookSubtitle}>Photos, notes and scraps from your activities</Text>
          </View>
          <Text style={styles.scrapbookArrow}>›</Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

// One white stat card: a big number with a small label under it.
function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  // Page background, green header, and the 376pt centered column everything sits in.
  screen: { flex: 1, backgroundColor: profileColors.surface },
  header: { backgroundColor: profileColors.header, alignItems: 'center' },
  column: { width: '100%', maxWidth: COLUMN_WIDTH, alignSelf: 'center' },
  // Profile card and the photo inside it (positions are relative to the card).
  card: { width: CARD.width, height: CARD.height, marginTop: 34, marginLeft: 13 },
  avatar: {
    position: 'absolute',
    left: AVATAR.left,
    top: AVATAR.top,
    width: AVATAR.width,
    height: AVATAR.height,
    overflow: 'hidden',
  },
  avatarFrame: { position: 'absolute', left: 36, top: 41, width: 127, height: 140 },
  // Name, @username and "Into" text on the right of the card.
  textColumn: { position: 'absolute', left: TEXT_COLUMN.left, top: 50, width: TEXT_COLUMN.width, alignItems: 'center' },
  name: { fontFamily: fonts.monoBold, fontSize: 24, lineHeight: 31, color: profileColors.black, textAlign: 'center' },
  // Figma tops (card-relative): name 50, handle 81, "Into" 118, chips 145.
  handle: { fontFamily: fonts.mono, fontSize: 16, lineHeight: 21, marginBottom: 16, color: profileColors.handle, textAlign: 'center' },
  into: { fontFamily: fonts.monoBold, fontSize: 16, lineHeight: 21, marginBottom: 6, color: profileColors.black, textAlign: 'center' },
  // White rounded "Into" interest chips.
  chips: { flexDirection: 'row', gap: 10 },
  chip: {
    height: 36,
    maxWidth: 67,
    paddingHorizontal: 14.5,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: profileColors.border,
    backgroundColor: profileColors.card,
    justifyContent: 'center',
  },
  chipText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20.3, color: profileColors.ink },
  // Card ends at 256; the action row sits at 268 and the header ends at 338.
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginLeft: 20, marginBottom: 44 },
  // Edit profile pill, plus the round Share and "..." buttons.
  editButton: { width: 255, height: 26, alignItems: 'center', justifyContent: 'center' },
  editText: { fontFamily: fonts.monoBold, fontSize: 14, color: profileColors.black },
  roundButton: { width: 28, height: 26, marginLeft: 14, alignItems: 'center', justifyContent: 'center' },
  moreButton: { marginLeft: 11 },
  shareIcon: { width: 19, height: 19 },
  moreText: { fontFamily: fonts.interBold, fontSize: 16, lineHeight: 19, color: profileColors.black, marginTop: -4 },
  // The "..." pop-up menu, placed just under the action row.
  menu: {
    position: 'absolute',
    right: 20,
    top: 34 + CARD.height + 12 + 26 + 6,
    backgroundColor: profileColors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: profileColors.border,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  menuItem: { fontFamily: fonts.semiBold, fontSize: 15, color: profileColors.ink },
  // Stats sit 12pt below the header, 20pt side insets, 8pt gaps.
  stats: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 12 },
  // One white stat card with its number and label.
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2.6,
    paddingTop: 11.1,
    paddingBottom: 12.9,
    paddingHorizontal: 5.75,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: profileColors.border,
    backgroundColor: profileColors.card,
  },
  statValue: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 31.9, color: profileColors.ink, textAlign: 'center' },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17.4, color: profileColors.slate, textAlign: 'center' },
  // Scrapbook link card, same insets and card style as the stats.
  scrapbookWrap: { paddingHorizontal: 20, marginTop: 12 },
  scrapbookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: profileColors.border,
    backgroundColor: profileColors.card,
  },
  scrapbookText: { flex: 1 },
  scrapbookTitle: { fontFamily: fonts.bold, fontSize: 17, color: profileColors.ink },
  scrapbookSubtitle: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: profileColors.slate, marginTop: 2 },
  scrapbookArrow: { fontFamily: fonts.bold, fontSize: 24, color: profileColors.slate },
})
