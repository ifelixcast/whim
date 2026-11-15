// Draws one scrapbook page: the paper, a diary-style header line, and every photo,
// text and scrap on it. Used read-only for the small previews on the Scrapbook list,
// and editable (tap to select, drag to move) on the page editor.
import { useEffect, useRef, useState } from 'react'
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { ScrapbookItem } from '../../../shared/types'
import { PAGE, PAPERS, SCRAPS, TEXT_FONTS, DEFAULT_PAPER } from '../../lib/scrapbook'
import { fonts, scrapbookColors } from '../../lib/theme'

type Props = {
  paper: string
  items: ScrapbookItem[]
  // Width on screen in points; the height follows the 3:4 page shape.
  width: number
  // The three labels across the top, like "NOV '26   WHIM SCRAPBOOK   @sam".
  header: [string, string, string]
  // Temporary links for photos, keyed by storage path (or a local file while uploading).
  photoUrls: Record<string, string>
  editable?: boolean
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  // Called many times while dragging, with the new top-left corner in page units.
  onMove?: (id: string, x: number, y: number) => void
  // Called once when a drag ends.
  onMoveEnd?: () => void
}

export default function PageCanvas({
  paper,
  items,
  width,
  header,
  photoUrls,
  editable = false,
  selectedId = null,
  onSelect,
  onMove,
  onMoveEnd,
}: Props) {
  // How many screen points one page unit is.
  const scale = width / PAGE.width
  const paperInfo = PAPERS[paper] ?? PAPERS[DEFAULT_PAPER]

  return (
    <View style={{ width, height: width * (PAGE.height / PAGE.width), overflow: 'hidden' }}>
      <Image source={paperInfo.source} style={StyleSheet.absoluteFill} contentFit="fill" />

      {/* Tapping bare paper clears the selection. */}
      {editable ? <Pressable style={StyleSheet.absoluteFill} onPress={() => onSelect?.(null)} /> : null}

      {/* Diary header line: date, "WHIM SCRAPBOOK", @username. */}
      <View style={[styles.header, { top: 14 * scale, paddingHorizontal: 16 * scale }]} pointerEvents="none">
        {header.map((label, index) => (
          <Text
            key={index}
            numberOfLines={1}
            style={[
              styles.headerText,
              { fontSize: 7.5 * scale, color: paperInfo.ink },
              index === 1 && styles.headerCenter,
              index === 2 && styles.headerRight,
            ]}
          >
            {label}
          </Text>
        ))}
      </View>

      {items.map((item) => (
        <PageItem
          key={item.id}
          item={item}
          scale={scale}
          photoUrl={item.kind === 'photo' ? photoUrls[item.path] : undefined}
          editable={editable}
          selected={item.id === selectedId}
          onSelect={onSelect}
          onMove={onMove}
          onMoveEnd={onMoveEnd}
        />
      ))}
    </View>
  )
}

type ItemProps = {
  item: ScrapbookItem
  scale: number
  photoUrl?: string
  editable: boolean
  selected: boolean
  onSelect?: (id: string | null) => void
  onMove?: (id: string, x: number, y: number) => void
  onMoveEnd?: () => void
}

// One thing on the page, positioned and tilted. In editable mode it can be dragged.
function PageItem({ item, scale, photoUrl, editable, selected, onSelect, onMove, onMoveEnd }: ItemProps) {
  // The drag handler is created once, so it reads the latest props from this ref.
  const latest = useRef({ item, scale, onSelect, onMove, onMoveEnd })
  useEffect(() => {
    latest.current = { item, scale, onSelect, onMove, onMoveEnd }
  })
  // Where the item was when the finger went down.
  const dragStart = useRef({ x: 0, y: 0 })

  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const current = latest.current
        dragStart.current = { x: current.item.x, y: current.item.y }
        current.onSelect?.(current.item.id)
      },
      onPanResponderMove: (_event, gesture) => {
        const current = latest.current
        current.onMove?.(
          current.item.id,
          dragStart.current.x + gesture.dx / current.scale,
          dragStart.current.y + gesture.dy / current.scale
        )
      },
      onPanResponderRelease: () => latest.current.onMoveEnd?.(),
      onPanResponderTerminate: () => latest.current.onMoveEnd?.(),
    })
  )

  // Scraps get an exact height from their artwork's shape, so the whole sticker can be grabbed.
  const scrap = item.kind === 'scrap' ? SCRAPS[item.scrap] : undefined
  const height = scrap ? item.w * scrap.aspect * scale : undefined

  return (
    <View
      pointerEvents={editable ? 'auto' : 'none'}
      style={{
        position: 'absolute',
        left: item.x * scale,
        top: item.y * scale,
        width: item.w * scale,
        height,
        transform: [{ rotate: `${item.rotation}deg` }],
      }}
    >
      <ItemContent item={item} scale={scale} photoUrl={photoUrl} />
      {selected ? <View style={styles.selection} pointerEvents="none" /> : null}
      {/* Invisible layer on top that catches taps and drags, so images underneath can't swallow them. */}
      {editable ? <View {...responder.panHandlers} collapsable={false} style={styles.touchLayer} /> : null}
    </View>
  )
}

// What an item looks like, without any positioning.
function ItemContent({ item, scale, photoUrl }: { item: ScrapbookItem; scale: number; photoUrl?: string }) {
  if (item.kind === 'photo') {
    // print = white border like a printed photo; polaroid = deeper bottom edge; plain = no border.
    const pad = item.frame === 'plain' ? 0 : 6 * scale
    const bottom = item.frame === 'polaroid' ? 24 * scale : pad
    return (
      <View style={[styles.photoFrame, { padding: pad, paddingBottom: bottom }]}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={{ width: '100%', aspectRatio: 1 / item.aspect }} contentFit="cover" />
        ) : (
          <View style={[styles.photoMissing, { aspectRatio: 1 / item.aspect }]} />
        )}
      </View>
    )
  }

  if (item.kind === 'text') {
    const font = TEXT_FONTS[item.font] ?? TEXT_FONTS.hand
    const size = item.size * scale
    return (
      <View
        style={
          item.label
            ? [styles.textLabel, { paddingHorizontal: 8 * scale, paddingVertical: 3 * scale }]
            : undefined
        }
      >
        <Text style={{ fontFamily: font.family, fontSize: size, lineHeight: size * font.lineHeight, color: item.color }}>
          {item.text}
        </Text>
      </View>
    )
  }

  const scrap = SCRAPS[item.scrap]
  if (!scrap) return null
  return <Image source={scrap.source} style={styles.fill} contentFit="contain" />
}

const styles = StyleSheet.create({
  // Header line across the top of the page.
  header: { position: 'absolute', left: 0, right: 0, flexDirection: 'row' },
  headerText: { flex: 1, fontFamily: fonts.monoBold, letterSpacing: 0.4 },
  headerCenter: { textAlign: 'center' },
  headerRight: { textAlign: 'right' },
  // Photos: white print border with a soft shadow, and a grey box while the photo loads.
  photoFrame: { backgroundColor: '#FFFFFF', boxShadow: '0px 3px 8px -3px rgba(0, 0, 0, 0.45)' },
  photoMissing: { width: '100%', backgroundColor: '#D9D4CB' },
  // Translucent tape strip behind text with "tape label" turned on.
  textLabel: { backgroundColor: 'rgba(255, 255, 255, 0.72)', alignSelf: 'flex-start' },
  // Scrap artwork fills its item box; the touch layer covers the whole item.
  fill: { width: '100%', height: '100%' },
  touchLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  // Dashed outline around the selected item.
  selection: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: scrapbookColors.selection,
    borderRadius: 4,
  },
})
