// Tappable event-category chips, shared by the interest picker (Edit profile) and onboarding.
// Picked chips are solid cream; unpicked ones are see-through with a dashed outline.
// PickProgress is the row of bars that fills up as you reach the minimum number of picks.
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { CATEGORIES } from '../../shared/categories'
import { fonts, whimColors } from '../lib/theme'

type Props = {
  selected: string[]
  onChange: (next: string[]) => void
  // How many picks are asked for; read out by screen readers.
  min?: number
}

export default function InterestPicker({ selected, onChange, min = 3 }: Props) {
  // Adds the tag if it isn't picked yet, removes it if it is.
  function toggle(category: string) {
    onChange(selected.includes(category) ? selected.filter((c) => c !== category) : [...selected, category])
  }

  return (
    <View style={styles.chips}>
      {CATEGORIES.map((category) => {
        const on = selected.includes(category)
        return (
          <Pressable
            key={category}
            onPress={() => toggle(category)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityHint={`Pick at least ${min}`}
            style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
          >
            <Text style={styles.chipText}>{category}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

// One bar per required pick; filled bars show how many you've picked so far.
export function PickProgress({ count, min = 3 }: { count: number; min?: number }) {
  return (
    <View style={styles.progress} accessibilityLabel={`${Math.min(count, min)} of ${min} picked`}>
      {Array.from({ length: min }, (_, index) => (
        <View key={index} style={[styles.bar, index < count && styles.barOn]} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  chip: { height: 44, borderRadius: 22, paddingHorizontal: 18, borderWidth: 2, justifyContent: 'center' },
  chipOff: { backgroundColor: whimColors.glass, borderStyle: 'dashed', borderColor: whimColors.dashed },
  chipOn: {
    backgroundColor: whimColors.cream,
    borderColor: whimColors.cream,
    shadowColor: whimColors.ink,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  chipText: { fontFamily: fonts.interSemiBold, fontSize: 15, color: whimColors.ink },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  bar: { width: 28, height: 6, borderRadius: 3, backgroundColor: 'rgba(22,58,42,0.2)' },
  barOn: { backgroundColor: whimColors.ink },
})
