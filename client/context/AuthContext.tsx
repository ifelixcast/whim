// Keeps track of who is logged in, for the whole app.
// Any screen can call useAuth() to get the current Supabase session (null when logged out),
// and whether that person still needs to see the "pick your interests" screen.
import { Session } from '@supabase/supabase-js'
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// What useAuth() gives you.
type AuthContextValue = {
  session: Session | null
  loading: boolean
  // True when logged in but they haven't finished or skipped the interests screen yet.
  needsOnboarding: boolean
  // Re-reads the onboarding flag; call after saving interests so the app moves on.
  refreshProfile: () => Promise<void>
}

// The shared "box" that holds the value; starts as logged out and still loading.
const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  needsOnboarding: false,
  refreshProfile: async () => {},
})

// Wrap the app in this (see client/app/_layout.tsx) so every screen can read the session.
export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  // Remembers which user the flag belongs to, so a different login never reuses a stale answer.
  const [onboarding, setOnboarding] = useState<{ userId: string; done: boolean } | null>(null)

  useEffect(() => {
    // On start-up: read any session saved from last time.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })

    // Afterwards: update whenever the user signs in or out, or the token refreshes.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    // Stop listening if the provider is ever removed.
    return () => subscription.unsubscribe()
  }, [])

  const userId = session?.user.id

  // Reads onboarding_completed for the logged-in user. If the read fails (or the column
  // doesn't exist yet), treat them as done so they're never stuck on the interests screen.
  const refreshProfile = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase.from('profiles').select('onboarding_completed').eq('id', userId).maybeSingle()
    setOnboarding({ userId, done: error ? true : (data?.onboarding_completed ?? true) })
  }, [userId])

  // Whenever the logged-in user changes, look up their onboarding flag.
  useEffect(() => {
    if (!userId) return
    supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        setOnboarding({ userId, done: error ? true : (data?.onboarding_completed ?? true) })
      })
  }, [userId])

  // Still loading while we don't know the session, or while we're fetching the profile for it.
  const onboardingDone = onboarding && onboarding.userId === userId ? onboarding.done : null
  const loading = sessionLoading || (!!session && onboardingDone === null)

  return (
    <AuthContext.Provider value={{ session, loading, needsOnboarding: onboardingDone === false, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

// Call this in any screen: const { session, loading, needsOnboarding } = useAuth()
export function useAuth() {
  return useContext(AuthContext)
}
