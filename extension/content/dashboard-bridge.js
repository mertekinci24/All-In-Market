"use strict";
/* ------------------------------------------------------------------ */
/*  Dashboard Auth Bridge — Content Script                             */
/*  Runs on the Sky-Market Dashboard domain to extract Supabase JWT   */
/* ------------------------------------------------------------------ */
;
(function dashboardBridge() {
    const LOG_PREFIX = '[SKY Bridge]';
    const POLL_INTERVAL = 30_000; // 30 seconds
    /**
     * Find the Supabase auth token in localStorage.
     * Supabase stores it as `sb-<project-ref>-auth-token`.
     */
    function findSupabaseSession() {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token'))
                continue;
            try {
                const raw = localStorage.getItem(key);
                if (!raw)
                    continue;
                const parsed = JSON.parse(raw);
                // Supabase stores: { access_token, refresh_token, expires_at, user: { id } }
                if (parsed.access_token && parsed.user?.id) {
                    return {
                        accessToken: parsed.access_token,
                        refreshToken: parsed.refresh_token ?? '',
                        expiresAt: parsed.expires_at ?? 0,
                        userId: parsed.user.id,
                    };
                }
            }
            catch {
                // Corrupted entry, skip
            }
        }
        return null;
    }
    /**
     * Send auth token to the background Service Worker.
     */
    function sendToken() {
        const session = findSupabaseSession();
        if (!session) {
            // console.log(LOG_PREFIX, 'No Supabase session found')
            return;
        }
        chrome.runtime.sendMessage({
            type: 'AUTH_TOKEN',
            payload: {
                accessToken: session.accessToken,
                refreshToken: session.refreshToken,
                expiresAt: session.expiresAt,
                userId: session.userId,
                // URL and Key are now handled in background.ts via config.ts
                supabaseUrl: '',
                supabaseAnonKey: '',
            },
        }, (response) => {
            if (chrome.runtime.lastError) {
                // Console clutter reduction
                console.warn(LOG_PREFIX, 'Send failed:', chrome.runtime.lastError.message)
                return;
            }
            console.log(LOG_PREFIX, 'Token sent to Service Worker');
        });
    }
    /* ------------------------------------------------------------------ */
    /*  Initialization                                                    */
    /* ------------------------------------------------------------------ */
    console.log(LOG_PREFIX, 'Dashboard bridge loaded');
    // Initial token send
    setTimeout(sendToken, 1000);
    // Poll for token refresh
    setInterval(sendToken, POLL_INTERVAL);
    // Also listen for storage events (token refresh by Supabase client)
    window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('sb-') && e.key.endsWith('-auth-token')) {
            console.log(LOG_PREFIX, 'Token changed, re-syncing...');
            setTimeout(sendToken, 500);
        }
    });
})();
