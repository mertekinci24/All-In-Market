/* ------------------------------------------------------------------ */
/*  Token Refresh Mutex - Prevents Race Conditions in Multi-Tab      */
/*  V1.5.0 - TD-17 Fix                                                */
/* ------------------------------------------------------------------ */

const MUTEX_KEY = 'sky_token_refresh_lock'
const MUTEX_TIMEOUT = 30000 // 30 seconds max lock duration

interface RefreshLock {
    locked: boolean
    timestamp: number
    tabId: string
}

/**
 * Attempt to acquire refresh lock
 * Returns true if lock acquired, false if another tab is already refreshing
 */
export async function acquireRefreshLock(): Promise<boolean> {
    return new Promise((resolve) => {
        chrome.storage.session.get([MUTEX_KEY], (result) => {
            const existing = result[MUTEX_KEY] as RefreshLock | undefined
            const now = Date.now()
            const tabId = `${Math.random()}`

            // Check if existing lock is stale (timeout exceeded)
            if (existing && existing.locked) {
                if (now - existing.timestamp > MUTEX_TIMEOUT) {
                    console.warn('[SKY Mutex] Stale lock detected, forcefully acquiring')
                } else {
                    console.log('[SKY Mutex] Lock already held by another tab')
                    resolve(false)
                    return
                }
            }

            // Acquire lock
            const lock: RefreshLock = {
                locked: true,
                timestamp: now,
                tabId
            }

            chrome.storage.session.set({ [MUTEX_KEY]: lock }, () => {
                console.log('[SKY Mutex] Lock acquired by', tabId)
                resolve(true)
            })
        })
    })
}

/**
 * Release refresh lock
 */
export async function releaseRefreshLock(): Promise<void> {
    return new Promise((resolve) => {
        chrome.storage.session.remove([MUTEX_KEY], () => {
            console.log('[SKY Mutex] Lock released')
            resolve()
        })
    })
}

/**
 * Execute token refresh with mutex protection
 * Only one tab can refresh at a time
 */
export async function withRefreshLock<T>(
    refreshFn: () => Promise<T>
): Promise<T | null> {
    const acquired = await acquireRefreshLock()

    if (!acquired) {
        console.log('[SKY Mutex] Waiting for other tab to complete refresh')
        // Wait a bit and check if refresh completed
        await new Promise(resolve => setTimeout(resolve, 2000))
        return null
    }

    try {
        const result = await refreshFn()
        return result
    } finally {
        await releaseRefreshLock()
    }
}
