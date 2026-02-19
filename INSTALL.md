# Sky-Market Installation Guide

## 1. Extension Setup (Chrome)
1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable **Developer mode** (top right toggle).
3.  Click **Load unpacked**.
4.  Select the `d:\AllinMarketPlace\extension` folder.
5.  Refres Chrome.
6.  The **Sky-Market Live Intelligence** extension should now be active.

## 2. Web Application Setup
### Local Development
1.  Run `npm run dev` in the terminal.
2.  Open `http://localhost:5173`.
3.  Login via Supabase Auth.
4.  The extension will automatically connect when you browse Trendyol product pages.

### Production Build
1.  The `dist/` folder contains the optimized build.
2.  Deploy this folder to Vercel, Netlify, or any static hosting provider.
3.  Ensure your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in the hosting environment variables.

## 3. Database & Functions
- **Database:** Ensure `supabase_schema.sql` has been executed in the Supabase SQL Editor.
- **Edge Functions:** Ensure functions are deployed (`analyze-product`, `predict-seasonality`, etc.) and `GEMINI_API_KEY` is set.

## 4. Usage
1.  Go to a Trendyol product page.
2.  Click the extension icon or look for the **Sky-Market Overlay** on the page.
3.  Click "Analiz Et" to trigger AI analysis or "Takip Et" to add to your dashboard.
