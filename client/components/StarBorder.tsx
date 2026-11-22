// Decorative border of "★" around an ID card (You tab and Edit profile); hidden from screen readers.
// 13 stars along the top and bottom, 7 down each side. Place it as the card's first child.
import { StyleSheet, Text, View } from 'react-native'

export default function StarBorder({ color }: { color: string }) {
  const stars = (count: number) =>
    Array.from({ length: count }, (_, index) => (
      <Text key={index} style={[styles.star, { color }]}>
        ★
      </Text>
    ))
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.row, { top: 10 }]}>{stars(13)}</View>
      <View style={[styles.row, { bottom: 10 }]}>{stars(13)}</View>
      <View style={[styles.column, { left: 11 }]}>{stars(7)}</View>
      <View style={[styles.column, { right: 11 }]}>{stars(7)}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  star: { fontSize: 15, lineHeight: 17 },
  row: { position: 'absolute', left: 22, right: 22, flexDirection: 'row', justifyContent: 'space-between' },
  column: { position: 'absolute', top: 30, bottom: 30, justifyContent: 'space-between' },
})
