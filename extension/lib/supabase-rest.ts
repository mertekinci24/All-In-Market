/* ------------------------------------------------------------------ */
/*  Lightweight Supabase REST Client (no SDK dependency)               */
/*  Used in Service Worker for chrome extension                        */
/* ------------------------------------------------------------------ */

interface SupabaseConfig {
    url: string
    anonKey: string
    accessToken: string
}

interface RestResult<T = unknown> {
    data: T | null
    error: string | null
    status: number
}

/**
 * Insert a row into a Supabase table via REST API.
 */
export async function insertRow(
    table: string,
    row: Record<string, unknown>,
    config: SupabaseConfig,
): Promise<RestResult> {
    const endpoint = `${config.url}/rest/v1/${table}`

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.anonKey,
                'Authorization': `Bearer ${config.accessToken}`,
                'Prefer': 'return=representation',
            },
            body: JSON.stringify(row),
        })

        if (!res.ok) {
            const body = await res.text()
            return { data: null, error: `${res.status}: ${body}`, status: res.status }
        }

        const data = await res.json()
        return { data, error: null, status: res.status }
    } catch (err) {
        return { data: null, error: (err as Error).message, status: 0 }
    }
}

/**
 * Select rows from a Supabase table via REST API.
 */
export async function selectRows(
    table: string,
    query: string,            // e.g. "name=eq.foo&select=id,name"
    config: SupabaseConfig,
): Promise<RestResult<unknown[]>> {
    const endpoint = `${config.url}/rest/v1/${table}?${query}`
    console.log('[SKY REST] Request:', endpoint)

    try {
        const res = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'apikey': config.anonKey,
                'Authorization': `Bearer ${config.accessToken}`,
            },
        })

        if (!res.ok) {
            const body = await res.text()
            console.error('[SKY REST] Error:', res.status, body)
            return { data: null, error: `${res.status}: ${body}`, status: res.status }
        }

        const data = await res.json()
        console.log('[SKY REST] Data:', data)
        return { data, error: null, status: res.status }
    } catch (err) {
        console.error('[SKY REST] Exception:', err)
        return { data: null, error: (err as Error).message, status: 0 }
    }
}

/**
 * Check if a JWT access token is expired (with 60s buffer).
 */
export function isTokenExpired(expiresAt: number): boolean {
    return Date.now() / 1000 > expiresAt - 60
}

/**
 * Refresh a Supabase token using the refresh token.
 */
export async function refreshToken(
    supabaseUrl: string,
    anonKey: string,
    currentRefreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number } | null> {
    try {
        const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': anonKey,
            },
            body: JSON.stringify({ refresh_token: currentRefreshToken }),
        })

        if (!res.ok) return null

        const data = await res.json()
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
        }
    } catch {
        return null
    }
}
