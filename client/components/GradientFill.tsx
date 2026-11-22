// Absolute gradient fill for a rounded area (the You tab's bubbles, and full-screen backgrounds).
// React Native 0.80+ draws CSS gradients itself through experimental_backgroundImage; on web and
// older versions we fall back to a plain vertical expo-linear-gradient with the given base colors.
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

export type GradientFallback = {
  colors: [string, string, ...string[]]
  locations: [number, number, ...number[]]
}

type Props = {
  // CSS background-image value: radial-gradient(...) blobs over a linear-gradient(...) base.
  css: string
  fallback: GradientFallback
  // Corner radii, e.g. { borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }.
  style?: StyleProp<ViewStyle>
}

// Native CSS gradients need React Native 0.80 or newer, and aren't drawn on web.
const rnVersion = Platform.constants.reactNativeVersion
const supportsCssGradients = Platform.OS !== 'web' && rnVersion.major === 0 && rnVersion.minor >= 80

export default function GradientFill({ css, fallback, style }: Props) {
  if (supportsCssGradients) {
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip, style, { experimental_backgroundImage: css }]} />
    )
  }
  return (
    <LinearGradient
      pointerEvents="none"
      colors={fallback.colors}
      locations={fallback.locations}
      style={[StyleSheet.absoluteFill, styles.clip, style]}
    />
  )
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
})
