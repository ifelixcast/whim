// The orange + tab's route. The tab bar opens the New whim modal (app/create.tsx) directly,
// so this only runs if someone lands on /create-activity some other way; it sends them there too.
import { Redirect } from 'expo-router'

export default function CreateActivity() {
  return <Redirect href="/create" />
}
