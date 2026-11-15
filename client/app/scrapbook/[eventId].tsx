// Scrapbook page editor: one page for one event you attended.
// Add photos from your phone, text in different fonts, built-in scraps, and pick the paper.
// Tap something to select it, drag to move it, and use the bar at the bottom to change it.
// Changes save automatically to the scrapbook_pages table (see server/supabase/scrapbook.sql).
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { ScrapbookFrame, ScrapbookItem } from '../../../shared/types'
import PageCanvas from '../../components/scrapbook/PageCanvas'
import { PickerSheet, TextDraft, TextSheet } from '../../components/scrapbook/Sheets'
import {
  DEFAULT_PAPER,
  PAGE,
  PAPERS,
  PHOTO_BUCKET,
  SCRAPS,
  defaultItems,
  ensurePhotoAccess,
  newItemId,
  pageDateLabel,
  photoPaths,
  randomTilt,
  signedPhotoUrls,
  uploadScrapbookPhoto,
} from '../../lib/scrapbook'
import { fonts, profileColors, scrapbookColors } from '../../lib/theme'

// How long to wait after the last change before saving.
const SAVE_DELAY_MS = 800
// Photos picked at once, at most.
const MAX_PHOTOS_PER_PICK = 5
// Frame styles a photo cycles through.
const FRAMES: ScrapbookFrame[] = ['print', 'polaroid', 'plain']

type Page = { paper: string; items: ScrapbookItem[] }
type SaveState = 'saved' | 'saving' | 'error'

// Writes the whole page (one row per person per event).
async function savePage(userId: string, eventId: number, page: Page) {
  return supabase.from('scrapbook_pages').upsert(
    { profile_id: userId, event_id: eventId, paper: page.paper, items: page.items, updated_at: new Date().toISOString() },
    { onConflict: 'profile_id,event_id' }
  )
}

