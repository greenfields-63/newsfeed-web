const PUBLISHED_SNAPSHOT_KEY = "newsfeed/cloudflare-news-snapshot-published.json";
const LEGACY_SNAPSHOT_OBJECT_KEY = "newsfeed/cloudflare-news-snapshot.json";
const PARTITION_SNAPSHOT_KEYS = [
  "newsfeed/cloudflare-news-snapshot-core.json",
  "newsfeed/cloudflare-news-snapshot-google.json",
  "newsfeed/cloudflare-news-snapshot-regional.json"
];
const TRANSLATION_CACHE_KEYS = [
  "newsfeed/translations-cache-core.json",
  "newsfeed/translations-cache-google.json",
  "newsfeed/translations-cache-regional.json",
  "newsfeed/translations-cache.json"
];
const SNAPSHOT_CACHE_CONTROL = "public, max-age=0, s-maxage=5";

function hashKey(str) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return "h" + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function normalizeText(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function decodeXmlText(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function extractTitlesFromXml(xml) {
  const titles = [];
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) || [];
  for (const block of blocks) {
    const match = block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    if (match) {
      let title = decodeXmlText(match[1]);
      titles.push(normalizeText(title));
    }
  }
  return titles;
}

export async function onRequestGet({ env }) {
  const bucket = env.NEWS_SNAPSHOT_BUCKET;
  if (!bucket) {
    return Response.json({ error: "News snapshot storage is not configured" }, { status: 503 });
  }
  try {
    const [publishedObject, ...partitionObjects] = await Promise.all([
      bucket.get(PUBLISHED_SNAPSHOT_KEY),
      ...PARTITION_SNAPSHOT_KEYS.map(key => bucket.get(key))
    ]);
    const published = publishedObject ? await publishedObject.json() : null;
    const partitions = (
      await Promise.all(
        partitionObjects.filter(Boolean).map(object => object.json())
      )
    ).filter(Boolean);

    // Build merged translation cache from per-group keys + legacy shared key
    const translationCacheObjs = await Promise.all(
      TRANSLATION_CACHE_KEYS.map(key => bucket.get(key))
    );
    const translationCache = {};
    for (const obj of translationCacheObjs) {
      if (obj) {
        const data = await obj.json().catch(() => ({}));
        Object.assign(translationCache, data);
      }
    }

    // Prefer the live partition snapshots: the fetch workers rewrite these within
    // seconds of each cron run, so serving them directly avoids the publisher delay.
    if (partitions.length) {
      const feeds = Object.assign({}, ...partitions.map(partition => partition.feeds || {}));
      const errors = Object.assign({}, ...partitions.map(partition => partition.errors || {}));
      const generatedAt = partitions
        .map(partition => partition.generatedAt)
        .filter(Boolean)
        .sort()
        .at(-1) || published?.generatedAt || null;

      // Build translations map: hashKey(normalizedTitle) -> english translation
      const translations = {};
      for (const partition of partitions) {
        const partitionFeeds = partition.feeds || {};
        for (const sourceId of Object.keys(partitionFeeds)) {
          const feed = partitionFeeds[sourceId];
          if (!feed || typeof feed.xml !== 'string') continue;
          const titles = extractTitlesFromXml(feed.xml);
          for (const title of titles) {
            const key = hashKey(title);
            if (translationCache[key]) {
              translations[key] = translationCache[key];
            }
          }
        }
      }

      return Response.json({
        generatedAt,
        feeds,
        errors,
        translations,
        signals: Array.isArray(published?.signals) ? published.signals : []
      }, {
        headers: { "Cache-Control": SNAPSHOT_CACHE_CONTROL }
      });
    }

    // Fallbacks: the publisher bundle, then the legacy single-object snapshot.
    if (published) {
      return Response.json(published, {
        headers: { "Cache-Control": SNAPSHOT_CACHE_CONTROL }
      });
    }

    const legacyObject = await bucket.get(LEGACY_SNAPSHOT_OBJECT_KEY);
    if (legacyObject) {
      return new Response(legacyObject.body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": SNAPSHOT_CACHE_CONTROL,
          "ETag": legacyObject.httpEtag
        }
      });
    }

    return Response.json({ error: "News snapshot is not available yet" }, { status: 503 });
  } catch (error) {
    console.error("Could not read the news snapshot from R2:", error);
    return Response.json({ error: "News snapshot is temporarily unavailable" }, { status: 502 });
  }
}
