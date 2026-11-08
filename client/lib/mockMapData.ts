// FAKE data for building the map before the database is ready.
// Delete this file once real events and shared locations exist.

export type Point = { latitude: number; longitude: number }

export type EventCategory = 'sports' | 'study' | 'shopping' | 'food' | 'music'

export type MapEvent = {
  id: string
  title: string
  category: EventCategory
  latitude: number
  longitude: number
}

// A few crowds of fake people around a center point (for the heat map).
export function makeMockPeople(center: Point): Point[] {
  const crowds = [
    { lat: 0.004, lng: 0.003, size: 60 },
    { lat: -0.005, lng: -0.004, size: 25 },
    { lat: 0.001, lng: -0.007, size: 12 },
  ]
  const people: Point[] = []
  for (const crowd of crowds) {
    for (let i = 0; i < crowd.size; i++) {
      people.push({
        latitude: center.latitude + crowd.lat + (Math.random() - 0.5) * 0.004,
        longitude: center.longitude + crowd.lng + (Math.random() - 0.5) * 0.004,
      })
    }
  }
  return people
}

// Fake events placed around a center point, like things users would post.
export function makeMockEvents(center: Point): MapEvent[] {
  const events = [
    { title: 'Pickup basketball, need 2 more', category: 'sports', lat: 0.0045, lng: 0.0025 },
    { title: 'Study session, come through', category: 'study', lat: -0.003, lng: 0.006 },
    { title: 'Thrift swap', category: 'shopping', lat: -0.0055, lng: -0.0045 },
    { title: 'Late night food run', category: 'food', lat: 0.0015, lng: -0.0065 },
    { title: 'Open mic tonight', category: 'music', lat: 0.007, lng: -0.002 },
  ] as const

  return events.map((event, index) => ({
    id: String(index + 1),
    title: event.title,
    category: event.category,
    latitude: center.latitude + event.lat,
    longitude: center.longitude + event.lng,
  }))
}