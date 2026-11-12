// Interests screen: shown once right after signing up. Pick the kinds of events you like
// (saved to profiles.interests, shown as the "Into" chips), or skip. Either way the app moves on.
import { useState } from 'react'
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'
import { CATEGORIES } from '../../shared/categories'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { brand, fonts } from '../lib/theme'

export default function SelectInterests() {
  const { session, refreshProfile } = useAuth()
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  // Adds the tag if it isn't picked yet, removes it if it is.
  function toggle(category: string) {
    setSelected((current) =>
      current.includes(category) ? current.filter((c) => c !== category) : [...current, category],
    )
  }

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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>What are you into?</Text>
        <Text style={styles.subtitle}>Pick a few so we can show you events you&apos;ll like.</Text>

        {/* One tappable chip per category; selected ones fill in. */}
        <View style={styles.chips}>
          {CATEGORIES.map((category) => {
            const on = selected.includes(category)
            return (
              <Pressable
                key={category}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => toggle(category)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{category}</Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed, busy && styles.pressed]}
          onPress={() => save(selected)}
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>{selected.length ? `Continue (${selected.length})` : 'Continue'}</Text>
        </Pressable>
        <Pressable onPress={() => save([])} disabled={busy} accessibilityRole="button" style={styles.skip}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.green },
  content: { paddingHorizontal: 32, paddingTop: 48, paddingBottom: 24 },
  title: { fontFamily: fonts.bold, fontSize: 34, color: brand.cream },
  subtitle: { marginTop: 8, fontFamily: fonts.regular, fontSize: 18, color: brand.cream, opacity: 0.9 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 28 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: brand.cream,
  },
  chipOn: { backgroundColor: brand.cream },
  chipText: { fontFamily: fonts.semiBold, fontSize: 18, color: brand.cream },
  chipTextOn: { color: brand.deepTeal },
  footer: { paddingHorizontal: 32, paddingBottom: 24 },
  button: {
    height: 50,
    borderRadius: 18,
    backgroundColor: brand.creamButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontFamily: fonts.bold, fontSize: 24, color: brand.deepTeal },
  skip: { marginTop: 14, alignSelf: 'center' },
  skipText: { fontFamily: fonts.semiBold, fontSize: 18, color: brand.cream },
  pressed: { opacity: 0.7 },
})
