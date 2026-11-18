const SNAPSHOT_GIST_URL =
  "https://gist.githubusercontent.com/greenfields-63/8382753efbedb6e5f1b812aad04233d4/raw/sources.json";
const LEGACY_SNAPSHOT_KEY = "newsfeed/cloudflare-news-snapshot.json";
const SNAPSHOT_KEYS = {
  core: "newsfeed/cloudflare-news-snapshot-core.json",
  google: "newsfeed/cloudflare-news-snapshot-google.json",
  regional: "newsfeed/cloudflare-news-snapshot-regional.json",
  published: "newsfeed/cloudflare-news-snapshot-published.json"
};
const RENDER_BACKEND_URL = "https://worldcup-odds-backend.onrender.com";
const TASS_FEED_URL =
  "https://news.google.com/rss/search?q=when%3A3h%20site%3Atass.com&hl=en-US&gl=US&ceid=US%3Aen";
const THE_PAPER_SOURCE = {
  id: "the_paper",
  name: "The Paper (澎湃新闻)",
  feedUrl: "https://news.google.com/rss/search?q=when%3A3h%20site%3Athepaper.cn&hl=zh-CN&gl=CN&ceid=CN%3Azh-Hans",
  language: "zh",
  color: "#D32F2F",
  country: "China"
};
const RTVE_SOURCE = {
  id: "rtve",
  name: "RTVE",
  feedUrl: "https://news.google.com/rss/search?q=when%3A3h%20site%3Artve.es&hl=es&gl=ES&ceid=ES%3Aes",
  language: "es",
  color: "#1565C0",
  country: "Spain"
};
const ABC_AUSTRALIA_SOURCE = {
  id: "abc_australia",
  name: "ABC News Australia",
  feedUrl: "https://news.google.com/rss/search?q=when%3A3h%20site%3Aabc.net.au%2Fnews&hl=en-AU&gl=AU&ceid=AU%3Aen",
  language: "en",
  color: "#0097A7",
  country: "Australia"
};
const SBS_SOURCE = {
  id: "sbs",
  name: "SBS News",
  feedUrl: "https://news.google.com/rss/search?q=when%3A24h%20site%3Asbs.com.au%2Fnews&hl=en-AU&gl=AU&ceid=AU%3Aen",
  language: "en",
  color: "#5D4037",
  country: "Australia"
};
const AL_AKHBAR_SOURCE = {
  id: "al_akhbar",
  name: "Al-Akhbar",
  feedUrl: "https://news.google.com/rss/search?q=when%3A3h%20site%3Aal-akhbar.com&hl=ar&gl=LB&ceid=LB%3Aar",
  language: "ar",
  color: "#2E7D32",
  country: "Lebanon"
};
const AN_NAHAR_SOURCE = {
  id: "an_nahar",
  name: "An-Nahar",
  feedUrl: "https://news.google.com/rss/search?q=when%3A3h%20site%3Aannahar.com&hl=ar&gl=LB&ceid=LB%3Aar",
  language: "ar",
  color: "#1565C0",
  country: "Lebanon"
};
const SUPPLEMENTAL_SOURCES = [
  THE_PAPER_SOURCE,
  RTVE_SOURCE,
  ABC_AUSTRALIA_SOURCE,
  SBS_SOURCE,
  AL_AKHBAR_SOURCE,
  AN_NAHAR_SOURCE
];
const AUSTRALIA_SOURCE_IDS = new Set(["abc_australia", "sbs"]);
const LEBANON_SOURCE_IDS = new Set(["al_akhbar", "an_nahar"]);
const REGIONAL_SOURCE_IDS = new Set([...AUSTRALIA_SOURCE_IDS, ...LEBANON_SOURCE_IDS]);
const GOOGLE_NEWS_HOST = "news.google.com";
const FEED_URL_OVERRIDES = {
  abc: "https://abcnews.com/abcnews/topstories",
  bloomberg: "https://www.bloomberg.com/feeds/politics/news.rss",
  caixin: "https://news.google.com/rss/search?q=when%3A24h%20site%3Acaixinglobal.com&hl=en-US&gl=US&ceid=US%3Aen",
  nhk: "https://news.google.com/rss/search?q=when%3A24h%20site%3Anhk.or.jp&hl=ja&gl=JP&ceid=JP%3Aja",
  sbs: "https://news.google.com/rss/search?q=when%3A24h%20site%3Asbs.com.au%2Fnews&hl=en-AU&gl=AU&ceid=AU%3Aen",
  tass: TASS_FEED_URL
};
const ALLOWED_HOSTS = new Set([
  "news.google.com",
  "www.infobae.com",
  "feeds.folha.uol.com.br",
  "www.scmp.com",
  "en.mercopress.com",
  "www.israelnationalnews.com",
  "www.timesofisrael.com",
  "www.ynet.co.il",
  "www3.nhk.or.jp",
  "ria.ru",
  "tass.com",
  "feeds.bbci.co.uk",
  "abcnews.go.com",
  "abcnews.com",
  "feeds.bloomberg.com",
  "www.bloomberg.com",
  "www.cbsnews.com",
  "moxie.foxnews.com",
  "feeds.nbcnews.com",
  "www.cnn.com",
  "www.france24.com",
  "www.amarujala.com"
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/health") {
      return new Response("Not found", { status: 404 });
    }

    const object = await env.NEWS_SNAPSHOT_BUCKET.get(getSnapshotKey(env));
    return Response.json({
      ok: true,
      group: env.SNAPSHOT_GROUP || "core",
      snapshotKey: getSnapshotKey(env),
      snapshotAvailable: Boolean(object),
      generatedAt: object?.customMetadata?.generatedAt || null
    });
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(refreshSnapshot(env, _controller.scheduledTime));
  }
};

