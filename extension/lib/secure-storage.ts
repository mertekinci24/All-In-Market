/* ------------------------------------------------------------------ */
/*  Secure Storage - Chrome Extension Key Management                  */
/*  Credentials are injected at runtime via Dashboard, not bundled    */
/* ------------------------------------------------------------------ */

export interface SupabaseCredentials {
    url: string
    anonKey: string
}

const STORAGE_KEY = 'sky_supabase_credentials'

/**
 * Store Supabase credentials securely in chrome.storage.sync
 * @param credentials - Supabase URL and anon key
 */
export async function storeCredentials(credentials: SupabaseCredentials): Promise<void> {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.set({ [STORAGE_KEY]: credentials }, () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError)
            } else {
                console.log('[SKY Storage] Credentials stored securely')
                resolve()
            }
        })
    })
}

/**
 * Retrieve Supabase credentials from chrome.storage.sync
 * @returns Credentials or null if not configured
 */
export async function getCredentials(): Promise<SupabaseCredentials | null> {
    return new Promise((resolve) => {
        chrome.storage.sync.get([STORAGE_KEY], (result) => {
            if (chrome.runtime.lastError) {
                console.error('[SKY Storage] Error retrieving credentials:', chrome.runtime.lastError)
                resolve(null)
            } else {
                const creds = result[STORAGE_KEY] as SupabaseCredentials | undefined
                resolve(creds || null)
            }
        })
    })
}

/**
 * Check if credentials are configured
 * @returns true if credentials exist
 */
export async function hasCredentials(): Promise<boolean> {
    const creds = await getCredentials()
    return creds !== null && creds.url !== '' && creds.anonKey !== ''
}

/**
 * Clear stored credentials (for logout/reset)
 */
export async function clearCredentials(): Promise<void> {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.remove([STORAGE_KEY], () => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError)
            } else {
                console.log('[SKY Storage] Credentials cleared')
                resolve()
            }
        })
    })
}

/**
 * Fallback credentials for development/testing only
 * In production, these should NEVER be used
 */
export function getFallbackCredentials(): SupabaseCredentials {
    // These will be empty in production bundle
    return {
        url: '',
        anonKey: ''
    }
}
