// The one Supabase client the whole app uses to talk to the database and auth.
// URL and key come from .env (EXPO_PUBLIC_ variables are bundled into the app; that's
// fine for the publishable key because Row Level Security protects the data).
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { AppState, Platform } from 'react-native'

// Read from .env; the ! tells TypeScript these are always set.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

// Create the client. The auth options keep users logged in between app launches.
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    // On web, let Supabase pick its own storage: localStorage in the browser, memory during
    // static rendering on the server (where AsyncStorage crashes because there is no window).
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage as any } : {}),
    // Refresh the login token automatically, save the session, and don't look for login
    // info in the URL (that's only for web sign-in links).
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Only refresh the auth token while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})
