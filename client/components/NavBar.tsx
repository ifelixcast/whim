// Custom bottom tab bar: Home, Map, the orange + (create activity), Inbox, You.
// A white rounded bar floating above the bottom edge; screens scroll underneath it.
// Used by app/(tabs)/_layout.tsx. Tab labels come from each screen's `title` option there.
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import type { BottomTabBarProps } from 'expo-router/tabs'
import { fonts, tabColors } from '../lib/theme'

// Single-color outline icons, tinted per state.
const ICONS: Record<string, number> = {
  index: require('../assets/images/tabs/home.svg'),
  map: require('../assets/images/tabs/map.svg'),
  inbox: require('../assets/images/tabs/inbox.svg'),
  profile: require('../assets/images/tabs/you.svg'),
}

// Keys are route (file) names in app/(tabs).
// The middle route (app/(tabs)/create-activity.tsx) is drawn as the raised orange + button.
const CREATE_ACTIVITY_ROUTE = 'create-activity'

// Expo Router passes in the tab routes (state), each screen's options (descriptors),
// a function to switch tabs, and the safe-area sizes (insets).
export default function NavBar({ state, descriptors, navigateToTab, insets }: BottomTabBarProps) {
  return (
    // Floats 16pt above the home indicator / bottom edge.
    <View style={[styles.bar, { bottom: 16 + insets.bottom }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]
        // Only routes with an icon (plus the create activity button) get a tab.
        if (!(route.name in ICONS) && route.name !== CREATE_ACTIVITY_ROUTE) return null

        // Is this the tab you're on, and what text goes under its icon.
        const focused = state.index === index
        const label = options.title ?? route.name

        // Switch tabs (tapping the tab you're already on does nothing).
        function onPress() {
          if (!focused) navigateToTab(route.key)
        }

        // The orange + (create activity) button: no label, raised above the bar.
        // It opens the New whim screen (app/create.tsx) as a modal instead of switching tabs.
        if (route.name === CREATE_ACTIVITY_ROUTE) {
          return (
            <View key={route.key} style={styles.tab}>
              <Pressable
                onPress={() => router.push('/create')}
                accessibilityRole="button"
                accessibilityLabel="Create activity"
                accessibilityState={{ selected: focused }}
                style={({ pressed }) => [styles.createActivityButton, pressed && styles.pressed]}
              >
                <Image
                  source={require('../assets/images/tabs/create-activity-plus.svg')}
                  tintColor="#FFFFFF"
                  style={styles.createActivityIcon}
                />
              </Pressable>
            </View>
          )
        }

        // A normal tab: icon above label, dark teal when selected and grey otherwise.
        const color = focused ? tabColors.active : tabColors.inactive
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: focused }}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <Image source={ICONS[route.name]} tintColor={color} style={styles.icon} />
            <Text style={[styles.label, { color }]}>{label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 74,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    backgroundColor: tabColors.bar,
    shadowColor: tabColors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  // One tab slot: the full bar height, so every tab is well over 44pt tall.
  tab: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: 4 },
  icon: { width: 24, height: 24 },
  label: { fontFamily: fonts.interSemiBold, fontSize: 12, textAlign: 'center' },
  // + create button, raised above the bar.
  createActivityButton: {
    width: 64,
    height: 64,
    marginTop: -36,
    borderRadius: 24,
    backgroundColor: tabColors.createActivity,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: tabColors.createActivity,
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  createActivityIcon: { width: 30, height: 30 },
  // Slight fade while a button is being pressed.
  pressed: { opacity: 0.7 },
})
