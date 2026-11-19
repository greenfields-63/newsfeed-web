# Newsfeed Web Project

This project is a real-time breaking news aggregator and commentary platform. The Android app scaffolding has been removed; focus is exclusively on the web application located in the `web/` directory.

## 🚀 Deployment Workflow (CRITICAL FOR AI ASSISTANTS & DEVELOPERS)
- **Host:** Cloudflare Pages
- **Source:** Connected to GitHub repository (`origin/main`)
- **Important:** Whenever any changes are made to static files in `web/` (such as `web/public/app.js`, `web/public/index.html`, or `web/public/sw.js`), **changes must be committed and pushed to GitHub (`git push origin main`)** to trigger a Cloudflare Pages deployment. Local edits will not appear live on the web until pushed and built by Cloudflare.

## Project Structure
- `web/public/`: Frontend static files (`index.html`, `app.js`, `sw.js`, etc.)
- `web/functions/`: Cloudflare Pages serverless functions (RSS fetching, news snapshot API, etc.)
- `web/news-worker/`: Background worker scripts

## 🌍 English Translation (Workers AI)
- Non-English headlines are translated to English **server-side** by `functions/api/translate.js` using Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct-fp8-fast`).
- Request contract: `POST /api/translate` with `{ "target": "en", "items": [{ "id", "text", "lang" }] }` → `{ "translations": { "<id>": "<english>" } }`. Only English is supported server-side; other languages are left to the browser's built-in translator (noted in the settings modal).
- Batching: up to 300 items per request, 40 per AI batch, 3 batches in parallel.
- Caching: translations are cached in R2 at `newsfeed/translations-cache.json` (hashed `lang|text` keys) **and** in the browser's `localStorage` (`newsfeed_translation_cache`). The shared R2 cache means each unique headline is translated once for all readers.
- UI: the "Translate foreign headlines to English" checkbox (`#translate-to-english`) is checked by default on first run; the choice is persisted in `newsfeed_headline_language`.
- Reliability: if the AI call fails (e.g., daily Neuron cap reached), the endpoint returns cached results only and the UI falls back to original headlines.
- Diagnostics: `GET /api/translate` returns cache stats (`entries`, `sizeBytes`, `updatedAt`); `POST` with `"debug": true` returns per-request `neurons`.

## 🧭 Regional AI Briefing
- `functions/api/summary.js` groups headlines into macro-regions and generates a short English briefing per region with Workers AI.
- Regions: Middle East, Europe, Russia & CIS, Asia (East + South), Asia-Pacific, North America, Latin America, Global. Mapping lives in `REGION_OF_SOURCE`.
- Schedule: 3 briefings/day aligned to 06:00 / 12:00 / 18:00 UTC (08:00 / 14:00 / 20:00 Israel standard time). A time-slot cache key drives this — the first request in a slot generates, later requests read cache.
- Cached in R2 at `newsfeed/summaries/v4/{slot}.json`, generated once per slot and shared by all readers.
- Output format is plain text (`LEAD:` line + `- bullet` lines) rather than JSON, to avoid parse failures from headlines containing quotes. Up to 12 headlines are used per region per brief.
- UI: a collapsible "Regional Briefing" panel, **closed by default**; each region has a "Show in feed →" link that applies a region filter (clearable from the filter bar).

## ⚙️ Workers AI Configuration & Cost
- Workers AI binding: `[ai] binding = "AI"` in `web/wrangler.toml`; R2 binding `NEWS_SNAPSHOT_BUCKET` (bucket `worldcup-data`).
- Free tier: **10,000 Neurons/day**, resetting at 00:00 UTC. On the Workers Free plan usage hard-stops at the cap (no charge); Workers Paid bills `$0.011 / 1,000 Neurons` above the free allocation.
- Measured translation cost: roughly **0.9–1.3 Neurons per headline** (output tokens dominate the cost). Because translations are cached, reader volume does not drive cost — only new/changed headlines do.
- Regional briefings: roughly **60–230 Neurons/day** (3 slots × 8 small calls).
- Monitor usage in the Cloudflare dashboard under **AI → Workers AI → Usage**.

## ⏱️ Time Display
- All times shown in the UI (snapshot updated, briefing timestamp, headline timestamps) are rendered in the **device's local timezone and locale** via the browser's `Intl` APIs (`toLocaleTimeString`/`toLocaleString`). Server data is stored in UTC.
