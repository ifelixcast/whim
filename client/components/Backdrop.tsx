// Whole-screen backgrounds a host can pick for a whim (the create screen's "Backdrop" row).
// Each one is a gradient (or plain color), except 'photo', which is the host's own picture, blurred.
// <Backdrop> fills its parent; the swatches in the picker reuse it at 52x52.
import { StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { EventBackdrop } from '../../shared/types'
import GradientFill, { GradientFallback } from './GradientFill'

type GradientDef = { css: string; fallback: GradientFallback }

const GRADIENTS: Record<Exclude<EventBackdrop, 'paper' | 'photo'>, GradientDef> = {
  meadow: {
    css: [
      'radial-gradient(70% 30% at 10% 0%, #B4C8D6, transparent 70%)',
      'radial-gradient(60% 28% at 95% 18%, #7FA66A, transparent 70%)',
      'radial-gradient(70% 30% at 0% 55%, #4A8640, transparent 70%)',
      'radial-gradient(60% 25% at 95% 75%, #A7BCCB, transparent 70%)',
      'linear-gradient(180deg, #A9C0CE, #7EA46E 40%, #6C9C57 75%, #9DB7A0)',
    ].join(', '),
    fallback: { colors: ['#A9C0CE', '#7EA46E', '#6C9C57', '#9DB7A0'], locations: [0, 0.4, 0.75, 1] },
  },
  mist: {
    css: [
      'radial-gradient(70% 30% at 15% 5%, #E6ECEF, transparent 70%)',
      'radial-gradient(70% 30% at 90% 40%, #A7BCCB, transparent 70%)',
      'radial-gradient(70% 30% at 10% 85%, #C9D6E0, transparent 70%)',
      'linear-gradient(180deg, #D5E0E6, #B4C8D6 50%, #C9D6D0)',
    ].join(', '),
    fallback: { colors: ['#D5E0E6', '#B4C8D6', '#C9D6D0'], locations: [0, 0.5, 1] },
  },
  cocoa: {
    css: [
      'radial-gradient(70% 30% at 85% 0%, #7A4E3E, transparent 70%)',
      'radial-gradient(70% 30% at 0% 60%, #6B4235, transparent 70%)',
      'linear-gradient(180deg, #5A362C, #4A2A22 60%, #3A201A)',
    ].join(', '),
    fallback: { colors: ['#5A362C', '#4A2A22', '#3A201A'], locations: [0, 0.6, 1] },
  },
}

// Swatch order and labels for the picker.
export const BACKDROPS: { key: EventBackdrop; label: string }[] = [
  { key: 'meadow', label: 'Meadow' },
  { key: 'mist', label: 'Mist' },
  { key: 'paper', label: 'Paper' },
  { key: 'cocoa', label: 'Cocoa' },
  { key: 'photo', label: 'Your photo' },
]

// Backdrops dark enough that text on them should be cream instead of ink.
export const DARK_BACKDROPS: EventBackdrop[] = ['cocoa']

const PAPER = '#F2F1EC'

type Props = {
  backdrop: EventBackdrop
  // The picked photo (local file or URL), used when backdrop is 'photo'.
  photoUri?: string | null
  // Blur for the photo; the full-screen backdrop blurs it so text on top stays readable.
  blurRadius?: number
}

export default function Backdrop({ backdrop, photoUri, blurRadius = 12 }: Props) {
  if (backdrop === 'photo' && photoUri) {
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
        <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={blurRadius} />
      </View>
    )
  }
  if (backdrop === 'paper' || backdrop === 'photo') {
    // TODO: faint dot pattern on paper; plain for now.
    return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: PAPER }]} />
  }
  const { css, fallback } = GRADIENTS[backdrop]
  return <GradientFill css={css} fallback={fallback} />
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
})
