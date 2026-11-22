// Interests screen: shown once right after signing up. Pick the kinds of events you like
// (saved to profiles.interests, shown as the "Into" chips), or skip. Either way the app moves on.
// Uses the same gradient and chips as the Edit profile interest picker.
import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import GradientBackground from '../components/GradientBackground'
import InterestPicker from '../components/InterestPicker'
import PrimaryButton from '../components/PrimaryButton'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { fonts, whimColors } from '../lib/theme'

export default function SelectInterests() {
  const { session, refreshProfile } = useAuth()
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  // Saves the picks (none when skipping) and marks onboarding done. Refreshing the flag makes
  // the layout switch to the tabs on its own.
  async function save(interests: string[]) {
    if (!session) return
    setBusy(true)
    const { error } = await supabase
      .from('profiles')
      .update({ interests, onboarding_completed: true })
      .eq('id', session.user.id)
    if (error) {
      setBusy(false)
      Alert.alert('Could not save', error.message)
      return
    }
    await refreshProfile()
  }

  return (
    <View style={styles.screen}>
      <GradientBackground variant="picker" />
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title} accessibilityRole="header">
            What are you into?
          </Text>
          <Text style={styles.subtitle}>Pick a few so we can show you events you&apos;ll like.</Text>

          {/* The same chips as the Edit profile interest picker. */}
          <InterestPicker selected={selected} onChange={setSelected} />
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            label={selected.length ? `Continue (${selected.length})` : 'Continue'}
            onPress={() => save(selected)}
            busy={busy}
          />
          <Pressable onPress={() => save([])} disabled={busy} accessibilityRole="button" style={styles.skip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 48, paddingBottom: 24 },
  title: {
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
  footer: { paddingHorizontal: 18, paddingBottom: 12 },
  skip: { marginTop: 14, height: 44, alignSelf: 'center', justifyContent: 'center' },
  skipText: { fontFamily: fonts.interBold, fontSize: 14, color: whimColors.ink, textDecorationLine: 'underline' },
})
