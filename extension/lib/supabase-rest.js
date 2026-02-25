/* ------------------------------------------------------------------ */
/*  Lightweight Supabase REST Client (no SDK dependency)               */
/*  Used in Service Worker for chrome extension                        */
/* ------------------------------------------------------------------ */

/**
 * Insert a row into a Supabase table via REST API.
 * Requires a valid user accessToken.
 */
export async function insertRow(table, row, config) {
    const endpoint = `${config.url}/rest/v1/${table}`;
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
        });
        if (!res.ok) {
            const body = await res.text();
            return { data: null, error: `${res.status}: ${body}`, status: res.status };
        }
        const data = await res.json();
        return { data, error: null, status: res.status };
    }
    catch (err) {
        return { data: null, error: err.message, status: 0 };
    }
}

/**
 * V1.4.2: insertRowAnon — Insert WITHOUT a user session.
 * ───────────────────────────────────────────────────────
 * Used for `technical_logs` (fire-and-forget error logging).
 *
 * Supabase requires this exact header pattern for anon role access:
 *   apikey: <anonKey>                  ← project identifier
 *   Authorization: Bearer <anonKey>    ← anon role, no user JWT
 *
 * ⚠️  REQUIRES this RLS policy on the target table:
 *   CREATE POLICY "anon_can_insert_logs" ON technical_logs
 *   FOR INSERT TO anon WITH CHECK (true);
 */
export async function insertRowAnon(table, row, supabaseUrl, supabaseAnonKey) {
    const endpoint = `${supabaseUrl}/rest/v1/${table}`;
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Prefer': 'return=minimal', // no response body for fire-and-forget
            },
            body: JSON.stringify(row),
        });
        if (!res.ok) {
            const body = await res.text();
            return { data: null, error: `${res.status}: ${body}`, status: res.status };
        }
        return { data: null, error: null, status: res.status };
    }
    catch (err) {
        return { data: null, error: err.message, status: 0 };
    }
}

/**
 * Select rows from a Supabase table via REST API.
 */
export async function selectRows(table, query, config) {
    const endpoint = `${config.url}/rest/v1/${table}?${query}`;
    console.log('[SKY REST] Request:', endpoint);
    try {
        const res = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'apikey': config.anonKey,
                'Authorization': `Bearer ${config.accessToken}`,
            },
        });
        if (!res.ok) {
            const body = await res.text();
            console.error('[SKY REST] Error:', res.status, body);
            return { data: null, error: `${res.status}: ${body}`, status: res.status };
        }
        const data = await res.json();
        console.log('[SKY REST] Data:', data);
        return { data, error: null, status: res.status };
    }
    catch (err) {
        console.error('[SKY REST] Exception:', err);
        return { data: null, error: err.message, status: 0 };
    }
}

/**
 * Check if a JWT access token is expired (with 60s buffer).
 */
export function isTokenExpired(expiresAt) {
    return Date.now() / 1000 > expiresAt - 60;
}

/**
 * Refresh a Supabase token using the refresh token.
 */
export async function refreshToken(supabaseUrl, anonKey, currentRefreshToken) {
    try {
        const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': anonKey,
            },
            body: JSON.stringify({ refresh_token: currentRefreshToken }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            expiresAt: Math.floor(Date.now() / 1000) + data.expires_in,
        };
    }
    catch {
        return null;
    }
}
