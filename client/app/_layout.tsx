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
import { Fraunces_700Bold } from '@expo-google-fonts/fraunces'
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter'
import { Jost_700Bold } from '@expo-google-fonts/jost'
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono'
import { Gaegu_700Bold } from '@expo-google-fonts/gaegu'
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display'
import { AuthProvider, useAuth } from '../context/AuthContext'
import Splash from '../components/Splash'

// Keep the native splash up until the JS copy of it has drawn, so the hand-off is seamless.
SplashScreen.preventAutoHideAsync()

// Decides what to show: the splash while loading, then the right screens for the user.
function RootNavigator() {
  // session is null when logged out; loading is true until we know either way.
  const { session, loading, needsOnboarding } = useAuth()

  // Every font the app uses must be listed here, or text falls back to the system font.
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    IntelOneMono_400Regular,
    IntelOneMono_700Bold,
    Fraunces_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Jost_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
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
      {/* Just signed up: pick interests first. Swipe-back is off so it can't be dismissed. */}
      <Stack.Protected guard={!!session && needsOnboarding}>
        <Stack.Screen name="select-interests" options={{ gestureEnabled: false }} />
      </Stack.Protected>

      {/* Logged in and onboarded: the tab screens in app/(tabs), plus Edit profile, its interest
          picker, and the leaderboard (app/profile) opened on top of them. They draw their own header. */}
      <Stack.Protected guard={!!session && !needsOnboarding}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="profile/interests" />
        <Stack.Screen name="profile/leaderboard" />
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
