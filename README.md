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
