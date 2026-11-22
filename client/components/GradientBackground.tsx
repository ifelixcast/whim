// Full-screen gradient drawn behind a screen's content (Edit profile and the interest picker).
// React Native 0.80+ draws CSS gradients itself through experimental_backgroundImage; on web and
// older versions we fall back to a plain vertical expo-linear-gradient with the same base colors.
import { Platform, StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

type Variant = 'picker' | 'edit'

// Soft color blobs (radial) over a vertical base (linear), as CSS strings.
const CSS: Record<Variant, string> = {
  picker: [
    'radial-gradient(100% 35% at 20% 0%, #9ECBEB, transparent 75%)',
    'radial-gradient(80% 25% at 10% 45%, #86A65E, transparent 70%)',
    'radial-gradient(70% 25% at 85% 60%, #B9C86A, transparent 70%)',
    'radial-gradient(80% 25% at 25% 85%, #8AA758, transparent 70%)',
    'linear-gradient(180deg, #A9D2EE, #C3D49A 35%, #B6C873 70%, #A4BC5A)',
  ].join(', '),
  edit: [
    'radial-gradient(70% 30% at 10% 2%, #B4C8D6, transparent 70%)',
    'radial-gradient(60% 28% at 95% 18%, #7FA66A, transparent 70%)',
    'radial-gradient(70% 30% at 0% 50%, #4A8640, transparent 70%)',
    'radial-gradient(55% 22% at 90% 62%, #A7BCCB, transparent 70%)',
    'radial-gradient(70% 28% at 15% 92%, #6FA052, transparent 72%)',
    'radial-gradient(60% 22% at 100% 100%, #3F7A3A, transparent 70%)',
    'linear-gradient(180deg, #A9C0CE, #7EA46E 40%, #5A9148 70%, #6C9C57)',
  ].join(', '),
}

// The fallback: just the vertical base, without the blobs.
const FALLBACK: Record<Variant, { colors: [string, string, ...string[]]; locations: [number, number, ...number[]] }> = {
  picker: { colors: ['#A9D2EE', '#C3D49A', '#B6C873', '#A4BC5A'], locations: [0, 0.35, 0.7, 1] },
  edit: { colors: ['#A9C0CE', '#7EA46E', '#5A9148', '#6C9C57'], locations: [0, 0.4, 0.7, 1] },
}

// Native CSS gradients need React Native 0.80 or newer, and aren't drawn on web.
const rnVersion = Platform.constants.reactNativeVersion
const supportsCssGradients = Platform.OS !== 'web' && rnVersion.major === 0 && rnVersion.minor >= 80

export default function GradientBackground({ variant }: { variant: Variant }) {
  if (supportsCssGradients) {
    return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { experimental_backgroundImage: CSS[variant] }]} />
  }
  const { colors, locations } = FALLBACK[variant]
  return <LinearGradient pointerEvents="none" colors={colors} locations={locations} style={StyleSheet.absoluteFill} />
}
