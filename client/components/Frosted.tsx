// Frosted-glass surface: a blur of what's behind it, a pale tint on top, a thin white border,
// then the children. The blur and tint are clipped to the corners in their own layer, so a shadow
// passed in `style` still shows outside the surface.
// On Android the blur needs the scrolling content wrapped in a BlurTargetView; pass its ref.
import { ComponentRef, PropsWithChildren, RefObject } from 'react'
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native'
import { BlurView } from 'expo-blur'
import { youColors } from '../lib/theme'

type Props = PropsWithChildren<{
  radius: number
  blurTarget: RefObject<ComponentRef<typeof View> | null>
  // Layout for the children (padding, row, gap) and any shadow.
  style?: StyleProp<ViewStyle>
}>

export default function Frosted({ radius, blurTarget, style, children }: Props) {
  return (
    <View style={[styles.surface, { borderRadius: radius }, style]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip, { borderRadius: radius }]}>
        <BlurView
          tint="light"
          intensity={30}
          blurTarget={blurTarget}
          // Android needs a blur method to blur at all; this one skips the slow path on Android 11 and older.
          blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, styles.tint]} />
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  surface: { borderWidth: 1, borderColor: youColors.frostedBorder },
  clip: { overflow: 'hidden' },
  tint: { backgroundColor: youColors.frosted },
})