function getSnapshotKey(env) {
  const group = env.SNAPSHOT_GROUP || "core";
  const key = SNAPSHOT_KEYS[group];
  if (!key) throw new Error(`Unknown snapshot group: ${group}`);
  return key;
}

function getSourceFeedHost(source) {
  try {
    return new URL(FEED_URL_OVERRIDES[source.id] || source.feedUrl).hostname;
  } catch {
    return "";
  }
}

async function refreshSnapshot(env, scheduledTime = Date.now()) {
  const group = env.SNAPSHOT_GROUP || "core";
  const gistResponse = await fetch(SNAPSHOT_GIST_URL, {
    headers: { Accept: "application/json" }
  });
  if (!gistResponse.ok) {
    throw new Error(`Could not load source Gist: HTTP ${gistResponse.status}`);
  }

  const gistSources = await gistResponse.json();
  if (!Array.isArray(gistSources)) {
    throw new Error("Source Gist must contain an array");
  }
  const gistIds = new Set(gistSources.map(source => source?.id));
  const sources = [
    ...gistSources,
    ...SUPPLEMENTAL_SOURCES.filter(source => !gistIds.has(source.id))
  ];

  const validSources = sources.filter(source =>
    source &&
    typeof source.id === "string" &&
    /^[a-z0-9_-]+$/i.test(source.id) &&
    typeof source.feedUrl === "string"
  );
  if (!validSources.length) {
    throw new Error("Source Gist contains no valid sources");
  }
  if (new Set(validSources.map(source => source.id)).size !== validSources.length) {
    throw new Error("Source Gist contains duplicate source IDs");
  }
  const sourcesToFetch = validSources.filter(source => {
    if (group === "regional") return REGIONAL_SOURCE_IDS.has(source.id);
    if (group === "google") {
      return getSourceFeedHost(source) === GOOGLE_NEWS_HOST &&
        !REGIONAL_SOURCE_IDS.has(source.id);
    }
    return !REGIONAL_SOURCE_IDS.has(source.id) &&
      getSourceFeedHost(source) !== GOOGLE_NEWS_HOST;
  });
  if (!sourcesToFetch.length) {
    throw new Error("No sources matched this snapshot refresh");
  }

  const snapshotKey = getSnapshotKey(env);
  const previousObject = await env.NEWS_SNAPSHOT_BUCKET.get(snapshotKey);
  const previousSnapshot = previousObject
    ? await previousObject.json()
    : null;
  const previousFeeds = previousSnapshot?.feeds || {};

  const results = await mapWithLimit(sourcesToFetch, sourcesToFetch.length, async source => {
    const startTime = Date.now();
    try {
      const feedUrl = FEED_URL_OVERRIDES[source.id] || source.feedUrl;
      const xml = source.id === "cnn"
        ? await fetchCnnFeed()
        : new URL(feedUrl).hostname === "news.google.com"
          ? await fetchRenderProxyFeed(feedUrl)
          : await fetchRssFeed(feedUrl);
      const duration = Date.now() - startTime;
      console.log(`[PERF] ${source.id}: ${duration}ms`);
      return { id: source.id, xml };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[PERF] ${source.id} FAILED (${duration}ms): ${error.message}`);
      return { id: source.id, error: error.message };
    }
  });

  const fetchedAt = new Date().toISOString();
  const generatedAt = new Date(scheduledTime + 5_000).toISOString();
  const feeds = { ...previousFeeds };
  const errors = { ...(previousSnapshot?.errors || {}) };
  for (const result of results) {
    if (result.xml) {
      feeds[result.id] = { xml: result.xml, fetchedAt };
      delete errors[result.id];
    } else {
      if (previousFeeds[result.id]) feeds[result.id] = previousFeeds[result.id];
      errors[result.id] = `${result.error}; retaining previous copy when available`;
    }
  }

  const snapshot = { generatedAt, feeds, errors };
  await env.NEWS_SNAPSHOT_BUCKET.put(snapshotKey, JSON.stringify(snapshot), {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
      cacheControl: "public, max-age=0, s-maxage=60, stale-while-revalidate=240"
    },
    customMetadata: { generatedAt }
  });

  console.log(
    `Snapshot saved to R2: ${results.filter(result => result.xml).length}/${sourcesToFetch.length} feeds successful`
  );
}

async function fetchRenderProxyFeed(feedUrl) {
  const proxyUrl = new URL("/api/proxy-rss", RENDER_BACKEND_URL);
  proxyUrl.searchParams.set("url", feedUrl);
  const response = await fetch(proxyUrl, {
    signal: AbortSignal.timeout(20000),
    headers: { Accept: "application/rss+xml, application/xml, text/xml" }
  });
  if (!response.ok) {
    throw new Error(`Render Google News proxy returned HTTP ${response.status}`);
  }

  const xml = await response.text();
  if (!/^<(\?xml|rss\b|feed\b|rdf:RDF\b)/i.test(xml.trim())) {
    throw new Error("Render proxy response was not RSS or Atom XML");
  }
  return xml;
}

async function fetchRssFeed(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid feed URL");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS feed URLs are allowed");
  }

  for (let redirects = 0; redirects <= 3; redirects++) {
    if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
      throw new Error(`Feed host is not allowlisted: ${url.hostname}`);
    }

    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Newsfeed/1.0)",
        Referer: `${url.origin}/`,
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"
      }
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirects === 3) throw new Error("Feed redirect limit exceeded");
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) throw new Error(`Upstream feed returned HTTP ${response.status}`);

    const xml = await response.text();
    if (xml.length > 6 * 1024 * 1024) throw new Error("Feed response exceeded 6 MB");
    if (!/^<(\?xml|rss\b|feed\b|rdf:RDF\b)/i.test(xml.trim())) {
      throw new Error("Upstream response was not RSS or Atom XML");
    }
    return xml;
  }

  throw new Error("Could not retrieve feed");
}

async function fetchCnnFeed() {
  const homepageResponse = await fetch("https://www.cnn.com/", {
    signal: AbortSignal.timeout(15000),
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Newsfeed/1.0)",
      Accept: "text/html"
    }
  });
  if (!homepageResponse.ok) {
    throw new Error(`CNN homepage returned HTTP ${homepageResponse.status}`);
  }
  const homepage = await homepageResponse.text();
  const cards = [];
  const seenLinks = new Set();
  const listItems = homepage.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi);

  for (const match of listItems) {
    const block = match[1];
    const titleMatch = block.match(
      /<span\b[^>]*class=["'][^"']*container__headline-text[^"']*["'][^>]*>([\s\S]*?)<\/span>/i
    );
    if (!titleMatch) continue;

    const title = decodeCnnText(titleMatch[1]);
    if (title.length < 12) continue;

    const links = [...block.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)]
      .map(link => link[1]);
    const articlePath = links.find(link =>
      /^\/\d{4}\/\d{2}\/\d{2}\//.test(link) &&
      !/\/(video|videos|watch|audio)\//i.test(link)
    );
    if (!articlePath) continue;

    const articleUrl = new URL(articlePath, "https://www.cnn.com");
    if (articleUrl.hostname !== "www.cnn.com" || seenLinks.has(articleUrl.href)) continue;
    seenLinks.add(articleUrl.href);
    cards.push({ title, url: articleUrl.href });
    if (cards.length >= 12) break;
  }

  const articles = await mapWithLimit(cards, 3, async card => {
    try {
      const response = await fetch(card.url, {
        signal: AbortSignal.timeout(12000),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; Newsfeed/1.0)",
          Accept: "text/html"
        }
      });
      if (!response.ok) throw new Error(`CNN article returned HTTP ${response.status}`);
      const html = await response.text();
      if (html.length > 8 * 1024 * 1024) throw new Error("CNN article exceeded 8 MB");
      const pubDate = getCnnArticleDate(html);
      return pubDate ? { ...card, pubDate } : null;
    } catch (error) {
      console.warn(`CNN article fetch failed for ${card.url}:`, error.message);
      return null;
    }
  });

  const items = articles
    .filter(article => article && Date.now() - article.pubDate.getTime() <= 3 * 60 * 60 * 1000)
    .map(article => `
      <item>
        <title>${escapeXml(article.title)}</title>
        <link>${escapeXml(article.url)}</link>
        <pubDate>${article.pubDate.toUTCString()}</pubDate>
        <guid isPermaLink="true">${escapeXml(article.url)}</guid>
      </item>
    `);

  if (!items.length) throw new Error("CNN returned no recent articles with valid timestamps");
  return `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0"><channel>
      <title>CNN Recent Headlines</title>
      <link>https://www.cnn.com/</link>
      <description>Recent CNN headlines with publisher timestamps</description>
      ${items.join("\n")}
    </channel></rss>`;
}

function decodeCnnText(value) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getCnnArticleDate(articleHtml) {
  const dates = [];
  const metaTags = articleHtml.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    const name = tag.match(/\b(?:name|property|itemprop)=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const content = tag.match(/\bcontent=["']([^"']+)["']/i)?.[1];
    if (
      content &&
      name &&
      /article:published_time|article:modified_time|datepublished|datemodified|pubdate|publishdate|parsely-pub-date/.test(name)
    ) {
      const time = Date.parse(content);
      if (Number.isFinite(time)) dates.push(time);
    }
  }

  const scripts = articleHtml.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  function collectDates(value) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) return value.forEach(collectDates);
    const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
    if (types.some(type => /article|liveblog/i.test(type || ""))) {
      for (const key of ["dateModified", "datePublished"]) {
        const time = Date.parse(value[key] || "");
        if (Number.isFinite(time)) dates.push(time);
      }
    }
    Object.values(value).forEach(collectDates);
  }
  for (const match of scripts) {
    try {
      collectDates(JSON.parse(match[1]));
    } catch {
      // Ignore malformed page metadata and continue checking other dates.
    }
  }
  return dates.length ? new Date(Math.max(...dates)) : null;
}

async function mapWithLimit(items, limit, callback) {
  const results = new Array(items.length);
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await callback(items[index]);
      }
    })
  );
  return results;
}
