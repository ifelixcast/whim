// Map tab: Apple map centered on the user, with Apple pins for events,
// a full-map heat wash, the user's marker, and a popup when a pin is tapped.
import * as Location from 'expo-location'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import MapView, { Circle, Marker } from 'react-native-maps'
import { makeMockEvents, makeMockPeople, MapEvent, Point } from '../../lib/mockMapData'
import { colors } from '../../lib/theme'

const TEAL = '#0F7C7A'
const PAPER = '#F3F5F1'
const SHEET = '#FAFBF8'
const INK = '#14303A'
const MUTED = '#4E6670'
const LINE = '#D5DDD9'

// Heat color (#EEDC9A) as red, green, blue numbers.
const HEAT_RGB = '246, 38, 129'

// Your photo on the map. Paste an image link here, or leave it empty to show "You".
const MY_PHOTO_URL = ''

const DISTANCE_OPTIONS = [1, 5, 10]

// How zoomed in the map is. Smaller = closer in.
const ZOOM_FACTOR = 0.9

// HEAT SETTINGS (stronger than before, since #EEDC9A is a light color)
const WASH_OPACITY = 0.0 // light tint over the whole map
const WASH_RADIUS_METERS = 50_000
const CROWD_RADIUS_METERS = 350 // people this close together count as one crowd
const GLOW_LAYERS = 28 // more = smoother fade
const GLOW_BASE_SIZE = 600 // meters
const GLOW_GROWTH = 110 // how much bigger a glow gets as its crowd grows
const GLOW_MIN_OPACITY = 0.03 // each layer, smallest crowd
const GLOW_EXTRA_OPACITY = 0.045 // added for the biggest crowd

// Used only if the user says no to location: a zoomed-out view of the US.
const FALLBACK_REGION = {
  latitude: 39.5,
  longitude: -98.35,
  latitudeDelta: 30,
  longitudeDelta: 30,
}

type Crowd = { center: Point; count: number }

// How far to zoom for a given distance setting.
function regionForRadius(center: Point, miles: number) {
  const latitudeDelta = (miles * ZOOM_FACTOR) / 69 // about 69 miles per degree of latitude
  const longitudeDelta = latitudeDelta / Math.cos((center.latitude * Math.PI) / 180)
  return { ...center, latitudeDelta, longitudeDelta }
}

