// Interest picker: opened from the "Event interests" box on Edit profile.
// Starts with your saved picks; saving needs at least three and writes them to profiles.interests.
import { ComponentRef, useEffect, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { BlurTargetView } from 'expo-blur'
import { router } from 'expo-router'
import BottomBar from '../../components/BottomBar'
import GradientBackground from '../../components/GradientBackground'
import InterestPicker, { PickProgress } from '../../components/InterestPicker'
import PrimaryButton from '../../components/PrimaryButton'
import ScreenHeader from '../../components/ScreenHeader'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { fonts, whimColors } from '../../lib/theme'

const MIN_PICKS = 3

export default function Interests() {
  const { session } = useAuth()
  const userId = session?.user.id
  // The content the bottom bar blurs on Android.
  const blurTarget = useRef<ComponentRef<typeof View>>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  // Start from what's saved now.
  useEffect(() => {
    if (!userId) return
    supabase
      .from('profiles')
      .select('interests')
      .eq('id', userId)
      .single()
      .then(({ data }) => setSelected(data?.interests ?? []))
  }, [userId])

  // Replaces your saved interests with these picks, then returns to Edit profile.
  async function save() {
    if (!userId) return
    setBusy(true)
    const { error } = await supabase.from('profiles').update({ interests: selected }).eq('id', userId)
    setBusy(false)
    if (error) Alert.alert('Could not save interests', error.message)
    else router.back()
  }

  const remaining = MIN_PICKS - selected.length

  return (
    <View style={styles.screen}>
      <BlurTargetView ref={blurTarget} style={styles.screen}>
        <GradientBackground variant="picker" />
        <ScrollView contentContainerStyle={styles.content}>
          <ScreenHeader
            right={
              <Pressable onPress={() => setSelected([])} accessibilityRole="button" hitSlop={10}>
                <Text style={styles.clear}>Clear all</Text>
              </Pressable>
            }
          />
          <Text style={styles.title} accessibilityRole="header">
            What would you go on a Whim for?
          </Text>
          <Text style={styles.subtitle}>Pick at least three. You’ll see these first.</Text>
          <InterestPicker selected={selected} onChange={setSelected} min={MIN_PICKS} />
        </ScrollView>
      </BlurTargetView>

      <BottomBar blurTarget={blurTarget} gap={10}>
        <PickProgress count={selected.length} min={MIN_PICKS} />
        {remaining <= 0 ? (
          <PrimaryButton label={`Save ${selected.length} interests`} onPress={save} busy={busy} />
        ) : (
          // Not enough picks yet: a dashed placeholder that says how many more are needed.
          <View style={styles.waiting} accessibilityRole="button" accessibilityState={{ disabled: true }}>
            <Text style={styles.waitingText}>{`Pick ${remaining} more`}</Text>
          </View>
        )}
      </BottomBar>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // Bottom padding keeps the last chips clear of the bottom bar.
  content: { paddingHorizontal: 18, paddingBottom: 140 },
  clear: { fontFamily: fonts.interBold, fontSize: 14, color: whimColors.ink, textDecorationLine: 'underline' },
  title: {
    marginTop: 18,
    maxWidth: 320,
    alignSelf: 'center',
    textAlign: 'center',
    fontFamily: fonts.fraunces,
    fontSize: 36,
    lineHeight: 39,
    color: whimColors.ink,
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 22,
    textAlign: 'center',
    fontFamily: fonts.interRegular,
    fontSize: 15,
    color: whimColors.body,
  },
  waiting: {
    height: 56,
    borderRadius: 28,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(22,58,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: { fontFamily: fonts.interBold, fontSize: 17, color: whimColors.ink },
})
