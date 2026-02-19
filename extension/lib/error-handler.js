/**
 * Sky-Market Global Error Handler (V1.4.0)
 * ─────────────────────────────────────────
 * Translates raw technical errors into user-friendly
 * Turkish messages and silently logs them to Supabase.
 */

const ERROR_MAP = [
    { pattern: /Failed to fetch/i, userMessage: '🌐 Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.' },
    { pattern: /NetworkError/i, userMessage: '🌐 Ağ hatası oluştu. Lütfen tekrar deneyin.' },
    { pattern: /timeout/i, userMessage: '⏱️ İstek zaman aşımına uğradı. Lütfen tekrar deneyin.' },
    { pattern: /401|Unauthorized/i, userMessage: '🔒 Oturum süresi doldu. Dashboard\'a gidip tekrar giriş yapın.' },
    { pattern: /403|Forbidden/i, userMessage: '🚫 Bu işlem için yetkiniz yok.' },
    { pattern: /429|Quota|rate.?limit/i, userMessage: '⚠️ İstek kotası doldu. 1 dakika bekleyip tekrar deneyin.' },
    { pattern: /500|Internal Server/i, userMessage: '🔧 Sunucu hatası. Teknik ekip bilgilendirildi.' },
    { pattern: /502|503|504/i, userMessage: '🔧 Sunucu geçici olarak kullanılamıyor. Kısa süre içinde düzelecektir.' },
    { pattern: /Extension context/i, userMessage: '🔄 Eklenti bağlantısı koptu. Sayfayı yenileyin.' },
    { pattern: /Receiving end/i, userMessage: '🔄 Arka plan servisi uyandırılıyor. Tekrar deneyin.' },
    { pattern: /JSON/i, userMessage: '📦 Veri formatı okunamadı. Sayfa yapısı değişmiş olabilir.' },
];

const FALLBACK_MESSAGE = '⚙️ Beklenmeyen bir hata oluştu. Teknik ekip bilgilendirildi.';

export class ErrorHandler {
    /**
     * Translate a raw error into a user-friendly message.
     * @param {Error|string} error
     * @returns {string} Friendly Turkish message
     */
    static friendlyMessage(error) {
        const raw = error instanceof Error ? error.message : String(error);
        for (const { pattern, userMessage } of ERROR_MAP) {
            if (pattern.test(raw)) return userMessage;
        }
        return FALLBACK_MESSAGE;
    }

    /**
     * Log an error to Supabase via background.js bridge.
     * Fire-and-forget; never throws.
     * @param {string} level  'error' | 'warn' | 'info'
     * @param {string} source  e.g. 'overlay', 'parser', 'background'
     * @param {Error|string} error  Raw error object
     * @param {object} [metadata]  Extra context (product data, etc.)
     */
    static log(level, source, error, metadata = {}) {
        try {
            const payload = {
                type: 'LOG_ERROR',
                payload: {
                    level,
                    source,
                    message: error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : null,
                    metadata,
                    page_url: window.location?.href || 'unknown',
                }
            };

            // Use chrome.runtime.sendMessage (fire-and-forget)
            if (chrome?.runtime?.id) {
                chrome.runtime.sendMessage(payload, () => {
                    // Suppress "message channel closed" silently
                    if (chrome.runtime.lastError) { /* no-op */ }
                });
            }
        } catch (_) {
            // ErrorHandler must never throw
            console.warn('[SKY ErrorHandler] Failed to dispatch log:', _);
        }
    }

    /**
     * Convenience: Log + return friendly message in one call.
     * @param {Error|string} error
     * @param {string} source
     * @param {object} [metadata]
     * @returns {string} Friendly message
     */
    static handle(error, source = 'overlay', metadata = {}) {
        ErrorHandler.log('error', source, error, metadata);
        return ErrorHandler.friendlyMessage(error);
    }
}
