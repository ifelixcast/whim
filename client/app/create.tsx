// New whim: the create-activity screen, opened as a full-screen modal by the orange + in the tab bar.
// Sections: what + description + category, a polaroid cover photo, the backdrop behind this screen,
// when / where / spots / who can see it / approval, and a "Post whim" bar pinned to the bottom.
// Saves one row in the "events" table (extra columns: server/supabase/create_event.sql).
import { ComponentRef, useEffect, useRef, useState } from 'react'
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native'
import { BlurTargetView, BlurView } from 'expo-blur'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { router, useNavigation, usePreventRemove } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CATEGORIES } from '../../shared/categories'
import { EventBackdrop, EventVisibility } from '../../shared/types'
import Backdrop, { BACKDROPS, DARK_BACKDROPS } from '../components/Backdrop'
import Frosted from '../components/Frosted'
import TimeButton from '../components/TimeButton'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { createColors as c, fonts } from '../lib/theme'

// How long a "Now" / "30 min" / "1 hr" whim stays open after it starts.
const DEFAULT_OPEN_MINUTES = 60
const PHOTO_BUCKET = 'event-photos'
const TITLE_MAX = 60
const SPOTS = { min: 1, max: 20, start: 3 }

type When = 'now' | '30' | '60' | 'pick'
type PickMode = 'exact' | 'frame'

const WHEN_OPTIONS: { key: When; label: string }[] = [
  { key: 'now', label: 'Now' },
  { key: '30', label: '30 min' },
  { key: '60', label: '1 hr' },
  { key: 'pick', label: 'Pick time' },
]

const VISIBILITY_OPTIONS: { key: EventVisibility; title: string; subtitle: string }[] = [
  { key: 'nearby', title: 'Anyone nearby', subtitle: 'People within 2 miles' },
  { key: 'school', title: 'My school', subtitle: 'Verified at your university' },
  { key: 'friends', title: 'Friends only', subtitle: 'People you’ve added' },
]

// A time today at the given hour, on the hour.
function todayAt(hour: number) {
  const date = new Date()
  date.setHours(hour, 0, 0, 0)
  return date
}

// Picked times are today; one that's already passed means tomorrow.
function nextOccurrence(time: Date) {
  const date = new Date(time)
  if (date.getTime() < Date.now()) date.setDate(date.getDate() + 1)
  return date
}

// A short name for where you are, like "Snell Library" or "Huntington Ave".
async function placeNameAt(coords: { latitude: number; longitude: number }) {
  const [place] = await Location.reverseGeocodeAsync(coords)
  return place?.name || place?.street || place?.district || place?.city || 'Current location'
}

// Uploads a picked photo to event-photos/<user id>/ and returns its public URL.
async function uploadPhoto(asset: ImagePicker.ImagePickerAsset, userId: string, kind: 'cover' | 'backdrop') {
  const contentType = asset.mimeType ?? 'image/jpeg'
  const extension = contentType.split('/')[1] ?? 'jpg'
  const path = `${userId}/${kind}-${Date.now()}.${extension}`
  const file = await fetch(asset.uri).then((response) => response.arrayBuffer())
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, { contentType })
  if (error) throw error
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
}

