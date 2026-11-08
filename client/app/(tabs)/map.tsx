// Map tab: Apple map centered on the user, with event pins,
// a full-map heat wash, and the user's photo at their location.
import * as Location from 'expo-location'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Image, Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import MapView, { Circle, Marker } from 'react-native-maps'
import { EventCategory, makeMockEvents, makeMockPeople, MapEvent, Point } from '../../lib/mockMapData'
import { colors } from '../../lib/theme'

const TEAL = '#0F7C7A'
const PAPER = '#F3F5F1'
const SHEET = '#FAFBF8'
const INK = '#14303A'
const MUTED = '#4E6670'
const LINE = '#D5DDD9'

// Your photo on the map. Paste an image link here, or leave it empty to show "You".
const MY_PHOTO_URL = ''

const DISTANCE_OPTIONS = [1, 5, 10]

// How zoomed in the map is. Smaller = closer in.
const ZOOM_FACTOR = 0.9

// HEAT SETTINGS
const WASH_OPACITY = 0.08
const WASH_RADIUS_METERS = 50_000
const CROWD_RADIUS_METERS = 350
const GLOW_LAYERS = 18
const GLOW_BASE_SIZE = 450
const GLOW_GROWTH = 110

const FALLBACK_REGION = {
  latitude: 39.5,
  longitude: -98.35,
  latitudeDelta: 30,
  longitudeDelta: 30,
}

// Short label on each pin (stand-in for icons for now).
const PIN_LABELS: Record<EventCategory, string> = {
  sports: 'Ball',
  study: 'Study',
  shopping: 'Swap',
  food: 'Food',
  music: 'Mic',
}

type Crowd = { center: Point; count: number }

function regionForRadius(center: Point, miles: number) {
  const latitudeDelta = (miles * ZOOM_FACTOR) / 69
  const longitudeDelta = latitudeDelta / Math.cos((center.latitude * Math.PI) / 180)
  return { ...center, latitudeDelta, longitudeDelta }
}

function metersBetween(a: Point, b: Point) {
  const dLat = (a.latitude - b.latitude) * 111_000
  const dLng = (a.longitude - b.longitude) * 111_000 * Math.cos((a.latitude * Math.PI) / 180)
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

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

  useEffect(() => {
    async function centerOnUser() {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        setInitialRegion(FALLBACK_REGION)
        return
      }
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

  function chooseDistance(newMiles: number) {
    setMiles(newMiles)
    if (userLocation) {
      mapRef.current?.animateToRegion(regionForRadius(userLocation, newMiles), 400)
    }
  }

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
      <MapView ref={mapRef} style={styles.map} initialRegion={initialRegion}>
        {userLocation && (
          <Circle
            key="wash"
            center={userLocation}
            radius={WASH_RADIUS_METERS}
            fillColor={showHeat ? `rgba(15, 124, 122, ${WASH_OPACITY})` : 'transparent'}
            strokeColor="transparent"
            strokeWidth={0}
          />
        )}

        {crowds.flatMap((crowd, crowdIndex) => {
          const strength = crowd.count / biggestCrowd
          const outerRadius = GLOW_BASE_SIZE + Math.sqrt(crowd.count) * GLOW_GROWTH
          const layerOpacity = 0.015 + strength * 0.02
          return Array.from({ length: GLOW_LAYERS }, (_, layer) => {
            const step = layer / GLOW_LAYERS
            return (
              <Circle
                key={`glow-${crowdIndex}-${layer}`}
                center={crowd.center}
                radius={outerRadius * Math.sqrt(1 - step)}
                fillColor={showHeat ? `rgba(15, 124, 122, ${layerOpacity})` : 'transparent'}
                strokeColor="transparent"
                strokeWidth={0}
              />
            )
          })
        })}

        {events.map((event) => (
          <Marker
            key={event.id}
            coordinate={{ latitude: event.latitude, longitude: event.longitude }}
            title={event.title}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.eventPin}>
              <Text style={styles.pinLabel}>{PIN_LABELS[event.category]}</Text>
            </View>
          </Marker>
        ))}

        {userLocation && (
          <Marker key="you" coordinate={userLocation} anchor={{ x: 0.5, y: 0.5 }} title="You">
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

      <View style={styles.heatControl}>
        <Text style={styles.heatLabel}>Heat</Text>
        <Switch
          value={showHeat}
          onValueChange={setShowHeat}
          trackColor={{ true: TEAL, false: LINE }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  map: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  eventPin: {
    backgroundColor: TEAL,
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: PAPER,
  },
  pinLabel: { color: PAPER, fontSize: 11, fontWeight: '700' },

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
})