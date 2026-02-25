/**
 * Sky-Market Overlay Logic
 * Injects the analysis panel and handles interactions.
 */

(function () {
  const LOG_PREFIX = '[SKY Overlay]';
  let productData = null;

  // V1.4.8: Centralised Dashboard URL — change here for production
  const DASHBOARD_BASE_URL = 'http://localhost:5173';

  /* ---------------------------------------------------------------- */
  /*  V1.4.0: Inline Global Error Handler                              */
  /* ---------------------------------------------------------------- */
  const ERROR_MAP = [
    { pattern: /Failed to fetch/i, msg: '🌐 Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.' },
    { pattern: /NetworkError/i, msg: '🌐 Ağ hatası oluştu. Lütfen tekrar deneyin.' },
    { pattern: /timeout/i, msg: '⏱️ İstek zaman aşımına uğradı. Lütfen tekrar deneyin.' },
    { pattern: /Not authenticated/i, msg: '🔒 Henüz giriş yapılmadı. Sky-Market Dashboard\'a giriş yapın.' },
    { pattern: /Oturum açın/i, msg: '🔒 Oturum açmanız gerekiyor. Dashboard\'a giriş yapın.' },
    { pattern: /No store found/i, msg: '🏪 Mağaza bulunamadı. Dashboard\'dan mağaza oluşturun.' },
    { pattern: /401|Unauthorized/i, msg: '🔒 Oturum süresi doldu. Dashboard\'a gidip tekrar giriş yapın.' },
    { pattern: /429|Quota|rate.?limit/i, msg: '⚠️ İstek kotası doldu. 1 dakika bekleyip tekrar deneyin.' },
    { pattern: /500|Internal Server/i, msg: '🔧 Sunucu hatası. Teknik ekip bilgilendirildi.' },
    { pattern: /Extension context/i, msg: '🔄 Eklenti bağlantısı koptu. Sayfayı yenileyin.' },
    { pattern: /Receiving end/i, msg: '🔄 Arka plan servisi uyandırılıyor. Tekrar deneyin.' },
  ];
  const FALLBACK_MSG = '⚙️ Beklenmeyen bir hata oluştu. Teknik ekip bilgilendirildi.';

  const ErrorHandler = {
    friendly(error) {
      const raw = error instanceof Error ? error.message : String(error);
      for (const { pattern, msg } of ERROR_MAP) { if (pattern.test(raw)) return msg; }
      return FALLBACK_MSG;
    },
    log(level, source, error, metadata = {}) {
      try {
        if (chrome?.runtime?.id) {
          chrome.runtime.sendMessage({
            type: 'LOG_ERROR', payload: {
              level, source,
              message: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : null,
              metadata, page_url: window.location?.href || 'unknown',
            }
          }, () => { if (chrome.runtime.lastError) { /* no-op */ } });
        }
      } catch (_) { /* ErrorHandler must never throw */ }
    },
    handle(error, source = 'overlay', metadata = {}) {
      ErrorHandler.log('error', source, error, metadata);
      return ErrorHandler.friendly(error);
    }
  };

  // Initialize
  function init() {
    console.log(LOG_PREFIX, 'Initializing...');

    // Check if data is already available (race condition fix)
    if (window.SkyParser && window.SkyParser.latestData) {
      console.log(LOG_PREFIX, 'Found existing data in SkyParser', window.SkyParser.latestData);
      handleProductData({ detail: window.SkyParser.latestData });
    }

    // Listen for future data
    document.addEventListener('SKY_PRODUCT_DATA_READY', handleProductData);
    window.addEventListener('SKY_PRODUCT_PARSED', handleProductData);

    // V1.4.4: Listen for FORCE_LOGOUT broadcast from background
    // When session expires, show a re-login CTA instead of a dead UI
    if (chrome?.runtime?.id) {
      chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'FORCE_LOGOUT') {
          console.warn(LOG_PREFIX, 'FORCE_LOGOUT received. Reason:', message.payload?.reason);
          showForceLogoutUI(message.payload?.reason);
        }
      });
    }
  }

  function handleProductData(event) {
    console.log(LOG_PREFIX, 'Received Product Data:', event.detail);
    productData = event.detail;

    try {
      createOverlay();
      updateOverlay(productData);
    } catch (e) {
      console.error(LOG_PREFIX, 'Error rendering overlay:', e);
    }
  }

  function createOverlay() {
    if (document.getElementById('sky-market-overlay-root')) return;

    const root = document.createElement('div');
    root.id = 'sky-market-overlay-root';

    // Inject Styles (SAME AS BEFORE - Truncated for brevity in replaced content, assuming it persists from previous edit if I don't touch it? 
    // Wait, replacing creates a new function if I replace the whole block.
    // I need to be careful not to lose the styles I added.
    // This tool replaces lines. I will target specifically the lines I need to change or ensure I strictly copy the previous styles.
    // Actually, the previous style injection was inside createOverlay.
    // I will explicitly rewrite the createOverlay function to be safe and ensure the ID is added.

    const style = document.createElement('style');
    style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        #sky-market-overlay-root {
            position: fixed;
            top: 100px;
            right: 20px;
            z-index: 99999;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            width: 320px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        #sky-market-overlay-root.minimized {
            width: 60px;
            height: 60px;
            overflow: hidden;
            border-radius: 50%;
            cursor: pointer;
        }

        #sky-market-overlay-root.minimized .sky-overlay-content,
        #sky-market-overlay-root.minimized .sky-overlay-header-text {
            display: none;
        }

        #sky-market-overlay-root.minimized .sky-overlay-header {
            padding: 0;
            height: 100%;
            justify-content: center;
            background: #4f46e5;
        }

        #sky-market-overlay-root.minimized .sky-logo-icon {
            margin: 0;
            font-size: 24px;
        }

        .sky-glass {
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            border-radius: 20px;
            overflow: hidden;
            color: white;
        }

        .sky-overlay-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            background: linear-gradient(to right, rgba(79, 70, 229, 0.2), transparent);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .sky-logo {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 700;
            font-size: 14px;
            letter-spacing: -0.02em;
            color: #e2e8f0;
        }

        .sky-logo-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #4f46e5, #ec4899);
            border-radius: 8px;
            font-size: 16px;
            box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3);
        }

        .sky-minimize-btn {
            background: rgba(255, 255, 255, 0.05);
            border: none;
            color: #94a3b8;
            width: 28px;
            height: 28px;
            border-radius: 8px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .sky-minimize-btn:hover {
            background: rgba(255, 255, 255, 0.1);
            color: white;
        }

        .sky-overlay-content {
            padding: 20px;
        }

        /* Score Gauge */
        .sky-score-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 24px;
            position: relative;
        }

        .sky-score-ring {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background: conic-gradient(from 180deg, #4f46e5 0%, #22c55e 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            box-shadow: 0 0 20px rgba(79, 70, 229, 0.2);
            padding: 3px; /* Border width */
            transition: background 1s ease;
        }

        .sky-score-ring::before {
            content: '';
            position: absolute;
            inset: 6px;
            background: #0f172a;
            border-radius: 50%;
            z-index: 1;
        }

        .sky-score-inner {
            position: relative;
            z-index: 2;
            text-align: center;
        }

        .sky-score-val {
            font-size: 28px;
            font-weight: 800;
            background: linear-gradient(to right, #ffffff, #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            line-height: 1;
        }

        .sky-score-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #64748b;
            margin-top: 4px;
        }

        .sky-status-badge {
            margin-top: 12px;
            padding: 4px 12px;
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.2);
            color: #4ade80;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .sky-pulse {
            width: 6px;
            height: 6px;
            background: currentColor;
            border-radius: 50%;
            animation: sky-pulse 2s infinite;
        }

        @keyframes sky-pulse {
            0% { transform: scale(0.95); opacity: 0.7; }
            50% { transform: scale(1.5); opacity: 0.3; }
            100% { transform: scale(0.95); opacity: 0.7; }
        }

        /* Metrics Grid */
        .sky-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 20px;
        }

        .sky-metric-box {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.05);
            padding: 12px;
            border-radius: 12px;
            text-align: center;
        }

        .sky-metric-val {
            font-size: 16px;
            font-weight: 700;
            color: #f8fafc;
            margin-bottom: 2px;
        }

        .sky-metric-lbl {
            font-size: 10px;
            color: #94a3b8;
        }

        /* Social Proof List */
        .sky-proof-list {
            background: linear-gradient(to bottom right, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 20px;
            border: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        .sky-proof-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12px;
            padding: 6px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }
        
        .sky-proof-item:last-child {
            border-bottom: none;
        }

        .sky-proof-icon {
            margin-right: 8px;
            font-size: 14px;
        }

        .sky-proof-label {
            color: #94a3b8;
            flex: 1;
        }

        .sky-proof-val {
            color: #e2e8f0;
            font-weight: 600;
            font-feature-settings: "tnum";
        }

        /* Actions */
        .sky-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .sky-btn {
            width: 100%;
            padding: 12px;
            border-radius: 10px;
            border: none;
            cursor: pointer;
            font-weight: 600;
            font-size: 12px;
            font-family: inherit;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s;
        }

        .sky-btn-primary {
            background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .sky-btn-primary:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
        }

        .sky-btn-accent {
            background: rgba(255, 255, 255, 0.05);
            color: #e2e8f0;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .sky-btn-accent:hover {
            background: rgba(255, 255, 255, 0.1);
            color: white;
        }

        .sky-btn-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }
    `;
    root.appendChild(style);

    root.innerHTML += `
      <div class="sky-glass">
        <!-- Header -->
        <div class="sky-overlay-header">
            <div class="sky-logo">
                <div class="sky-logo-icon">👑</div>
                <span class="sky-overlay-header-text">Titanium Intelligence</span>
            </div>
            <button class="sky-minimize-btn" id="sky-overlay-minimize" title="Küçült">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 12H6"/>
                </svg>
            </button>
        </div>

        <!-- Content -->
        <div class="sky-overlay-content">
            
            <!-- Score Gauge -->
            <div class="sky-score-wrapper">
                <div class="sky-score-ring" id="sky-score-ring">
                    <div class="sky-score-inner">
                        <div class="sky-score-val" id="sky-opp-score">-</div>
                        <div class="sky-score-label">FIRSAT PUANI</div>
                    </div>
                </div>
                <!-- Titanium Metrics Grid -->
                <div class="sky-titanium-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; margin-top: 12px; margin-bottom: 12px;">
                    <div class="sky-metric-card" style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 8px; text-align: center;">
                        <span style="font-size: 10px; color: #94a3b8; display: block;">Velocity</span>
                        <strong id="sky-velocity-val" style="font-size: 14px; color: #e2e8f0;">-</strong>
                    </div>
                     <div class="sky-metric-card" style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 8px; text-align: center;">
                        <span style="font-size: 10px; color: #94a3b8; display: block;">Stok Sağlığı</span>
                        <strong id="sky-stock-val" style="font-size: 14px; color: #e2e8f0;">-</strong>
                    </div>
                </div>

                <div class="sky-status-badge">
                   <div class="sky-pulse"></div>
                   <span id="sky-ai-insight">Analiz Ediliyor...</span>
                </div>
            </div>

            <!-- Key Metrics -->
            <div class="sky-grid">
                <div class="sky-metric-box">
                    <div class="sky-metric-val" id="sky-metric-price">-</div>
                    <div class="sky-metric-lbl">Satış Fiyatı</div>
                </div>
                <div class="sky-metric-box">
                    <div class="sky-metric-val" id="sky-metric-reviews">-</div>
                    <div class="sky-metric-lbl">Yorum Sayısı</div>
                </div>
            </div>

            <!-- Social Proof (Sepette, Favori vs) -->
            <div class="sky-proof-list" id="sky-social-proof-container" style="display:none;">
                <div class="sky-proof-item">
                    <span class="sky-proof-icon">🛒</span>
                    <span class="sky-proof-label">Sepette Bekleyen</span>
                    <span class="sky-proof-val" id="sky-sp-cart">-</span>
                </div>
                <div class="sky-proof-item">
                    <span class="sky-proof-icon">👁️</span>
                    <span class="sky-proof-label">Son 24s Görüntülenme</span>
                    <span class="sky-proof-val" id="sky-sp-view">-</span>
                </div>
                <div class="sky-proof-item">
                    <span class="sky-proof-icon">❤️</span>
                    <span class="sky-proof-label">Toplam Favori</span>
                    <span class="sky-proof-val" id="sky-sp-fav">-</span>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="sky-actions">
                <button class="sky-btn sky-btn-primary" id="sky-btn-add">
                    <span>⚡</span> Takip Et & Analiz Başlat
                </button>

                <div class="sky-btn-group">
                    <button class="sky-btn sky-btn-accent" id="sky-btn-ai">
                        <span>🤖</span> AI Raporu
                    </button>
                    <button class="sky-btn sky-btn-accent" id="sky-btn-media">
                        <span>📷</span> Medya
                    </button>
                </div>
                
                <button class="sky-btn sky-btn-accent" id="sky-btn-dashboard" style="font-size:10px; padding:8px;">
                     Detaylı Dashboard Raporu ↗
                </button>
            </div>

        </div>
      </div>
    `;

    document.body.appendChild(root);
    // Event Listeners setup moved to the bottom of the file to avoid duplication
    setupEventListeners(root);
  }

  // --- Connection Resilience (V1.3.0) ---
  function sendMessageWithRetry(message, retries = 3, delay = 500) {
    return new Promise((resolve, reject) => {
      function attempt(n) {
        if (!chrome.runtime?.id) {
          console.warn(LOG_PREFIX, 'Extension context invalidated. Reload necessary.');
          reject(new Error('Extension context invalidated'));
          return;
        }

        chrome.runtime.sendMessage(message, (response) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            console.warn(LOG_PREFIX, `Message failed (attempt ${retries - n + 1}):`, lastError.message);

            // If "Receiving end does not exist" or similar, retry
            if (n > 0) {
              setTimeout(() => attempt(n - 1), delay);
            } else {
              reject(lastError);
            }
          } else {
            resolve(response);
          }
        });
      }
      attempt(retries);
    });
  }

  function updateOverlay(data) {
    if (!data) return;

    function safeSetText(id, text) {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    }

    // Basic Metrics
    safeSetText('sky-metric-price', (data.currentPrice || '-') + ' TL');
    safeSetText('sky-metric-reviews', data.reviewCount || '0');

    // Social Proof
    const spContainer = document.getElementById('sky-social-proof-container');
    if (spContainer) {
      if (data.socialProof && (data.socialProof.cartCount || data.socialProof.viewCount || data.socialProof.favCount)) {
        spContainer.style.display = 'block';
        safeSetText('sky-sp-cart', data.socialProof.cartCount || '-');
        safeSetText('sky-sp-view', data.socialProof.viewCount || '-');
        safeSetText('sky-sp-fav', data.socialProof.favCount || '-');
      } else {
        spContainer.style.display = 'none';
      }
    }

    // Titanium Metrics (stockHealth & velocity from Parser)
    safeSetText('sky-velocity-val', data.velocity || '-');
    safeSetText('sky-stock-val', data.stockHealth || '-');

    // Reset Analysis UI
    safeSetText('sky-opp-score', '-');
    safeSetText('sky-ai-insight', 'Analiz ediliyor...');

    const ringEl = document.getElementById('sky-score-ring');
    if (ringEl) ringEl.style.background = 'conic-gradient(#333 0%, #333 0%)';

    // Wake-Up / Ping before heavy lifting
    chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn(LOG_PREFIX, 'Service Worker asleep or invalidated:', chrome.runtime.lastError);
        // Verify if we should show a specific error or try to continue
      }
    });

    // V1.4.1: Skip analysis if schema validation failed (don't send garbage to Edge Function)
    if (data._schemaValid === false) {
      console.warn(LOG_PREFIX, 'Schema invalid, skipping ANALYZE_PRODUCT. Errors:', data._schemaErrors);
      safeSetText('sky-opp-score', 'N/A');
      safeSetText('sky-ai-insight', '⚠️ Ürün verisi eksik. Sayfayı yenileyip tekrar deneyin.');
      return;
    }

    // Call Background to calculate Score + AI Insight
    sendMessageWithRetry({ type: 'ANALYZE_PRODUCT', payload: data })
      .then((response) => {
        if (response && response.success) {
          const score = response.data.score;
          const insight = response.data.insight;

          safeSetText('sky-opp-score', score);
          safeSetText('sky-ai-insight', insight);

          // Update Circle Color & Progress
          if (ringEl) {
            const pct = score * 10;
            let color = '#ef4444'; // Red
            if (score >= 4) color = '#f59e0b'; // Yellow
            if (score >= 7) color = '#10b981'; // Green
            ringEl.style.background = `conic-gradient(${color} ${pct}%, #333 ${pct}%)`;
          }
        } else {
          console.error(LOG_PREFIX, 'Analyze Product Failed (Backend):', response);

          // V1.4.4: If backend forced a logout (401/403), show Login CTA
          if (response?.forceLogout) {
            showForceLogoutUI('edge_function_401');
            return;
          }

          const friendlyErr = ErrorHandler.handle(response?.error || 'Bilinmeyen hata', 'overlay.analyzeProduct');
          safeSetText('sky-opp-score', 'N/A');
          safeSetText('sky-ai-insight', friendlyErr);
        }
      })
      .catch((err) => {
        console.error(LOG_PREFIX, 'Analyze Product Failed after retries:', err);
        safeSetText('sky-opp-score', 'N/A');
        safeSetText('sky-ai-insight', ErrorHandler.handle(err, 'overlay.analyzeProduct'));
      });
  }

  /**
   * V1.4.4: showForceLogoutUI — Overlays a re-login CTA on the panel.
   * Called when background broadcasts FORCE_LOGOUT or when ANALYZE_PRODUCT
   * returns { forceLogout: true }. This NEVER crashes the overlay itself.
   */
  function showForceLogoutUI(reason = 'session_expired') {
    const root = document.getElementById('sky-market-overlay-root');
    if (!root) return;

    // Disable analyze buttons so user doesn't retry into a wall
    ['sky-btn-add', 'sky-btn-ai', 'sky-btn-media', 'sky-btn-dashboard'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) { btn.disabled = true; btn.style.opacity = '0.4'; }
    });

    // Show inline login prompt — inject once
    if (document.getElementById('sky-relogin-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'sky-relogin-banner';
    banner.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(8px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 24px;
      border-radius: 20px;
      z-index: 10;
      text-align: center;
    `;
    banner.innerHTML = `
      <div style="font-size: 36px;">🔒</div>
      <div style="font-size: 14px; font-weight: 700; color: #f1f5f9;">Oturum Süresi Doldu</div>
      <div style="font-size: 11px; color: #94a3b8; line-height: 1.5;">Dashboard'a giriş yaparak oturumunuzu yenileyin. Eklenti otomatik olarak eşitlenir.</div>
      <button id="sky-goto-dashboard" style="
        background: linear-gradient(135deg, #4f46e5, #3b82f6);
        color: white;
        border: none;
        border-radius: 10px;
        padding: 12px 20px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        width: 100%;
        font-family: inherit;
        box-shadow: 0 4px 12px rgba(79,70,229,0.4);
      ">🚀 Dashboard'a Git &amp; Giriş Yap</button>
      <button id="sky-dismiss-logout" style="
        background: transparent;
        color: #64748b;
        border: none;
        font-size: 11px;
        cursor: pointer;
        font-family: inherit;
      ">Kapat</button>
    `;

    // Make the root relative so absolute positioning works
    root.style.position = 'fixed';
    root.querySelector('.sky-glass').style.position = 'relative';
    root.querySelector('.sky-glass').appendChild(banner);

    document.getElementById('sky-goto-dashboard')?.addEventListener('click', () => {
      window.open('https://sky-market-dashboard.vercel.app', '_blank');
    });
    document.getElementById('sky-dismiss-logout')?.addEventListener('click', () => {
      banner.remove();
      // Re-enable buttons
      ['sky-btn-add', 'sky-btn-ai', 'sky-btn-media', 'sky-btn-dashboard'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
      });
    });
  } // end showForceLogoutUI

  function setupEventListeners(root) {
    document.getElementById('sky-overlay-minimize').addEventListener('click', () => {
      root.classList.toggle('minimized');
    });

    document.getElementById('sky-btn-add').addEventListener('click', function () {
      console.log(LOG_PREFIX, 'Add Button Clicked');
      this.style.transform = 'scale(0.95)';
      setTimeout(() => this.style.transform = 'scale(1)', 100);

      if (!productData) {
        alert('Hata: Ürün verisi yüklenemedi. Sayfayı yenileyin.');
        return;
      }

      sendMessageWithRetry({ type: 'ADD_TRACKING', payload: productData })
        .then((res) => {
          if (res && res.success) alert('✅ Ürün dashboard envanterine eklendi!');
          else alert(ErrorHandler.handle(res?.error || 'Bilinmeyen hata', 'overlay.addTracking'));
        })
        .catch((e) => {
          console.error(LOG_PREFIX, 'ADD_TRACKING failed:', e);
          alert(ErrorHandler.handle(e, 'overlay.addTracking'));
        });
    });

    const aiBtn = document.getElementById('sky-btn-ai');
    if (aiBtn) {
      aiBtn.addEventListener('click', function () {
        if (!productData) return;
        const originalText = aiBtn.innerHTML;
        aiBtn.innerHTML = '<span>⏳</span> Analiz...';
        aiBtn.disabled = true;

        sendMessageWithRetry({ type: 'ANALYZE_REVIEWS', payload: productData })
          .then((res) => {
            if (res && res.success) alert('✅ Analiz Raporu Hazır! (Dashboard > Ürün Madenciliği)');
            else alert(ErrorHandler.handle(res?.error || 'Bilinmeyen hata', 'overlay.analyzeReviews'));
          })
          .catch((e) => {
            alert(ErrorHandler.handle(e, 'overlay.analyzeReviews'));
          })
          .finally(() => {
            aiBtn.innerHTML = originalText;
            aiBtn.disabled = false;
          });
      });
    }

    const mediaBtnEl = document.getElementById('sky-btn-media');
    if (mediaBtnEl) {
      mediaBtnEl.addEventListener('click', () => {
        if (!productData) {
          console.warn(LOG_PREFIX, 'Media button clicked but no product data');
          return;
        }
        if (!productData.imageUrl) {
          alert('Ürün görseli bulunamadı.');
          return;
        }
        // Open image in new tab as fallback (doesn't need background)
        window.open(productData.imageUrl, '_blank');
        // Also trigger download via background (best effort — won't block if SW sleeping)
        if (chrome?.runtime?.id) {
          chrome.runtime.sendMessage({
            type: 'DOWNLOAD_MEDIA',
            payload: { url: productData.imageUrl, filename: `sky-product-${Date.now()}.jpg` }
          }, () => { if (chrome.runtime.lastError) { /* SW sleeping, fallback already opened */ } });
        }
      });
    }

    // Dashboard Button — V1.4.6: Direct navigation, no background dependency
    const dashBtn = document.getElementById('sky-btn-dashboard');
    if (dashBtn) {
      dashBtn.addEventListener('click', () => {
        if (!productData) return;

        // V1.4.6 Fix 3: Navigate directly to Dashboard — doesn't need background alive
        // Extract product ASIN/ID for deep link
        const productId = productData.productId || '';
        const dashboardUrl = `${DASHBOARD_BASE_URL}/research${productId ? `?asin=${productId}` : ''}`;
        window.open(dashboardUrl, '_blank');

        // Fire ANALYZE_AND_SAVE in background (best effort — async, doesn't block nav)
        if (chrome?.runtime?.id) {
          chrome.runtime.sendMessage(
            { type: 'ANALYZE_AND_SAVE', payload: productData },
            (res) => {
              if (chrome.runtime.lastError) {
                console.warn(LOG_PREFIX, 'ANALYZE_AND_SAVE background call failed (SW sleeping):', chrome.runtime.lastError.message);
              } else if (res && !res.success) {
                console.warn(LOG_PREFIX, 'ANALYZE_AND_SAVE failed:', res.error);
              }
            }
          );
        }
      });
    }
  }

  // Start
  init();

})();
