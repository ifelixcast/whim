// Full-width dark green pill used for the main action in the bottom bar ("Save changes").
import { Pressable, StyleSheet, Text } from 'react-native'
import { fonts, whimColors } from '../lib/theme'

type Props = {
  label: string
  onPress: () => void
  busy?: boolean
}

export default function PrimaryButton({ label, onPress, busy }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityState={{ busy }}
      style={({ pressed }) => [styles.button, (pressed || busy) && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: 28,
    alignSelf: 'stretch',
    backgroundColor: whimColors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
  label: { fontFamily: fonts.interBold, fontSize: 17, color: '#FFFFFF' },
})
