// Pop-up sheets used by the scrapbook page editor:
// - TextSheet: type text and choose its font, ink color and tape label.
// - PickerSheet: a grid of papers or scraps to choose from.
import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ScrapbookFont } from '../../../shared/types'
import { INKS, TEXT_FONTS } from '../../lib/scrapbook'
import { fonts, profileColors, scrapbookColors } from '../../lib/theme'

// What the text sheet edits.
export type TextDraft = { text: string; font: ScrapbookFont; color: string; label: boolean }

type TextSheetProps = {
  // The starting values, or null to keep the sheet closed.
  initial: TextDraft | null
  onCancel: () => void
  onDone: (draft: TextDraft) => void
}

export function TextSheet({ initial, onCancel, onDone }: TextSheetProps) {
  return (
    <Modal visible={initial !== null} transparent animationType="slide" onRequestClose={onCancel}>
      {/* Re-mount the form each time it opens, so it starts from `initial`. */}
      {initial ? <TextForm initial={initial} onCancel={onCancel} onDone={onDone} /> : null}
    </Modal>
  )
}

function TextForm({ initial, onCancel, onDone }: { initial: TextDraft } & Omit<TextSheetProps, 'initial'>) {
  const insets = useSafeAreaInsets()
  const [draft, setDraft] = useState(initial)
  const font = TEXT_FONTS[draft.font]
  // The cream ink is hard to read on the white sheet, so preview it on a dark strip.
  const darkPreview = draft.color === INKS[INKS.length - 1]

  return (
    <KeyboardAvoidingView style={styles.scrim} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.sheetTop}>
          <Pressable onPress={onCancel} accessibilityRole="button" hitSlop={10}>
            <Text style={styles.sheetAction}>Cancel</Text>
          </Pressable>
          <Text style={styles.sheetTitle}>Text</Text>
          <Pressable
            onPress={() => draft.text.trim() && onDone({ ...draft, text: draft.text.trim() })}
            accessibilityRole="button"
            hitSlop={10}
          >
            <Text style={[styles.sheetAction, styles.sheetDone, !draft.text.trim() && styles.disabled]}>Done</Text>
          </Pressable>
        </View>

        {/* The text box shows the chosen font and color as you type. */}
        <View style={[styles.preview, darkPreview && styles.previewDark]}>
          <TextInput
            value={draft.text}
            onChangeText={(text) => setDraft({ ...draft, text })}
            placeholder="Write something…"
            placeholderTextColor={profileColors.slate}
            multiline
            autoFocus
            style={{
              fontFamily: font.family,
              fontSize: 26,
              lineHeight: 26 * font.lineHeight + 2,
              color: draft.color,
              minHeight: 70,
            }}
          />
        </View>

        {/* Font choices, each written in its own font. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {(Object.keys(TEXT_FONTS) as ScrapbookFont[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => setDraft({ ...draft, font: key })}
              accessibilityRole="button"
              accessibilityState={{ selected: draft.font === key }}
              style={[styles.chip, draft.font === key && styles.chipOn]}
            >
              <Text style={[styles.chipText, { fontFamily: TEXT_FONTS[key].family }, draft.font === key && styles.chipTextOn]}>
                {TEXT_FONTS[key].label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Ink colors. */}
        <View style={styles.row}>
          {INKS.map((ink) => (
            <Pressable
              key={ink}
              onPress={() => setDraft({ ...draft, color: ink })}
              accessibilityRole="button"
              accessibilityLabel={`Ink ${ink}`}
              accessibilityState={{ selected: draft.color === ink }}
              style={[styles.swatch, { backgroundColor: ink }, draft.color === ink && styles.swatchOn]}
            />
          ))}
        </View>

        {/* Tape behind the text, like the labels in a diary. */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleText}>Tape label behind text</Text>
          <Switch value={draft.label} onValueChange={(label) => setDraft({ ...draft, label })} />
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

type PickerOption = { key: string; label: string; source: number }

type PickerSheetProps = {
  title: string
  visible: boolean
  options: PickerOption[]
  // Highlighted option (the current paper), if any.
  selectedKey?: string
  onPick: (key: string) => void
  onClose: () => void
}

// A grid of picture choices (papers or scraps).
export function PickerSheet({ title, visible, options, selectedKey, onPick, onClose }: PickerSheetProps) {
  const insets = useSafeAreaInsets()
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.sheetTop}>
            <View style={styles.sheetSide} />
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" hitSlop={10} style={styles.sheetSide}>
              <Text style={[styles.sheetAction, styles.sheetDone, styles.alignRight]}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.grid} style={styles.gridScroll}>
            {options.map((option) => (
              <Pressable
                key={option.key}
                onPress={() => onPick(option.key)}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
              >
                <View style={[styles.tileArt, option.key === selectedKey && styles.tileArtOn]}>
                  <Image
                    source={option.source}
                    contentFit="contain"
                    style={{ width: '82%', height: '82%' }}
                  />
                </View>
                <Text style={styles.tileLabel} numberOfLines={1}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  // Dimmed background and the white sheet that slides up.
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10, 20, 24, 0.45)' },
  sheet: {
    backgroundColor: profileColors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 14,
  },
  sheetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetSide: { width: 60 },
  sheetTitle: { fontFamily: fonts.bold, fontSize: 17, color: profileColors.ink },
  sheetAction: { fontFamily: fonts.semiBold, fontSize: 16, color: profileColors.slate },
  sheetDone: { color: scrapbookColors.selection },
  alignRight: { textAlign: 'right' },
  disabled: { opacity: 0.4 },

  // Text preview box.
  preview: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: profileColors.border,
    backgroundColor: '#FBF7EF',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  previewDark: { backgroundColor: '#3B4A4F' },

  // Font chips and ink swatches.
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: profileColors.border,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: profileColors.ink, borderColor: profileColors.ink },
  chipText: { fontSize: 17, color: profileColors.ink },
  chipTextOn: { color: '#FFFFFF' },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: profileColors.border },
  swatchOn: { borderWidth: 3, borderColor: scrapbookColors.selection },

  // Tape label switch.
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleText: { fontFamily: fonts.medium, fontSize: 15, color: profileColors.ink },

  // Grid of papers or scraps.
  gridScroll: { maxHeight: 380 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 8 },
  tile: { width: '30%', alignItems: 'center', gap: 6 },
  tileArt: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: scrapbookColors.desk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileArtOn: { borderWidth: 2.5, borderColor: scrapbookColors.selection },
  tileLabel: { fontFamily: fonts.medium, fontSize: 13, color: profileColors.slate },
  pressed: { opacity: 0.7 },
})