export default function ScrapbookPageEditor() {
  const { eventId: eventIdParam } = useLocalSearchParams<{ eventId: string }>()
  const eventId = Number(eventIdParam)
  const { session } = useAuth()
  const userId = session?.user.id
  const insets = useSafeAreaInsets()
  const screenSize = useWindowDimensions()

  // Page data and the labels in its header line.
  const [page, setPage] = useState<Page | null>(null)
  const [header, setHeader] = useState<[string, string, string]>(['', 'WHIM SCRAPBOOK', ''])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  // Editing state.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [sheet, setSheet] = useState<'paper' | 'scraps' | null>(null)
  // Text sheet: null = closed; editingId = which text item (null when adding new text).
  const [textDraft, setTextDraft] = useState<TextDraft | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [addingPhotos, setAddingPhotos] = useState(false)
  // True when the person gave "Limit Access" to their photos, so we can explain.
  const [limitedAccess, setLimitedAccess] = useState(false)

  // Page size: as wide as the screen allows, but short enough to leave room for the toolbar.
  const pageWidth = Math.min(screenSize.width - 32, (screenSize.height - insets.top - insets.bottom - 230) * (PAGE.width / PAGE.height))

  // Loads the event, your username, and your saved page (or a fresh one).
  const load = useCallback(async () => {
    if (!userId) return
    const { data: event, error } = await supabase.from('events').select('title, starts_at').eq('id', eventId).single()
    if (error || !event) {
      Alert.alert('Could not open this page', error?.message ?? 'This activity is no longer available.')
      return
    }
    const { data: me } = await supabase.from('profiles').select('username').eq('id', userId).single()
    setHeader([pageDateLabel(event.starts_at), 'WHIM SCRAPBOOK', me?.username ? `@${me.username}` : '@you'])

    const { data: saved } = await supabase
      .from('scrapbook_pages')
      .select('paper, items')
      .eq('profile_id', userId)
      .eq('event_id', eventId)
      .maybeSingle()
    const loaded: Page = saved
      ? { paper: saved.paper, items: saved.items ?? [] }
      : { paper: DEFAULT_PAPER, items: defaultItems(event.title) }
    setPage(loaded)
    setPhotoUrls(await signedPhotoUrls(photoPaths(loaded.items)))
  }, [eventId, userId])

  // Load once when the screen opens (not on every focus, so returning from the photo picker
  // doesn't throw away unsaved moves).
  const loadedOnce = useRef(false)
  useFocusEffect(
    useCallback(() => {
      if (loadedOnce.current) return
      loadedOnce.current = true
      load()
    }, [load])
  )

  // Save a moment after the last change.
  useEffect(() => {
    if (!dirty || !page || !userId) return
    const timer = setTimeout(async () => {
      setSaveState('saving')
      const { error } = await savePage(userId, eventId, page)
      if (error) {
        setSaveState('error')
        Alert.alert('Could not save page', error.message)
      } else {
        setSaveState('saved')
        setDirty(false)
      }
    }, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [dirty, page, userId, eventId])

  // If you leave mid-edit, save what's there.
  const pending = useRef({ dirty, page })
  useEffect(() => {
    pending.current = { dirty, page }
  })
  useEffect(() => {
    return () => {
      const { dirty: unsaved, page: lastPage } = pending.current
      if (unsaved && lastPage && userId) savePage(userId, eventId, lastPage)
    }
  }, [userId, eventId])

  // ---- Changing the page ----

  // Applies a change to the page and marks it for saving.
  function change(update: (current: Page) => Page) {
    setPage((current) => (current ? update(current) : current))
    setDirty(true)
  }

  // Replaces one item.
  function updateItem(id: string, update: (item: ScrapbookItem) => ScrapbookItem) {
    change((current) => ({ ...current, items: current.items.map((item) => (item.id === id ? update(item) : item)) }))
  }

  // Adds items on top of everything else and selects the last one.
  function addItems(newItems: ScrapbookItem[]) {
    change((current) => ({ ...current, items: [...current.items, ...newItems] }))
    setSelectedId(newItems[newItems.length - 1]?.id ?? null)
  }

  // Dragging: keep at least part of the item on the page so it can't get lost.
  function moveItem(id: string, x: number, y: number) {
    updateItem(id, (item) => ({
      ...item,
      x: Math.min(PAGE.width - item.w * 0.3, Math.max(-item.w * 0.7, x)),
      y: Math.min(PAGE.height - 20, Math.max(-20, y)),
    }))
  }

  // ---- Toolbar actions ----

  // Asks for photo access if needed, lets you pick up to 5 photos, uploads them, and adds them.
  async function addPhotos() {
    if (!userId) return
    const access = await ensurePhotoAccess()
    if (access === 'none') return
    setLimitedAccess(access === 'limited')

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS_PER_PICK,
      // Compressing also turns iPhone HEIC photos into JPEGs.
      quality: 0.7,
    })
    if (result.canceled) return

    setAddingPhotos(true)
    const added: ScrapbookItem[] = []
    const localUrls: Record<string, string> = {}
    for (const [index, asset] of result.assets.entries()) {
      try {
        const path = await uploadScrapbookPhoto(userId, asset)
        // Show the phone's copy right away instead of downloading it back.
        localUrls[path] = asset.uri
        added.push({
          id: newItemId(),
          kind: 'photo',
          path,
          aspect: asset.width && asset.height ? asset.height / asset.width : 1,
          frame: 'print',
          w: 130,
          x: 40 + index * 22,
          y: 90 + index * 22,
          rotation: randomTilt(),
        })
      } catch (error) {
        Alert.alert('Could not add a photo', error instanceof Error ? error.message : 'Try again.')
      }
    }
    setPhotoUrls((current) => ({ ...current, ...localUrls }))
    if (added.length > 0) addItems(added)
    setAddingPhotos(false)
  }

  // Drops a scrap in the middle of the page.
  function addScrap(key: string) {
    const scrap = SCRAPS[key]
    setSheet(null)
    addItems([
      {
        id: newItemId(),
        kind: 'scrap',
        scrap: key,
        w: scrap.width,
        x: (PAGE.width - scrap.width) / 2,
        y: 170,
        rotation: randomTilt(10),
      },
    ])
  }

  // Opens the text sheet, empty for new text or filled in for the selected text.
  function openTextSheet(item?: ScrapbookItem) {
    if (item?.kind === 'text') {
      setEditingTextId(item.id)
      setTextDraft({ text: item.text, font: item.font, color: item.color, label: item.label })
    } else {
      setEditingTextId(null)
      setTextDraft({ text: '', font: 'hand', color: PAPERS[page?.paper ?? DEFAULT_PAPER].ink, label: false })
    }
  }

  // Saves the text sheet: updates the text you were editing, or adds new text.
  function finishText(draft: TextDraft) {
    if (editingTextId) {
      updateItem(editingTextId, (item) => (item.kind === 'text' ? { ...item, ...draft } : item))
    } else {
      addItems([{ id: newItemId(), kind: 'text', ...draft, size: 20, w: 200, x: 50, y: 160, rotation: randomTilt(3) }])
    }
    setTextDraft(null)
  }

  // Makes the selected item bigger or smaller (text grows its font too).
  function resize(factor: number) {
    if (!selectedId) return
    updateItem(selectedId, (item) => {
      const w = Math.min(PAGE.width, Math.max(20, item.w * factor))
      const grow = w / item.w
      return item.kind === 'text' ? { ...item, w, size: item.size * grow } : { ...item, w }
    })
  }

  function rotate(degrees: number) {
    if (!selectedId) return
    updateItem(selectedId, (item) => ({ ...item, rotation: (item.rotation + degrees) % 360 }))
  }

  // Moves the selected item on top of everything else.
  function bringToFront() {
    if (!selectedId) return
    change((current) => {
      const item = current.items.find((entry) => entry.id === selectedId)
      if (!item) return current
      return { ...current, items: [...current.items.filter((entry) => entry.id !== selectedId), item] }
    })
  }

  // Switches a photo between print, polaroid and plain.
  function nextFrame() {
    if (!selectedId) return
    updateItem(selectedId, (item) =>
      item.kind === 'photo' ? { ...item, frame: FRAMES[(FRAMES.indexOf(item.frame) + 1) % FRAMES.length] } : item
    )
  }

  // Removes the selected item (and deletes the photo file, for photos).
  function removeSelected() {
    if (!selectedId || !page) return
    const item = page.items.find((entry) => entry.id === selectedId)
    if (item?.kind === 'photo') supabase.storage.from(PHOTO_BUCKET).remove([item.path])
    change((current) => ({ ...current, items: current.items.filter((entry) => entry.id !== selectedId) }))
    setSelectedId(null)
  }

  if (!page) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={scrapbookColors.selection} />
      </View>
    )
  }

  const selected = page.items.find((item) => item.id === selectedId) ?? null
  const statusText = addingPhotos ? 'Adding photos…' : saveState === 'saving' || dirty ? 'Saving…' : saveState === 'error' ? 'Not saved' : 'Saved'

  return (
    <View style={styles.screen}>
      <Text style={styles.status}>{statusText}</Text>

      {/* The page, sitting on the "desk". */}
      <View style={styles.desk}>
        <View style={styles.pageShadow}>
          <PageCanvas
            paper={page.paper}
            items={page.items}
            width={pageWidth}
            header={header}
            photoUrls={photoUrls}
            editable
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={moveItem}
          />
        </View>
      </View>

      {/* Explains "Limit Access" once it's been chosen. */}
      {limitedAccess ? (
        <Text style={styles.notice}>
          Whim! can only see the photos you chose. To pick from all of them, change Photos access in Settings.
        </Text>
      ) : null}

      {/* Bottom bar: tools for the selected item, or ways to add things. */}
      <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {selected ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolRow}>
            <Tool label="Done" onPress={() => setSelectedId(null)} strong />
            {selected.kind === 'text' ? <Tool label="Edit" onPress={() => openTextSheet(selected)} /> : null}
            {selected.kind === 'photo' ? <Tool label="Frame" onPress={nextFrame} /> : null}
            <Tool label="Bigger" onPress={() => resize(1.15)} />
            <Tool label="Smaller" onPress={() => resize(1 / 1.15)} />
            <Tool label="Tilt ↺" onPress={() => rotate(-8)} />
            <Tool label="Tilt ↻" onPress={() => rotate(8)} />
            <Tool label="To front" onPress={bringToFront} />
            <Tool label="Delete" onPress={removeSelected} danger />
          </ScrollView>
        ) : (
          <View style={styles.addRow}>
            <AddButton icon="📷" label="Photos" onPress={addPhotos} disabled={addingPhotos} />
            <AddButton icon="✏️" label="Text" onPress={() => openTextSheet()} />
            <AddButton icon="⭐" label="Scraps" onPress={() => setSheet('scraps')} />
            <AddButton icon="📄" label="Paper" onPress={() => setSheet('paper')} />
          </View>
        )}
      </View>

      <TextSheet initial={textDraft} onCancel={() => setTextDraft(null)} onDone={finishText} />

      <PickerSheet
        title="Scraps"
        visible={sheet === 'scraps'}
        options={Object.entries(SCRAPS).map(([key, scrap]) => ({ key, label: scrap.label, source: scrap.source }))}
        onPick={addScrap}
        onClose={() => setSheet(null)}
      />
      <PickerSheet
        title="Paper"
        visible={sheet === 'paper'}
        selectedKey={page.paper}
        options={Object.entries(PAPERS).map(([key, paper]) => ({ key, label: paper.label, source: paper.source }))}
        onPick={(key) => {
          change((current) => ({ ...current, paper: key }))
          setSheet(null)
        }}
        onClose={() => setSheet(null)}
      />
    </View>
  )
}

