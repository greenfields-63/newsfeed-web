# Newsfeed Web Project

This project is a real-time breaking news aggregator and commentary platform. The Android app scaffolding has been removed; focus is exclusively on the web application located in the `web/` directory.

## 🚀 Deployment Workflow (CRITICAL FOR AI ASSISTANTS & DEVELOPERS)
- **Host:** Cloudflare Pages
- **Source:** Connected to GitHub repository (`origin/main`)
- **Important:** Whenever any changes are made to static files in `web/` (such as `web/public/app.js`, `web/public/index.html`, or `web/public/sw.js`), **changes must be committed and pushed to GitHub (`git push origin main`)** to trigger a Cloudflare Pages deployment. Local edits will not appear live on the web until pushed and built by Cloudflare.
- **Background workers:** `web/news-worker/` deploys separately via `wrangler deploy -c <config>` (three snapshot cron workers + one publisher cron worker).

## Project Structure
- `web/public/`: Frontend static files (`index.html`, `app.js`, `sw.js`, etc.)
- `web/functions/`: Cloudflare Pages serverless functions (RSS fetching, news snapshot API, translation API, summary API)
- `web/news-worker/`: Background worker scripts (snapshot cron ×3 groups, publisher cron)

## 🌍 English Translation (Workers AI)
- Non-English headlines are translated to English **server-side** by `functions/api/translate.js` using Cloudflare Workers AI (`@cf/google/gemma-4-26b-a4b-it`, thinking disabled).
- **Request contract:** `POST /api/translate` with `{ "target": "en", "items": [{ "id", "text", "lang" }] }` → `{ "translations": { "<id>": "<english>" } }`. Only English is supported server-side; other languages are left to the browser's built-in translator (noted in the settings modal).
- **Batching:** up to 300 items per request, 40 per AI chunk. Client processes chunks concurrently via `Promise.all`; worker processes chunks with concurrency limit of 3.
- **Caching:** translations are cached in R2 at `newsfeed/translations-cache.json` (hashed text-only keys) **and** in the browser's `localStorage` (`newsfeed_translation_cache`). The shared R2 cache means each unique headline is translated once for all readers.
- **Cron warm-up:** each snapshot cron worker (core/google/regional, every 10 min) extracts non-English headlines from freshly fetched feeds and POSTs them to `/api/translate` **before** the snapshot is written to R2, so translations are cached before any user can see the headlines. Warm-up has no per-group headline cap (previously 200). Each warm-up chunk retries up to 3 times with 1s/2s backoff on failure. Failed chunks are logged via `console.error` instead of being silently swallowed.
- **UI:** the "Translate foreign headlines to English" checkbox (`#translate-to-english`) is checked by default on first run; the choice is persisted in `newsfeed_headline_language`. When English is selected, headlines are rendered only after translation completes — no flash of foreign text. When not English, original titles render immediately.
- **Reliability:** if the AI call fails, the endpoint returns cached results only and the UI falls back to original headlines.
- **Diagnostics:** `GET /api/translate` returns cache stats (`entries`, `sizeBytes`, `updatedAt`); `POST` with `"debug": true` returns per-request `neurons`.

## 🧭 Regional AI Briefing
- `functions/api/summary.js` groups headlines into macro-regions and generates a short English briefing per region with Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`).
- **Regions:** Middle East, Europe, Russia & CIS, Asia (East + South), Asia-Pacific, North America, Latin America, Global. Mapping lives in `REGION_OF_SOURCE`.
- **Schedule:** 3 briefings/day aligned to **05:00 / 13:00 / 21:00 UTC** (07:00 / 15:00 / 23:00 Israel time). The publisher cron calls `/api/summary` every 10 min at `:00`; if the current slot is cached it costs 0 neurons, if it's a new slot it generates and caches it. Briefings are generated before any user request — not on first visit.
- **Cached** in R2 at `newsfeed/summaries/v7/{slot}.json`, generated once per slot and shared by all readers.
- **Output format** is plain text (`LEAD:` line + `- bullet` lines) rather than JSON, to avoid parse failures from headlines containing quotes. Up to 12 headlines are used per region per brief. All output is English-only; non-Latin text triggers an automatic retry.
- **UI:** a collapsible "Regional Briefing" panel, **closed by default**; all regions start collapsed. Header shows "Regional Briefing" with subtitle "AI summary by region · 3× daily". Chip shows just the time (e.g. "02:34 PM").

## ⚙️ Workers AI Configuration & Cost
- Workers AI binding: `[ai] binding = "AI"` in `web/wrangler.toml`; R2 binding `NEWS_SNAPSHOT_BUCKET` (bucket `worldcup-data`).
- **Models:** Translation uses Gemma 4 26B (`@cf/google/gemma-4-26b-a4b-it`, thinking off). Briefings use Llama 3.3 70B (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`).
- **Free tier:** **10,000 Neurons/day**, resetting at 00:00 UTC. Workers Paid bills `$0.011 / 1,000 Neurons` above the free allocation.
- **Measured translation cost:** roughly **0.6 Neurons per headline** (Gemma 4, thinking off). Because translations are cached, reader volume does not drive cost — only new/changed headlines do.
- **Regional briefings:** roughly **300 Neurons per slot** (~900/day for 3 slots × 8 regions), well within the free tier.
- Monitor usage in the Cloudflare dashboard under **AI → Workers AI → Usage**.

## ⏱️ Time Display
- All times shown in the UI (snapshot updated, briefing timestamp, headline timestamps) are rendered in the **device's local timezone and locale** via the browser's `Intl` APIs (`toLocaleTimeString`/`toLocaleString`). Server data is stored in UTC.
- Headlines with pubDates more than 10 minutes in the future (e.g. server clock skew) are rejected, not clamped to "now", preventing stale headlines from being pinned as "Just now".

## Known Limitations
- Translation cache warm-up runs before the snapshot is published to R2; if warm-up fails on a cycle, some headlines may not be pre-translated until the next cycle or until a client requests them live (retry logic handles transient failures).
- Workers AI model cold starts can add latency when a model hasn't been invoked recently.
- Client-side translation (`/api/translate`) blocks headline rendering when English is selected and headlines are missing from both R2 cache and `localStorage`. Headlines published after the last warm-up cycle may trigger this on first load.