export default function CreateWhim() {
  const { session } = useAuth()
  const userId = session?.user.id
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()
  // The content the frosted panels blur on Android.
  const blurTarget = useRef<ComponentRef<typeof View>>(null)

  // 1. What
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  // 2. Cover and backdrop
  const [cover, setCover] = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [backdrop, setBackdrop] = useState<EventBackdrop>('meadow')
  const [backdropPhoto, setBackdropPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null)
  // 3. When
  const [when, setWhen] = useState<When>('now')
  const [pickMode, setPickMode] = useState<PickMode>('exact')
  const [startTime, setStartTime] = useState(() => todayAt(18))
  const [endTime, setEndTime] = useState(() => todayAt(20))
  // 4. Where: what's typed, plus coordinates when they came from "Use where I am".
  const [place, setPlace] = useState('')
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null)
  const [here, setHere] = useState<{ name: string; latitude: number; longitude: number } | null>(null)
  // 5. Spots, who can see it, approval
  const [spots, setSpots] = useState(SPOTS.start)
  // No limit: saved as an empty max_participants, which joining and Home already treat as unlimited.
  const [noLimit, setNoLimit] = useState(false)
  const [visibility, setVisibility] = useState<EventVisibility>('nearby')
  const [requiresApproval, setRequiresApproval] = useState(true)

  const [busy, setBusy] = useState(false)
  const [posted, setPosted] = useState(false)

  const dark = DARK_BACKDROPS.includes(backdrop)
  const canPost = title.trim().length > 0 && !busy
  const dirty = !!(title || description || cover || place || backdropPhoto)

  // Ask before throwing away a half-filled form (Close button or swipe down).
  usePreventRemove(dirty && !posted, ({ data }) => {
    Alert.alert('Discard this whim?', 'What you’ve filled in will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ])
  })

  // Find where you are for "Use where I am". If location is off or denied, the button stays hidden.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { granted } = await Location.requestForegroundPermissionsAsync()
        if (!granted) return
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        const { latitude, longitude } = position.coords
        const name = await placeNameAt({ latitude, longitude })
        if (!cancelled) setHere({ name, latitude, longitude })
      } catch {
        // No location (e.g. simulator or web): just don't offer the button.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function pickImage(aspect?: [number, number]) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: !!aspect,
      aspect,
      quality: 0.8,
    })
    return result.canceled ? null : result.assets[0]
  }

  async function chooseCover() {
    const asset = await pickImage([14, 11])
    if (asset) setCover(asset)
  }

  // The pencil: change the cover, or remove it if there is one.
  function editCover() {
    if (!cover) return chooseCover()
    Alert.alert('Cover photo', undefined, [
      { text: 'Change photo', onPress: chooseCover },
      { text: 'Remove photo', style: 'destructive', onPress: () => setCover(null) },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  // "Your photo" opens the picker (every time, so it can be changed), then selects it.
  async function chooseBackdrop(key: EventBackdrop) {
    if (key !== 'photo') return setBackdrop(key)
    const asset = await pickImage()
    if (asset) {
      setBackdropPhoto(asset)
      setBackdrop('photo')
    }
  }

  function fillHere() {
    if (!here) return
    setPlace(here.name)
    setCoords({ latitude: here.latitude, longitude: here.longitude })
  }

  // When it starts and when it stops taking people (events.starts_at / expires_at).
  function times(): { startsAt: Date; expiresAt: Date } | string {
    if (when !== 'pick') {
      const startsAt = new Date(Date.now() + (when === 'now' ? 0 : Number(when)) * 60000)
      return { startsAt, expiresAt: new Date(startsAt.getTime() + DEFAULT_OPEN_MINUTES * 60000) }
    }
    const startsAt = nextOccurrence(startTime)
    // Exact time: people can join until it starts.
    if (pickMode === 'exact') return { startsAt, expiresAt: startsAt }
    // Time frame: open from start to end, on the same day.
    const expiresAt = new Date(startsAt)
    expiresAt.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0)
    if (expiresAt <= startsAt) return 'The end time needs to be after the start time.'
    return { startsAt, expiresAt }
  }

  async function post() {
    if (!userId || !canPost) return
    const span = times()
    if (typeof span === 'string') return Alert.alert('Check the time', span)

    setBusy(true)
    try {
      // A typed place gets coordinates too, when the phone can look it up (so it can show on the Map).
      let location = coords
      if (!location && place.trim() && Platform.OS !== 'web') {
        const [found] = await Location.geocodeAsync(place.trim()).catch(() => [])
        if (found) location = { latitude: found.latitude, longitude: found.longitude }
      }

      // Photos go up first so their URLs can be saved on the event.
      const coverUrl = cover ? await uploadPhoto(cover, userId, 'cover') : null
      const backdropUrl = backdrop === 'photo' && backdropPhoto ? await uploadPhoto(backdropPhoto, userId, 'backdrop') : null

      const { error } = await supabase.from('events').insert({
        profile_id: userId,
        title: title.trim(),
        description: description.trim() || null,
        category,
        starts_at: span.startsAt.toISOString(),
        expires_at: span.expiresAt.toISOString(),
        location_name: place.trim() || null,
        lat: location?.latitude ?? null,
        lng: location?.longitude ?? null,
        max_participants: noLimit ? null : spots,
        visibility,
        requires_approval: requiresApproval,
        cover_url: coverUrl,
        backdrop: backdropUrl ? 'photo' : backdrop === 'photo' ? 'meadow' : backdrop,
        backdrop_url: backdropUrl,
      })
      if (error) throw error

      // Posted: close this and land on Home, which reloads its feed when it comes into view.
      setPosted(true)
      setTimeout(() => router.dismissTo('/'), 0)
    } catch (error) {
      setBusy(false)
      Alert.alert('Could not post your whim', (error as Error).message)
    }
  }

  return (
    <View style={styles.screen}>
      <BlurTargetView ref={blurTarget} style={styles.screen}>
        <Backdrop backdrop={backdrop} photoUri={backdropPhoto?.uri} />
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: insets.top + 52, paddingBottom: 140 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          {/* 1. Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close">
              <Frosted radius={23} blurTarget={blurTarget} style={styles.closeButton}>
                <Image source={require('../assets/images/icons/close.svg')} style={styles.icon20} />
              </Frosted>
            </Pressable>
            <Text style={[styles.title, dark && styles.titleOnDark]} accessibilityRole="header">
              New whim
            </Text>
          </View>

          {/* 2. Title, description, category */}
          <Frosted radius={26} blurTarget={blurTarget} style={styles.panel}>
            <View style={styles.field}>
              <Text style={styles.monoLabel}>What’s the whim?</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                maxLength={TITLE_MAX}
                placeholder="Frisbee on the quad, anyone?"
                placeholderTextColor={c.placeholder}
                accessibilityLabel="What's the whim? Required"
                style={[styles.input, styles.titleInput]}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.monoLabel}>
                Description <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                placeholder="Bring a frisbee if you have one. Meeting by the big oak."
                placeholderTextColor={c.placeholder}
                accessibilityLabel="Description, optional"
                style={[styles.input, styles.descriptionInput]}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipRow}
              contentContainerStyle={styles.chips}
              accessibilityRole="radiogroup"
            >
              {CATEGORIES.map((name) => {
                const on = category === name
                return (
                  <Pressable
                    key={name}
                    onPress={() => setCategory(on ? null : name)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    style={[styles.chip, on && styles.chipOn]}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{name}</Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </Frosted>

          {/* 3. Cover photo, as a tilted polaroid */}
          <View style={styles.polaroidWrap}>
            <View style={styles.polaroid}>
              <Pressable
                onPress={chooseCover}
                accessibilityRole="button"
                accessibilityLabel={cover ? 'Change cover photo' : 'Add a cover photo'}
                style={[styles.cover, !cover && styles.coverEmpty]}
              >
                {cover ? (
                  <Image source={{ uri: cover.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <>
                    <Image source={require('../assets/images/icons/camera.svg')} tintColor={c.secondary} style={styles.cameraIcon} />
                    <Text style={styles.coverTitle}>Add a cover photo</Text>
                    <Text style={styles.coverHint}>or a GIF, a doodle, a screenshot</Text>
                  </>
                )}
              </Pressable>
              <Text style={styles.coverCaption}>add a cover</Text>
              <Pressable onPress={editCover} accessibilityRole="button" accessibilityLabel="Edit cover" style={styles.editCover}>
                <Image source={require('../assets/images/icons/pencil.svg')} style={styles.icon20} />
              </Pressable>
            </View>
          </View>

          {/* 4. Backdrop */}
          <Frosted radius={22} blurTarget={blurTarget} style={styles.backdropPanel}>
            <Text style={styles.monoLabel}>Backdrop</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatches} accessibilityRole="radiogroup">
              {BACKDROPS.map(({ key, label }) => {
                const on = backdrop === key
                const emptyPhoto = key === 'photo' && !backdropPhoto
                return (
                  <Pressable
                    key={key}
                    onPress={() => chooseBackdrop(key)}
                    accessibilityRole="radio"
                    accessibilityLabel={`${label} backdrop`}
                    accessibilityState={{ checked: on }}
                    style={styles.swatchItem}
                  >
                    <View style={[styles.swatchRing, on && styles.swatchRingOn]}>
                      <View style={[styles.swatch, emptyPhoto && styles.swatchAdd, on && styles.swatchOn]}>
                        {emptyPhoto ? (
                          <Image source={require('../assets/images/icons/plus.svg')} style={styles.icon20} />
                        ) : (
                          <Backdrop backdrop={key} photoUri={backdropPhoto?.uri} blurRadius={0} />
                        )}
                      </View>
                    </View>
                    <Text style={styles.swatchLabel} numberOfLines={2}>
                      {label}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </Frosted>

          {/* 5. When, where, spots, who can see it, approval */}
          <Frosted radius={26} blurTarget={blurTarget} style={styles.form}>
            <View>
              <Text style={styles.monoLabel}>When</Text>
              <View style={styles.segmented} accessibilityRole="radiogroup">
                {WHEN_OPTIONS.map(({ key, label }) => {
                  const on = when === key
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setWhen(key)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      style={[styles.segment, on && styles.segmentOn]}
                    >
                      <Text style={[styles.segmentText, on && styles.segmentTextOn]} numberOfLines={1}>
                        {label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>

              {when === 'pick' ? (
                <View style={styles.pickCard}>
                  <View style={styles.toggle} accessibilityRole="radiogroup">
                    {(['exact', 'frame'] as PickMode[]).map((mode) => {
                      const on = pickMode === mode
                      return (
                        <Pressable
                          key={mode}
                          onPress={() => setPickMode(mode)}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: on }}
                          style={[styles.toggleOption, on && styles.toggleOptionOn]}
                        >
                          <Text style={[styles.toggleText, on && styles.toggleTextOn]}>{mode === 'exact' ? 'Exact time' : 'Time frame'}</Text>
                        </Pressable>
                      )
                    })}
                  </View>
                  <View style={styles.timeRow}>
                    <Text style={styles.timeLabel}>{pickMode === 'exact' ? 'Start' : 'From'}</Text>
                    <TimeButton value={startTime} onChange={setStartTime} accessibilityLabel={pickMode === 'exact' ? 'Start time' : 'From'} />
                  </View>
                  {pickMode === 'frame' ? (
                    <View style={styles.timeRow}>
                      <Text style={styles.timeLabel}>To</Text>
                      <TimeButton value={endTime} onChange={setEndTime} accessibilityLabel="To" />
                    </View>
                  ) : null}
                  <Text style={styles.hint}>
                    {pickMode === 'exact' ? 'People can join until it starts.' : 'Shows as open the whole time frame.'}
                  </Text>
                </View>
              ) : null}
            </View>

            <View>
              <Text style={styles.monoLabel}>Where</Text>
              <View style={styles.placeField}>
                <Image source={require('../assets/images/icons/pin.svg')} style={styles.icon20} />
                <TextInput
                  value={place}
                  onChangeText={(text) => {
                    setPlace(text)
                    // Typing a place replaces "where I am".
                    setCoords(null)
                  }}
                  placeholder="Search a place"
                  placeholderTextColor={c.placeholder}
                  accessibilityLabel="Where"
                  style={styles.placeInput}
                />
              </View>
              {here ? (
                <Pressable onPress={fillHere} accessibilityRole="button" style={styles.hereButton}>
                  <Image source={require('../assets/images/icons/crosshair.svg')} style={styles.icon18} />
                  <Text style={styles.hereText} numberOfLines={1}>{`Use where I am: ${here.name}`}</Text>
                </Pressable>
              ) : null}
            </View>

            <View>
              <Text style={styles.monoLabel}>Spots</Text>
              <View style={styles.spotsRow}>
                <Text style={styles.spotsLabel}>{noLimit ? 'Anyone can join' : 'Not counting you'}</Text>
                {/* The stepper fades and stops responding while "No limit" is on. */}
                <Pressable
                  onPress={() => setSpots((n) => Math.max(SPOTS.min, n - 1))}
                  disabled={noLimit}
                  accessibilityRole="button"
                  accessibilityLabel="Fewer spots"
                  accessibilityState={{ disabled: noLimit }}
                  style={[styles.stepButton, styles.stepMinus, noLimit && styles.disabled]}
                >
                  <Image source={require('../assets/images/icons/minus.svg')} style={styles.icon20} />
                </Pressable>
                <Text
                  style={[styles.spotsCount, noLimit && styles.spotsInfinite]}
                  accessibilityLiveRegion="polite"
                  accessibilityLabel={noLimit ? 'No limit' : `${spots} spots`}
                >
                  {noLimit ? '∞' : spots}
                </Text>
                <Pressable
                  onPress={() => setSpots((n) => Math.min(SPOTS.max, n + 1))}
                  disabled={noLimit}
                  accessibilityRole="button"
                  accessibilityLabel="More spots"
                  accessibilityState={{ disabled: noLimit }}
                  style={[styles.stepButton, styles.stepPlus, noLimit && styles.disabled]}
                >
                  <Image source={require('../assets/images/icons/plus.svg')} tintColor={c.brownText} style={styles.icon20} />
                </Pressable>
              </View>
              <View style={styles.noLimitRow}>
                <Text style={styles.noLimitLabel}>No limit</Text>
                <Switch
                  value={noLimit}
                  onValueChange={setNoLimit}
                  trackColor={{ true: c.green, false: c.switchOff }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={c.switchOff}
                  accessibilityLabel="No limit on spots"
                />
              </View>
            </View>

            <View>
              <Text style={styles.monoLabel}>Who can see it</Text>
              <View style={styles.radioCards} accessibilityRole="radiogroup">
                {VISIBILITY_OPTIONS.map((option) => {
                  const on = visibility === option.key
                  return (
                    <Pressable
                      key={option.key}
                      onPress={() => setVisibility(option.key)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={`${option.title}, ${option.subtitle}`}
                      style={[styles.radioCard, on && styles.radioCardOn]}
                    >
                      <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
                      <View style={styles.radioText}>
                        <Text style={styles.radioTitle}>{option.title}</Text>
                        <Text style={styles.radioSubtitle}>{option.subtitle}</Text>
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            <View style={styles.approveRow}>
              <View style={styles.flex}>
                <Text style={styles.radioTitle}>Approve each person</Text>
                <Text style={styles.radioSubtitle}>Off means anyone can join instantly</Text>
              </View>
              <Switch
                value={requiresApproval}
                onValueChange={setRequiresApproval}
                trackColor={{ true: c.green, false: c.switchOff }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={c.switchOff}
                accessibilityLabel="Approve each person"
              />
            </View>
          </Frosted>
        </ScrollView>
      </BlurTargetView>

      {/* 6. Post bar, pinned to the bottom outside the scroll. */}
      <BlurView
        tint="light"
        intensity={30}
        blurTarget={blurTarget}
        blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
        style={[styles.postBar, { paddingBottom: Math.max(insets.bottom, 28) }]}
      >
        <Pressable
          onPress={post}
          disabled={!canPost}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canPost, busy }}
          accessibilityHint={title.trim() ? undefined : 'Add what the whim is first'}
          style={({ pressed }) => [styles.postButton, !canPost && styles.disabled, pressed && styles.pressed]}
        >
          <Text style={styles.postText}>{busy ? 'Posting…' : 'Post whim'}</Text>
        </Pressable>
      </BlurView>
    </View>
  )
}

const monoLabel = {
  fontFamily: fonts.spaceMonoBold,
  fontSize: 12,
  letterSpacing: 1.2,
  textTransform: 'uppercase' as const,
  color: c.ink,
  marginBottom: 10,
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.page },
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 18 },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
  icon20: { width: 20, height: 20 },
  icon18: { width: 18, height: 18 },
  monoLabel,

  // 1. Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  closeButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.spaceMonoBold, fontSize: 22, color: c.ink },
  titleOnDark: { color: c.brownText },

  // 2. What panel
  panel: { paddingVertical: 18, paddingHorizontal: 16, gap: 16 },
  field: {},
  optional: { fontFamily: fonts.spaceMono, color: c.secondary },
  input: {
    backgroundColor: c.field,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: c.ink,
  },
  titleInput: { fontFamily: fonts.spaceMonoBold, fontSize: 18 },
  descriptionInput: { fontFamily: fonts.interRegular, fontSize: 15, lineHeight: 22, minHeight: 22 * 3 + 28, textAlignVertical: 'top' },
  chipRow: { marginHorizontal: -16 },
  chips: { paddingHorizontal: 16, gap: 6 },
  chip: {
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: c.field,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipOn: { backgroundColor: c.brown, borderColor: c.brown },
  chipText: { fontFamily: fonts.interSemiBold, fontSize: 14, color: c.ink },
  chipTextOn: { color: c.brownText },

  // 3. Polaroid cover
  polaroidWrap: { alignItems: 'center', paddingVertical: 8 },
  polaroid: {
    backgroundColor: c.polaroid,
    padding: 10,
    paddingBottom: 14,
    borderRadius: 4,
    transform: [{ rotate: '-2deg' }],
    shadowColor: '#14201A',
    shadowOpacity: 0.25,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  cover: { width: 280, height: 220, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  coverEmpty: { borderWidth: 2, borderStyle: 'dashed', borderColor: c.coverDashed, backgroundColor: c.coverEmpty, gap: 6 },
  cameraIcon: { width: 30, height: 30, marginBottom: 4 },
  coverTitle: { fontFamily: fonts.interBold, fontSize: 15, color: c.secondary },
  coverHint: { fontFamily: fonts.interRegular, fontSize: 12, color: c.muted },
  coverCaption: { marginTop: 12, textAlign: 'center', fontFamily: fonts.spaceMono, fontSize: 13, color: '#4A4A44' },
  editCover: {
    position: 'absolute',
    right: -12,
    bottom: 34,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.brown,
    borderWidth: 3,
    borderColor: c.polaroid,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 4. Backdrop swatches
  backdropPanel: { paddingVertical: 12, paddingHorizontal: 14, gap: 0 },
  swatches: { gap: 12 },
  swatchItem: { width: 64, alignItems: 'center', gap: 6 },
  // Selected: 2pt brown ring outside a 3pt cream ring.
  swatchRing: { width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  swatchRingOn: { borderColor: c.brown },
  swatch: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchOn: { borderWidth: 3, borderColor: c.polaroid },
  swatchAdd: { backgroundColor: '#FFFFFF', borderStyle: 'dashed', borderColor: '#8A8F86' },
  swatchLabel: { fontFamily: fonts.interSemiBold, fontSize: 12, color: c.ink, textAlign: 'center' },

  // 5. Form panel
  form: { paddingVertical: 20, paddingHorizontal: 16, gap: 24 },
  segmented: {
    flexDirection: 'row',
    gap: 4,
    padding: 5,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.field,
  },
  segment: { flex: 1, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: c.green },
  segmentText: { fontFamily: fonts.interBold, fontSize: 14, color: c.secondary },
  segmentTextOn: { color: '#FFFFFF' },
  pickCard: { marginTop: 10, padding: 14, gap: 12, borderRadius: 18, backgroundColor: c.field },
  toggle: { flexDirection: 'row', padding: 4, borderRadius: 12, backgroundColor: c.page },
  toggleOption: { flex: 1, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  toggleOptionOn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#14201A',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  toggleText: { fontFamily: fonts.interSemiBold, fontSize: 14, color: c.muted },
  toggleTextOn: { color: c.ink },
  timeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  timeLabel: { width: 52, lineHeight: 50, fontFamily: fonts.interSemiBold, fontSize: 15, color: c.secondary },
  hint: { fontFamily: fonts.interRegular, fontSize: 13, color: c.muted },
  placeField: {
    height: 54,
    borderRadius: 18,
    backgroundColor: c.field,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  placeInput: { flex: 1, height: '100%', fontFamily: fonts.interRegular, fontSize: 16, color: c.ink },
  hereButton: { height: 44, marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 8 },
  hereText: { flex: 1, fontFamily: fonts.interSemiBold, fontSize: 15, color: c.green },
  spotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    backgroundColor: c.field,
    paddingVertical: 8,
    paddingRight: 8,
    paddingLeft: 16,
  },
  spotsLabel: { flex: 1, fontFamily: fonts.interRegular, fontSize: 15, color: c.secondary },
  stepButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  stepMinus: { backgroundColor: c.page },
  stepPlus: { backgroundColor: c.brown },
  spotsCount: { width: 30, textAlign: 'center', fontFamily: fonts.spaceMonoBold, fontSize: 22, color: c.ink },
  spotsInfinite: { fontFamily: fonts.interBold, fontSize: 26 },
  noLimitRow: { marginTop: 10, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noLimitLabel: { fontFamily: fonts.interSemiBold, fontSize: 15, color: c.ink },
  radioCards: { gap: 10 },
  radioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: c.border,
    backgroundColor: c.field,
  },
  radioCardOn: { borderColor: c.green },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: c.radioOff, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: c.green },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: c.green },
  radioText: { flex: 1, gap: 2 },
  radioTitle: { fontFamily: fonts.interBold, fontSize: 16, color: c.ink },
  radioSubtitle: { fontFamily: fonts.interRegular, fontSize: 13, color: c.muted },
  approveRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  // 6. Post bar
  postBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    paddingTop: 14,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(242,241,236,0.85)',
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  postButton: {
    height: 58,
    borderRadius: 29,
    backgroundColor: c.brown,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: c.brown,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  postText: { fontFamily: fonts.spaceMonoBold, fontSize: 17, color: c.brownText },
})
