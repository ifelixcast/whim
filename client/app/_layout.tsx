// Root layout: wraps every screen in the app.
// It loads fonts, keeps the splash screen up while the app starts, and decides which
// screens you can reach depending on whether you're logged in.
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  useFonts,
} from '@expo-google-fonts/bricolage-grotesque'
import { IntelOneMono_400Regular, IntelOneMono_700Bold } from '@expo-google-fonts/intel-one-mono'
import { Inter_700Bold } from '@expo-google-fonts/inter'
import { Gaegu_700Bold } from '@expo-google-fonts/gaegu'
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display'
import { AuthProvider, useAuth } from '../context/AuthContext'
import Splash from '../components/Splash'

// Keep the native splash up until the JS copy of it has drawn, so the hand-off is seamless.
SplashScreen.preventAutoHideAsync()

// Decides what to show: the splash while loading, then the right screens for the user.
function RootNavigator() {
  // session is null when logged out; loading is true until we know either way.
  const { session, loading } = useAuth()

  // Every font the app uses must be listed here, or text falls back to the system font.
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    IntelOneMono_400Regular,
    IntelOneMono_700Bold,
    Inter_700Bold,
    // Scrapbook text styles.
    Gaegu_700Bold,
    DMSerifDisplay_400Regular,
  })

  // Still starting up: show the splash, then hide the native one once ours has drawn.
  if (loading || !fontsLoaded) {
    return <Splash onLayout={() => SplashScreen.hide()} />
  }

  // Ready: each Stack.Protected group is only reachable while its `guard` is true.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Logged in: the tab screens in app/(tabs), plus Edit profile and Scrapbook opened on top of them. */}
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="edit-profile" options={{ headerShown: true, title: 'Edit profile', headerBackTitle: 'Back' }} />
        {/* Scrapbook: the list of pages (opened from the You tab), and the page editor. */}
        <Stack.Screen
          name="scrapbook/index"
          options={{ headerShown: true, title: 'Scrapbook', headerBackTitle: 'Back', headerShadowVisible: false }}
        />
        <Stack.Screen
          name="scrapbook/[eventId]"
          options={{ headerShown: true, title: 'Your page', headerBackTitle: 'Scrapbook', headerShadowVisible: false }}
        />
      </Stack.Protected>

      {/* Logged out: only the sign-in screen */}
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  )
}

// AuthProvider must wrap the navigator so useAuth() works on every screen.
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  )
}
