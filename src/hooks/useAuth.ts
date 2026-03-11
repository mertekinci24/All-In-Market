import { useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/* -----------------------------------------------------------------------
 * V1.4.4: Extension Auth Bridge
 * -----------------------------------------------------------------------
 * syncSessionToExtension: sends Supabase session to the Chrome extension.
 * This is the MISSING LINK that was causing "Oturum süresi doldu" errors.
 * The extension stores the token in chrome.storage.local for API calls.
 *
 * Setup: Add VITE_EXTENSION_ID=<your extension id> to your .env file.
 * Find your extension ID at chrome://extensions (developer mode).
 * ----------------------------------------------------------------------- */
const EXTENSION_ID = import.meta.env.VITE_EXTENSION_ID as string | undefined

function sendExtensionMessage(message: object, retryCount = 0): void {
  try {
    const extId = EXTENSION_ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cr = (window as any).chrome
    if (!extId || !cr?.runtime?.sendMessage) return

    cr.runtime.sendMessage(extId, message, (response: unknown) => {
      const lastError = (cr.runtime as { lastError?: { message: string } }).lastError
      if (lastError) {
        const errMsg = lastError.message ?? ''
        // "Receiving end does not exist" = Service Worker sleeping or not yet loaded.
        // Retry up to 5 times with exponential backoff (2s, 4s, 8s, 16s, 32s) to handle cold-start latency on slow devices.
        if (errMsg.includes('Receiving end') && retryCount < 5) {
          const delay = Math.pow(2, retryCount + 1) * 1000 // 2s, 4s, 8s, 16s, 32s
          console.warn(`[Sky Dashboard] Extension not ready, retrying in ${delay}ms... (attempt ${retryCount + 1}/5)`)
          setTimeout(() => sendExtensionMessage(message, retryCount + 1), delay)
        } else {
          console.warn('[Sky Dashboard] Extension not reachable after 5 retries:', errMsg)
        }
      } else {
        console.log('[Sky Dashboard] Extension sync ✓', (message as Record<string, unknown>).type, '← Response:', response)
      }
    })
  } catch {
    // Dashboard must never crash because of extension sync failure
  }
}

function syncSessionToExtension(session: Session): void {
  if (!session.access_token || !session.refresh_token) return

  // V1.5.0: Send Supabase credentials to extension for secure storage
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

  sendExtensionMessage({
    type: 'AUTH_TOKEN',
    payload: {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
      userId: session.user.id,
      supabaseUrl,
      supabaseAnonKey,
    }
  })
}

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

export function useAuth(): AuthState & {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
} {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ user: session?.user ?? null, session, loading: false })
      // V1.4.4: Sync existing session to extension on mount (handles page refresh case)
      if (session) syncSessionToExtension(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setState({ user: session?.user ?? null, session, loading: false })

      // V1.4.4 Cross-Domain Auth Sync: push token to Chrome Extension on every auth change.
      // This is the ONLY bridge between the Dashboard (web app) and the Extension.
      // Without this, the extension has no way to know a new session was established.
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session) syncSessionToExtension(session)
      } else if (event === 'SIGNED_OUT') {
        sendExtensionMessage({ type: 'FORCE_LOGOUT', payload: { reason: 'dashboard_signout' } })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error as Error | null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { ...state, signIn, signUp, signOut }
}