// A big button for adding something to the page.
function AddButton({ icon, label, onPress, disabled }: { icon: string; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [styles.addButton, (pressed || disabled) && styles.pressed]}
    >
      <Text style={styles.addIcon}>{icon}</Text>
      <Text style={styles.addLabel}>{label}</Text>
    </Pressable>
  )
}

// A small pill button for changing the selected item.
function Tool({ label, onPress, strong, danger }: { label: string; onPress: () => void; strong?: boolean; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.tool, strong && styles.toolStrong, pressed && styles.pressed]}
    >
      <Text style={[styles.toolText, strong && styles.toolTextStrong, danger && styles.toolTextDanger]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: scrapbookColors.desk },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: scrapbookColors.desk },
  // "Saved" line above the page.
  status: { fontFamily: fonts.mono, fontSize: 12, color: profileColors.slate, textAlign: 'center', marginTop: 4 },
  // The page, centered, with a paper shadow.
  desk: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageShadow: { borderRadius: 4, overflow: 'hidden', boxShadow: '0px 10px 24px -12px rgba(22, 38, 46, 0.55)' },
  notice: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: profileColors.slate,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  // Bottom bar.
  toolbar: {
    backgroundColor: profileColors.card,
    borderTopWidth: 1,
    borderTopColor: profileColors.border,
    paddingTop: 10,
  },
  addRow: { flexDirection: 'row', paddingHorizontal: 12 },
  addButton: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 6 },
  addIcon: { fontSize: 22 },
  addLabel: { fontFamily: fonts.semiBold, fontSize: 12, color: profileColors.ink },
  toolRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 6 },
  tool: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: profileColors.border,
    justifyContent: 'center',
  },
  toolStrong: { backgroundColor: profileColors.ink, borderColor: profileColors.ink },
  toolText: { fontFamily: fonts.semiBold, fontSize: 14, color: profileColors.ink },
  toolTextStrong: { color: '#FFFFFF' },
  toolTextDanger: { color: '#C2412D' },
  pressed: { opacity: 0.6 },
})
