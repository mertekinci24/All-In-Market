/**
 * V1.5.0 Security Update: Credentials are NO LONGER hardcoded
 * They are injected at runtime via Dashboard → Extension Setup
 * Use getCredentials() from secure-storage.ts instead
 */

// Fallback only for development (will be empty in production)
export const SUPABASE_URL = '';
export const SUPABASE_ANON_KEY = '';

console.warn('[SKY] WARNING: Hardcoded credentials removed. Use secure-storage.ts for runtime credentials.');
