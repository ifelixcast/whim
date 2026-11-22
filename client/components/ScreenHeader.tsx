// Top row of Edit profile and the interest picker: round back button on the left,
// an optional centered title, and an optional control on the right.
import { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { fonts, whimColors } from '../lib/theme'

type Props = {
  title?: string
  right?: ReactNode
}

export default function ScreenHeader({ title, right }: Props) {
  const insets = useSafeAreaInsets()

  // On web the page may have been opened directly, with nothing to go back to.
  function goBack() {
    if (router.canGoBack()) router.back()
    else router.replace('/profile')
  }

  return (
    // Below the status bar / notch, or 56pt down where there's no safe-area inset.
    <View style={[styles.row, { marginTop: insets.top || 56 }]}>
      {title ? (
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
      ) : null}
      <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
        <Image source={require('../assets/images/icons/chevron-left.svg')} style={styles.icon} />
      </Pressable>
      {right}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // Centered over the whole row, behind the buttons so they stay tappable.
  title: {
    position: 'absolute',
    left: 52,
    right: 52,
    textAlign: 'center',
    fontFamily: fonts.fraunces,
    fontSize: 28,
    color: whimColors.ink,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 22, height: 22 },
})