// Rough distance between two points, in meters (fine for short distances).
function metersBetween(a: Point, b: Point) {
  const dLat = (a.latitude - b.latitude) * 111_000
  const dLng = (a.longitude - b.longitude) * 111_000 * Math.cos((a.latitude * Math.PI) / 180)
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

// Group nearby people into crowds.
function makeCrowds(people: Point[]): Crowd[] {
  const crowds: Crowd[] = []
  for (const person of people) {
    const nearby = crowds.find((crowd) => metersBetween(crowd.center, person) < CROWD_RADIUS_METERS)
    if (nearby) {
      nearby.count += 1
      nearby.center = {
        latitude: nearby.center.latitude + (person.latitude - nearby.center.latitude) / nearby.count,
        longitude: nearby.center.longitude + (person.longitude - nearby.center.longitude) / nearby.count,
      }
    } else {
      crowds.push({ center: person, count: 1 })
    }
  }
  return crowds.filter((crowd) => crowd.count >= 3)
}

export default function MapScreen() {
  const mapRef = useRef<MapView>(null)
  const [showHeat, setShowHeat] = useState(true)
  const [miles, setMiles] = useState(5)
  const [userLocation, setUserLocation] = useState<Point | null>(null)
  const [initialRegion, setInitialRegion] = useState<typeof FALLBACK_REGION | null>(null)
  const [crowds, setCrowds] = useState<Crowd[]>([])
  const [events, setEvents] = useState<MapEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null)

  // When the screen opens: ask for location, center the map, load events and heat.
  useEffect(() => {
    async function centerOnUser() {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setInitialRegion(FALLBACK_REGION)
        return
      }
      // Use the last known location first (instant), then fall back to a fresh one.
      const position =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }))
      const here = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }
      setUserLocation(here)
      setInitialRegion(regionForRadius(here, miles))
      setCrowds(makeCrowds(makeMockPeople(here))) // FAKE people (see lib/mockMapData.ts)
      setEvents(makeMockEvents(here)) // FAKE events (see lib/mockMapData.ts)
    }
    centerOnUser()
  }, [])

  // Pick a distance: update it and zoom the map to fit.
  function chooseDistance(newMiles: number) {
    setMiles(newMiles)
    if (userLocation) {
      mapRef.current?.animateToRegion(regionForRadius(userLocation, newMiles), 400)
    }
  }

  // Show a spinner until we know where to center.
  if (!initialRegion) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    )
  }

  const biggestCrowd = Math.max(1, ...crowds.map((crowd) => crowd.count))

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onPress={(e) => {
          // Tapping empty map closes the popup (taps on pins are ignored here).
          if (e.nativeEvent.action !== 'marker-press') setSelectedEvent(null)
        }}
      >
        {/* Heat, part 1: a light tint over the whole map */}
        {userLocation && (
          <Circle
            key="wash"
            center={userLocation}
            radius={WASH_RADIUS_METERS}
            fillColor={showHeat ? `rgba(${HEAT_RGB}, ${WASH_OPACITY})` : 'transparent'}
            strokeColor="transparent"
            strokeWidth={0}
          />
        )}

        {/* Heat, part 2: deeper color around busy areas.
            Circles always stay on the map; when Heat is off they just turn invisible. */}
        {crowds.flatMap((crowd, crowdIndex) => {
          const strength = crowd.count / biggestCrowd // 0 to 1
          const outerRadius = GLOW_BASE_SIZE + Math.sqrt(crowd.count) * GLOW_GROWTH
          const layerOpacity = GLOW_MIN_OPACITY + strength * GLOW_EXTRA_OPACITY
          return Array.from({ length: GLOW_LAYERS }, (_, layer) => {
            const step = layer / GLOW_LAYERS // 0 (outside) to almost 1 (center)
            return (
              <Circle
                key={`glow-${crowdIndex}-${layer}`}
                center={crowd.center}
                radius={outerRadius * (1 - step) * (1 - step)}
                fillColor={showHeat ? `rgba(${HEAT_RGB}, ${layerOpacity})` : 'transparent'}
                strokeColor="transparent"
                strokeWidth={0}
              />
            )
          })
        })}

        {/* Event pins: regular Apple map pins. Tap one to open the popup. */}
        {events.map((event) => (
          <Marker
            key={event.id}
            coordinate={{ latitude: event.latitude, longitude: event.longitude }}
            onPress={() => setSelectedEvent(event)}
          />
        ))}

        {/* You */}
        {userLocation && (
          <Marker key="you" coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.youRing}>
              {MY_PHOTO_URL ? (
                <Image source={{ uri: MY_PHOTO_URL }} style={styles.youPhoto} />
              ) : (
                <View style={[styles.youPhoto, styles.youPlaceholder]}>
                  <Text style={styles.youText}>You</Text>
                </View>
              )}
            </View>
          </Marker>
        )}
      </MapView>

      {/* Distance picker (top left) */}
      <View style={styles.distancePicker}>
        {DISTANCE_OPTIONS.map((option) => {
          const isActive = option === miles
          return (
            <Pressable
              key={option}
              onPress={() => chooseDistance(option)}
              style={[styles.distanceOption, isActive && styles.distanceOptionActive]}
              accessibilityLabel={`Show events within ${option} miles`}
            >
              <Text style={[styles.distanceText, isActive && styles.distanceTextActive]}>
                {option} mi
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Heat switch (top right) */}
      <View style={styles.heatControl}>
        <Text style={styles.heatLabel}>Heat</Text>
        <Switch
          value={showHeat}
          onValueChange={setShowHeat}
          trackColor={{ true: TEAL, false: LINE }}
        />
      </View>

      {/* Event popup (blank for now) */}
      {selectedEvent && (
        <View style={styles.popup}>
          <View style={styles.popupTop}>
            <Text style={styles.popupTitle}>{selectedEvent.title}</Text>
            <Pressable
              onPress={() => setSelectedEvent(null)}
              hitSlop={12}
              accessibilityLabel="Close event details"
            >
              <Text style={styles.popupClose}>✕</Text>
            </Pressable>
          </View>
          {/* TODO: event details, join button, etc. */}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  youRing: {
    padding: 2,
    backgroundColor: PAPER,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: INK,
  },
  youPhoto: { width: 36, height: 36, borderRadius: 18 },
  youPlaceholder: { backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
  youText: { color: PAPER, fontSize: 11, fontWeight: '600' },

  distancePicker: {
    position: 'absolute',
    top: 60,
    left: 12,
    flexDirection: 'row',
    backgroundColor: SHEET,
    borderColor: LINE,
    borderWidth: 1,
    borderRadius: 3,
    padding: 3,
  },
  distanceOption: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 2 },
  distanceOptionActive: { backgroundColor: INK },
  distanceText: { color: MUTED, fontSize: 13, fontWeight: '500' },
  distanceTextActive: { color: PAPER, fontWeight: '600' },

  heatControl: {
    position: 'absolute',
    top: 60,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: SHEET,
    borderColor: LINE,
    borderWidth: 1,
    borderRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  heatLabel: { color: INK, fontSize: 13, fontWeight: '500' },

  popup: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 16,
    minHeight: 140,
    backgroundColor: SHEET,
    borderColor: LINE,
    borderWidth: 1,
    borderRadius: 4,
    padding: 14,
  },
  popupTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  popupTitle: { color: INK, fontSize: 18, fontWeight: '600', flexShrink: 1 },
  popupClose: { color: MUTED, fontSize: 18 },
})