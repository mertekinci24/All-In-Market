"use strict";
/* ------------------------------------------------------------------ */
/*  Trendyol SERP Parser — Content Script                              */
/*  Runs on Trendyol search and category pages                        */
/* ------------------------------------------------------------------ */

(async function serpParser() {
    const LOG_PREFIX = '[SKY SERP]';

    // Check if valid search or category page
    const output = window.location.href;
    const isSearch = output.includes('/sr?q=') || output.includes('/sr?');
    const isCategory = !output.includes('-p-') && !isSearch && (output.split('/').length > 3); // Rough check for category

    if (!isSearch && !isCategory) {
        // console.log(LOG_PREFIX, 'Not a SERP page, skipping.');
        return;
    }

    console.log(LOG_PREFIX, 'SERP Parser initializing...');

    /* ---------------------------------------------------------------- */
    /*  Utils                                                           */
    /* ---------------------------------------------------------------- */
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    /* ---------------------------------------------------------------- */
    /*  Human-like Scrolling                                            */
    /* ---------------------------------------------------------------- */
    async function humanScroll() {
        let totalHeight = 0;
        let distance = 100;
        const maxScrolls = 20; // Prevent infinite loops
        let scrolls = 0;

        console.log(LOG_PREFIX, 'Starting human-like scroll...');

        while (scrolls < maxScrolls) {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;
            scrolls++;

            // Variable speed
            await sleep(random(50, 150));

            // Occasionally pause to "read"
            if (scrolls % 5 === 0) {
                await sleep(random(500, 1200));
            }

            // Check if we reached bottom or sufficient items loaded
            if ((window.innerHeight + window.scrollY) >= scrollHeight - 100) {
                // Try to wait for lazy load
                await sleep(1500);
                const newHeight = document.body.scrollHeight;
                if (newHeight <= scrollHeight) break; // Really reached end
            }

            // Stop if we have enough items (e.g. 24 or 48)
            const count = document.querySelectorAll('.p-card-wrppr').length;
            if (count >= 48) break;
        }
        console.log(LOG_PREFIX, 'Scroll finished.');
    }

    /* ---------------------------------------------------------------- */
    /*  Parser                                                          */
    /* ---------------------------------------------------------------- */
    function parseSERP() {
        const cards = document.querySelectorAll('.p-card-wrppr');
        console.log(LOG_PREFIX, `Found ${cards.length} cards.`);

        const results = [];
        cards.forEach((card, index) => {
            try {
                // Extract Data ID / URL
                const link = card.querySelector('a');
                const url = link ? link.href : '';
                const idMatch = url.match(/-p-(\d+)/);
                const productId = idMatch ? idMatch[1] : card.getAttribute('data-id');

                // Extract Price
                const priceEl = card.querySelector('.prc-box-psc') || card.querySelector('.prc-box-sll');
                const priceText = priceEl ? priceEl.textContent.trim() : null;
                const price = priceText ? parseFloat(priceText.replace(/[^\d,]/g, '').replace(',', '.')) : null;

                // Extract Rating / Reviews
                // SERP cards often don't show exact review counts easily, but let's try
                const ratingEl = card.querySelector('.rating-score');
                const reviewEl = card.querySelector('.ratingCount'); // Often distinct

                // Extract Title
                const titleEl = card.querySelector('.prdct-desc-cntnr-ttl') || card.querySelector('.name');
                const title = titleEl ? titleEl.title || titleEl.textContent : '';

                if (productId) {
                    results.push({
                        rank: index + 1,
                        productId,
                        url,
                        title,
                        price,
                        isSponsored: card.classList.contains('sponsored') || !!card.querySelector('.sponsored-label')
                    });
                }
            } catch (e) {
                console.error(LOG_PREFIX, 'Error parsing card', index, e);
            }
        });
        return results;
    }

    /* ---------------------------------------------------------------- */
    /*  Main                                                            */
    /* ---------------------------------------------------------------- */

    // Listen for requests from background/popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'ANALYZE_SERP') {
            (async () => {
                await humanScroll();
                const data = parseSERP();
                sendResponse({ success: true, count: data.length, data });
            })();
            return true; // Keep channel open
        }
    });

    // Auto-run if configured (e.g. for passive collection)
    // For now, we wait for a trigger or just log
    // await humanScroll();
    // const data = parseSERP();
    // console.log(LOG_PREFIX, 'Data:', data);

    // Optional: Send data spontaneously if this was a user-initiated search that we want to track?
    // For "Reverse Search", we likely instigated this load via the extension.

    // Check if we have a "pending search task" in storage? 
    // Simplified: Just report what we found to background.

    // setTimeout(async () => {
    //    await humanScroll();
    //    const data = parseSERP();
    //    if (data.length > 0) {
    //        chrome.runtime.sendMessage({ type: 'SERP_DATA', payload: { url: window.location.href, results: data } });
    //    }
    // }, 1000);

})();
