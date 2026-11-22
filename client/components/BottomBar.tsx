// Frosted bar pinned to the bottom of a screen, outside its ScrollView, holding the main button.
// On Android the blur only works when the scrolling content is wrapped in a BlurTargetView;
// pass that view's ref as `blurTarget`.
import { ComponentRef, PropsWithChildren, RefObject } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { BlurView } from 'expo-blur'

type Props = PropsWithChildren<{
  blurTarget: RefObject<ComponentRef<typeof View> | null>
  gap?: number
}>

export default function BottomBar({ blurTarget, gap, children }: Props) {
  return (
    <BlurView
      tint="light"
      intensity={40}
      blurTarget={blurTarget}
      // Android needs a blur method to blur at all; this one skips the slow path on Android 11 and older.
      blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
      style={[styles.bar, { gap }]}
    >
      {children}
    </BlurView>
  )
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.6)',
    paddingTop: 14,
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
})
