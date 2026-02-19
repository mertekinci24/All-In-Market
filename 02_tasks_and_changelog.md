# 02_Tasks_and_Changelog

## 🚀 Current Task: Fix Trendyol Parser Data Extraction (Titanium Update)

### 📅 17.02.2026 - Debugging Session (Night)

**Status Overview:**
- [x] **Social Proof:** ✅ Fixed. Data (Cart, View, Fav) is correctly displayed.
- [x] **Velocity:** ✅ Implemented. Currently showing "Düşük 🐢".
- [x] **Stock Health:** ⚠️ Partial. JSON parsing failed, now correctly falling back to "Mevcut (Veri Yok) ⚪".
- [ ] **Price:** ❌ REGRESSION. Code update broke the DOM fallback. Showing "- TL".
- [ ] **Review Count:** ❌ REGRESSION. Code update broke the DOM fallback. Showing "0".

**Analysis of Regression:**
The attempt to unify DOM selectors in the recent update likely changed the precedence or broke the logic that was previously working for Price and Reviews. The JSON parser (`getPageState`) is consistently failing to find the hidden data, forcing the code into the DOM fallback block, which is now malfunctioning.

**Immediate Action Plan:**
1.  **Restore & Strengthen DOM Selectors:** Revert to the specific `querySelector` logic that worked previously for `.prc-box-sll` (Basket Price) and `.prc-dsc`.
2.  **Add "Nuclear" Regex Fallback:** If specific classes are not found, search the entire page text for patterns like:
    - Price: `12.345 TL`, `12.345,67 TL`
    - Reviews: `(1234 Değerlendirme)`, `1.234 Yorum`
3.  **Verify Helper Functions:** Check if `parsePrice` is robust enough to handle the inputs it's receiving.

---

## 📜 Changelog

### [v1.1.5] - 2026-02-17
*   **Fix:** Updated `trendyol-parser.js` to use aggressive Regex text matching for Price and Reviews when standard selectors fail.
*   **Fix:** Restored priority of Basket Price (`.prc-box-sll`) extraction.
*   **Update:** Documented JSON parsing limitation; currently relying on advanced DOM scraping.

