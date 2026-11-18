const PUBLISHED_SNAPSHOT_KEY = "newsfeed/cloudflare-news-snapshot-published.json";
const LEGACY_SNAPSHOT_OBJECT_KEY = "newsfeed/cloudflare-news-snapshot.json";
const PARTITION_SNAPSHOT_KEYS = [
  "newsfeed/cloudflare-news-snapshot-core.json",
  "newsfeed/cloudflare-news-snapshot-google.json",
  "newsfeed/cloudflare-news-snapshot-regional.json"
];
const SNAPSHOT_CACHE_CONTROL = "public, max-age=0, s-maxage=5";

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
      return Response.json({
        generatedAt,
        feeds,
        errors,
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
