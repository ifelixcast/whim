// A white button showing a time ("06:00 PM") that opens the phone's time picker.
// Android: the system clock dialog. iOS: a wheel that opens under the button; tap again to close it.
import { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { fonts } from '../lib/theme'

type Props = {
  value: Date
  onChange: (next: Date) => void
  accessibilityLabel: string
}

// "06:00 PM", zero-padded so the digits line up.
export function formatTime(date: Date) {
  const hours = date.getHours() % 12 || 12
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${String(hours).padStart(2, '0')}:${minutes} ${date.getHours() < 12 ? 'AM' : 'PM'}`
}

export default function TimeButton({ value, onChange, accessibilityLabel }: Props) {
  const [open, setOpen] = useState(false)

  function press() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value, mode: 'time', onValueChange: (_event, date) => onChange(date) })
    } else {
      setOpen((isOpen) => !isOpen)
    }
  }

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={press}
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel}, ${formatTime(value)}`}
        accessibilityState={{ expanded: Platform.OS === 'ios' ? open : undefined }}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.time}>{formatTime(value)}</Text>
      </Pressable>
      {open && Platform.OS === 'ios' ? (
        <DateTimePicker value={value} mode="time" display="spinner" onValueChange={(_event, date) => onChange(date)} />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  button: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2DED5',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  time: { fontFamily: fonts.spaceMonoBold, fontSize: 16, color: '#1C2420' },
  pressed: { opacity: 0.75 },
})
