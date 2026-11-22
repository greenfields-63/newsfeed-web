# Newsfeed Web Project

This project is a real-time breaking news aggregator and commentary platform. The Android app scaffolding has been removed; focus is exclusively on the web application located in the `web/` directory.

## 🚀 Deployment Workflow (CRITICAL FOR AI ASSISTANTS & DEVELOPERS)
- **Host:** Cloudflare Pages
- **Source:** Connected to GitHub repository (`origin/main`)
- **Important:** Whenever any changes are made to static files in `web/` (such as `web/public/app.js`, `web/public/index.html`, or `web/public/sw.js`), **changes must be committed and pushed to GitHub (`git push origin main`)** to trigger a Cloudflare Pages deployment. Local edits will not appear live on the web until pushed and built by Cloudflare.
- **Background workers:** `web/news-worker/` deploys separately via `wrangler deploy -c <config>` (three snapshot cron workers + one publisher cron worker).

## Project Structure
- `web/public/`: Frontend static files (`index.html`, `app.js`, `sw.js`, etc.)
- `web/functions/`: Cloudflare Pages serverless functions (RSS fetching, news snapshot API, translation API, summary API, Google News article resolver)
- `web/news-worker/`: Background worker scripts (snapshot cron ×3 groups, publisher cron)

## 🌍 English Translation (Workers AI)
- Non-English headlines are translated to English **server-side** by `functions/api/translate.js` using Cloudflare Workers AI (`@cf/google/gemma-4-26b-a4b-it`, thinking disabled).
- **Request contract:** `POST /api/translate` with `{ "target": "en", "items": [{ "id", "text", "lang" }] }` → `{ "translations": { "<id>": "<english>" } }`. Only English is supported server-side; other languages are left to the browser's built-in translator (noted in the settings modal).
- **Batching:** up to 300 items per request, 40 per AI chunk. Client processes chunks concurrently via `Promise.all`; worker processes chunks with concurrency limit of 3.
- **Caching:** translations are cached in R2 at `newsfeed/translations-cache.json` (hashed text-only keys) **and** in the browser's `localStorage` (`newsfeed_translation_cache`). Client `localStorage` is capped at 2,000 entries with automatic LRU pruning to prevent `QuotaExceededError`. The shared R2 cache ensures each unique headline is translated once for all readers.
- **Cron warm-up:** each snapshot cron worker (core/google/regional, every 10 min) extracts non-English headlines from freshly fetched feeds and POSTs them to `/api/translate` **before** the snapshot is written to R2, so translations are cached before any user can see the headlines. Warm-up has no per-group headline cap. Each warm-up chunk retries up to 3 times with backoff on failure.
- **UI:** the "Translate foreign headlines to English" checkbox (`#translate-to-english`) is checked by default on first run; the choice is persisted in `newsfeed_headline_language`. When English is selected, headlines are rendered after translation completes — no flash of foreign text.
- **Reliability:** if the AI call fails, the endpoint returns cached results only and the UI falls back to original headlines.
- **Diagnostics:** `GET /api/translate` returns cache stats (`entries`, `sizeBytes`, `updatedAt`); `POST` with `"debug": true` returns per-request `neurons`.

## 🧭 Regional AI Briefing
- `functions/api/summary.js` groups headlines into macro-regions and generates a short English briefing per region with Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`).
- **Regions:** Middle East, Europe, Russia & CIS, Asia (East + South), Asia-Pacific, North America, Latin America, Global. Mapping lives in `REGION_OF_SOURCE`.
- **Schedule:** 3 briefings/day aligned to **05:00 / 13:00 / 21:00 UTC** (07:00 / 15:00 / 23:00 Israel time). The publisher cron calls `/api/summary` every 10 min at `:00`; if the current slot is cached it costs 0 neurons, if it's a new slot it generates and caches it. Briefings are generated before any user request — not on first visit.
- **Performance:** Summary generation runs with `mapWithLimit` concurrency 2 across target regions to complete within ~10–15 seconds and prevent Cloudflare Worker 504 gateway timeouts on slot boundaries.
- **Cached** in R2 at `newsfeed/summaries/v7/{slot}.json`, generated once per slot and shared by all readers.
- **Output format** is plain text (`LEAD:` line + `- bullet` lines) rather than JSON, avoiding parse failures from headlines containing quotes. Up to 12 headlines are used per region per brief. All output is English-only; non-Latin text (detected via `NON_LATIN_PATTERN`) triggers an automatic retry.
- **UI:** a collapsible "Regional Briefing" panel, **closed by default**. Sub-accordions for each region feature animated chevron disclosure indicators and point counts.

## 📡 Seth's Signals (Analysis & Commentary)
- Independent analysis and commentary published via private admin dashboard (`/signals-admin`) and rendered above the news feed (`#signals-section`).
- **Backend:** `render-signals-routes.js` provides Bearer token authorized CRUD endpoints (`/api/admin/signals`), storing signals in R2 (`newsfeed/signals.json`).
- **Public Feed:** `GET /api/signals` returns published signals sorted by `updatedAt` descending, included automatically in the published snapshot payload.
- **UI Rendering:** Signal cards feature a responsive snippet preview in `<summary>` when collapsed, which automatically hides (`group-open:hidden`) when expanded to present the full commentary cleanly without text duplication.

## 🔗 Article URL Resolution
- `functions/api/resolve-google-news-article.js` inspects Google News article redirects and HTML payloads (`data-n-au` / `c-wiz` links) to resolve underlying publisher URLs for seamless translation and direct publisher navigation.

## ⚙️ Workers AI Configuration & Cost
- Workers AI binding: `[ai] binding = "AI"` in `web/wrangler.toml`; R2 binding `NEWS_SNAPSHOT_BUCKET` (bucket `worldcup-data`).
- **Models:** Translation uses Gemma 4 26B (`@cf/google/gemma-4-26b-a4b-it`, thinking off). Briefings use Llama 3.3 70B (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`).
- **Free tier:** **10,000 Neurons/day**, resetting at 00:00 UTC. Workers Paid bills `$0.011 / 1,000 Neurons` above the free allocation.
- **Measured translation cost:** roughly **0.6 Neurons per headline** (Gemma 4, thinking off).
- **Regional briefings:** roughly **300 Neurons per slot** (~900/day for 3 slots × 8 regions), well within the free tier.

## ⏱️ Time Display & Accessibility
- All times in the UI (snapshot updated, briefing timestamp, headline timestamps, signal timestamps) render in the device's local timezone via browser `Intl` APIs (`toLocaleTimeString`/`toLocaleString`).
- Headlines with `pubDate` in the future are rejected rather than clamped to "now", preventing clock skew from pinning stale items.
- The sources settings modal (`#settings-modal`) supports `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and closing via the `Escape` key.

## Known Limitations
- Translation cache warm-up runs before the snapshot is published to R2; if warm-up fails on a cycle, some headlines may not be pre-translated until the next cycle or live client request.
- Workers AI model cold starts can add latency when a model hasn't been invoked recently.
