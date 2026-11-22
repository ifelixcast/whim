// Edit profile: opened from "Edit profile" on the You tab.
// The brown ID card previews your changes live; the fields below edit name, username, bio and phone;
// the dashed box opens the interest picker. A new photo and the text fields save together on "Save changes".
import { ComponentRef, useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { BlurTargetView } from 'expo-blur'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { router, useFocusEffect } from 'expo-router'
import BottomBar from '../../components/BottomBar'
import GradientBackground from '../../components/GradientBackground'
import PrimaryButton from '../../components/PrimaryButton'
import ScreenHeader from '../../components/ScreenHeader'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { fonts, whimColors } from '../../lib/theme'

const BIO_MAX = 80

export default function EditProfile() {
  const { session } = useAuth()
  const userId = session?.user.id
  // The content the bottom bar blurs on Android.
  const blurTarget = useRef<ComponentRef<typeof View>>(null)

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  // The saved photo's URL, and a newly picked photo that's only uploaded when you press Save changes.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [pickedPhoto, setPickedPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [interests, setInterests] = useState<string[]>([])
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Fill the form with what's saved now.
  useEffect(() => {
    if (!userId) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (error) return Alert.alert('Could not load profile', error.message)
        setName(data.name ?? '')
        setUsername(data.username ?? '')
        setBio(data.bio ?? '')
        setPhone(data.phone ?? '')
        setAvatarUrl(data.avatar_url ?? null)
      })
  }, [userId])

  // Re-read interests whenever this screen comes back into view, so picks from the picker show up.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return
      supabase
        .from('profiles')
        .select('interests')
        .eq('id', userId)
        .single()
        .then(({ data }) => setInterests(data?.interests ?? []))
    }, [userId]),
  )

  // Picks a square photo and previews it on the card; nothing is uploaded until Save changes.
  async function changePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    })
    if (!result.canceled) setPickedPhoto(result.assets[0])
  }

  // Uploads the picked photo to avatars/<user id>/ and returns its public URL.
  async function uploadPhoto(photo: ImagePicker.ImagePickerAsset, id: string) {
    const contentType = photo.mimeType ?? 'image/jpeg'
    const extension = contentType.split('/')[1] ?? 'jpg'
    // A new file name each time, so the old photo isn't served from cache.
    const path = `${id}/avatar-${Date.now()}.${extension}`
    const file = await fetch(photo.uri).then((response) => response.arrayBuffer())
    const { error } = await supabase.storage.from('avatars').upload(path, file, { contentType })
    if (error) throw error
    return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
  }

  // Saves everything (uploading a newly picked photo first), then goes back to the profile.
  // A taken username shows under its field.
  async function save() {
    if (!userId) return
    setBusy(true)
    setUsernameError(null)

    // Only send avatar_url when there's a new photo, so an unchanged photo is left alone.
    let photoUpdate = {}
    if (pickedPhoto) {
      try {
        photoUpdate = { avatar_url: await uploadPhoto(pickedPhoto, userId) }
      } catch (uploadError) {
        setBusy(false)
        return Alert.alert('Could not upload photo', (uploadError as Error).message)
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        name: name.trim() || null,
        username: username.trim() || null,
        bio: bio.trim() || null,
        phone: phone.trim() || null,
        ...photoUpdate,
      })
      .eq('id', userId)
    setBusy(false)

    // 23505 = unique violation; username is the only unique field here.
    if (error?.code === '23505') setUsernameError('That username is taken. Try another.')
    else if (error) Alert.alert('Could not save profile', error.message)
    else router.back()
  }

  // TODO: deleting the auth user needs a server-side function (the app's key can't do it).
  function deleteAccount() {
    Alert.alert('Delete account?', 'This removes your profile and can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => Alert.alert('Delete account', 'Account deletion isn’t available yet.'),
      },
    ])
  }

  return (
    <View style={styles.screen}>
      <BlurTargetView ref={blurTarget} style={styles.screen}>
        <GradientBackground variant="edit" />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >
          <ScreenHeader title="Edit profile" />

          {/* A) Brown ID card: photo plus a live preview of name, username and bio. */}
          <View style={styles.idCard}>
            <Stars />
            <View>
              <View style={styles.photo}>
                {/* The newly picked photo (not saved yet), else the saved one, else the placeholder color. */}
                {pickedPhoto || avatarUrl ? (
                  <Image source={{ uri: pickedPhoto?.uri ?? avatarUrl! }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : null}
              </View>
              <Pressable
                onPress={changePhoto}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Change photo"
                style={[styles.cameraButton, busy && styles.dimmed]}
              >
                <Image source={require('../../assets/images/icons/camera.svg')} style={styles.cameraIcon} />
              </Pressable>
            </View>
            <View style={styles.idText}>
              <Text style={styles.idName} numberOfLines={1} adjustsFontSizeToFit>
                {name || 'Your name'}
              </Text>
              <Text style={styles.idHandle} numberOfLines={1}>
                @{username || 'username'}
              </Text>
              {bio ? <Text style={styles.idBio}>{bio}</Text> : null}
            </View>
          </View>

          {/* B) Details card: one row per field. */}
          <View style={styles.details}>
            <View style={styles.row}>
              <Text style={styles.label}>Name</Text>
              <TextInput value={name} onChangeText={setName} accessibilityLabel="Name" style={styles.input} />
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Username</Text>
              <View style={styles.usernameRow}>
                <Text style={styles.at}>@</Text>
                <TextInput
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text)
                    setUsernameError(null)
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Username"
                  style={[styles.input, styles.flex]}
                />
              </View>
              {usernameError ? (
                <Text style={styles.error} accessibilityLiveRegion="polite">
                  {usernameError}
                </Text>
              ) : null}
            </View>

            <View style={styles.row}>
              <View style={styles.bioLabelRow}>
                <Text style={styles.label}>Bio</Text>
                <Text style={styles.counter}>{`${bio.length}/${BIO_MAX}`}</Text>
              </View>
              <TextInput
                value={bio}
                onChangeText={setBio}
                multiline
                maxLength={BIO_MAX}
                accessibilityLabel="Bio"
                style={[styles.input, styles.bioInput]}
              />
            </View>

            <View style={[styles.row, styles.lastRow]}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+1 555-555-5555"
                placeholderTextColor="rgba(22,58,42,0.4)"
                accessibilityLabel="Phone"
                style={styles.input}
              />
            </View>
          </View>

          {/* C) Event interests: tap to open the picker. */}
          <Pressable
            onPress={() => router.push('/profile/interests')}
            accessibilityRole="button"
            accessibilityLabel={`Event interests, ${interests.length} picked. Edit`}
            style={styles.interestsBox}
          >
            <View style={styles.interestsColumn}>
              <Text style={styles.interestsTitle}>{`Event interests · ${interests.length}`}</Text>
              <View style={styles.pills}>
                {interests.length === 0 ? (
                  <Text style={styles.empty}>Pick what you’re into</Text>
                ) : (
                  interests.map((interest) => (
                    <Text key={interest} style={styles.pill}>
                      {interest}
                    </Text>
                  ))
                )}
              </View>
            </View>
            <Image source={require('../../assets/images/icons/chevron-right.svg')} style={styles.chevron} />
          </Pressable>

          {/* D) Delete account. */}
          <Pressable onPress={deleteAccount} accessibilityRole="button" style={styles.deleteButton}>
            <Text style={styles.deleteText}>Delete account</Text>
          </Pressable>
        </ScrollView>
      </BlurTargetView>

      <BottomBar blurTarget={blurTarget}>
        <PrimaryButton label="Save changes" onPress={save} busy={busy} />
      </BottomBar>
    </View>
  )
}

// Decorative star border around the ID card; hidden from screen readers.
function Stars() {
  const row = (count: number) => Array.from({ length: count }, (_, index) => <Text key={index} style={styles.star}>★</Text>)
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.starRow, { top: 10 }]}>{row(13)}</View>
      <View style={[styles.starRow, { bottom: 10 }]}>{row(13)}</View>
      <View style={[styles.starColumn, { left: 11 }]}>{row(7)}</View>
      <View style={[styles.starColumn, { right: 11 }]}>{row(7)}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  // Bottom padding keeps the last item clear of the bottom bar.
  content: { paddingHorizontal: 18, paddingBottom: 140 },

  // A) ID card
  idCard: {
    marginTop: 22,
    marginBottom: 20,
    backgroundColor: whimColors.brown,
    borderRadius: 26,
    paddingVertical: 40,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    shadowColor: whimColors.ink,
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  star: { color: whimColors.stars, fontSize: 15, lineHeight: 17 },
  starRow: { position: 'absolute', left: 22, right: 22, flexDirection: 'row', justifyContent: 'space-between' },
  starColumn: { position: 'absolute', top: 30, bottom: 30, justifyContent: 'space-between' },
  photo: {
    width: 104,
    height: 126,
    borderWidth: 3,
    borderColor: whimColors.brownText,
    backgroundColor: whimColors.photoPlaceholder,
    overflow: 'hidden',
  },
  cameraButton: {
    position: 'absolute',
    right: -14,
    bottom: -12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: whimColors.cream,
    borderWidth: 3,
    borderColor: whimColors.brown,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: { width: 20, height: 20 },
  dimmed: { opacity: 0.6 },
  idText: { flex: 1, gap: 6 },
  idName: { fontFamily: fonts.spaceMonoBold, fontSize: 26, color: whimColors.brownText },
  idHandle: { fontFamily: fonts.spaceMono, fontSize: 13, color: whimColors.brownSecondary },
  idBio: { fontFamily: fonts.interRegular, fontSize: 13, lineHeight: 18, color: whimColors.brownText, marginTop: 4 },

  // B) Details card
  details: {
    backgroundColor: whimColors.creamCard,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 4,
    shadowColor: whimColors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  row: { paddingVertical: 14, gap: 4, borderBottomWidth: 1, borderBottomColor: whimColors.divider },
  lastRow: { borderBottomWidth: 0 },
  label: { fontFamily: fonts.interSemiBold, fontSize: 13, color: whimColors.label },
  input: { fontFamily: fonts.interMedium, fontSize: 17, color: whimColors.ink, padding: 0 },
  usernameRow: { flexDirection: 'row', alignItems: 'center' },
  at: { fontFamily: fonts.interRegular, fontSize: 17, color: whimColors.label },
  error: { fontFamily: fonts.interSemiBold, fontSize: 13, color: whimColors.danger },
  bioLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  counter: { fontFamily: fonts.interRegular, fontSize: 12, color: whimColors.label },
  bioInput: { fontSize: 16, lineHeight: 23, textAlignVertical: 'top' },

  // C) Event interests box
  interestsBox: {
    marginTop: 14,
    backgroundColor: whimColors.glass,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: whimColors.dashed,
    borderRadius: 22,
    padding: 14,
    paddingLeft: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  interestsColumn: { flex: 1, gap: 10 },
  interestsTitle: { fontFamily: fonts.interSemiBold, fontSize: 13, color: whimColors.body },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: whimColors.cream,
    fontFamily: fonts.interSemiBold,
    fontSize: 14,
    color: whimColors.ink,
  },
  empty: { fontFamily: fonts.interMedium, fontSize: 14, color: whimColors.ink },
  chevron: { width: 22, height: 22 },

  // D) Delete account
  deleteButton: { marginTop: 22, height: 44, alignSelf: 'center', justifyContent: 'center' },
  deleteText: { fontFamily: fonts.interBold, fontSize: 15, color: whimColors.danger, textDecorationLine: 'underline' },
})
