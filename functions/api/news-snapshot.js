const PUBLISHED_SNAPSHOT_KEY = "newsfeed/cloudflare-news-snapshot-published.json";
const LEGACY_SNAPSHOT_OBJECT_KEY = "newsfeed/cloudflare-news-snapshot.json";
const PARTITION_SNAPSHOT_KEYS = [
  "newsfeed/cloudflare-news-snapshot-core.json",
  "newsfeed/cloudflare-news-snapshot-google.json",
  "newsfeed/cloudflare-news-snapshot-regional.json"
];
const SNAPSHOT_CACHE_CONTROL = "public, max-age=0, s-maxage=5, stale-while-revalidate=60";

export async function onRequestGet({ env }) {
  const bucket = env.NEWS_SNAPSHOT_BUCKET;
  if (!bucket) {
    return Response.json({ error: "News snapshot storage is not configured" }, { status: 503 });
  }
  try {
    const object = await bucket.get(PUBLISHED_SNAPSHOT_KEY);
    if (object) {
      return new Response(object.body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": SNAPSHOT_CACHE_CONTROL,
          "ETag": object.httpEtag
        }
      });
    }

    const [legacyObject, ...partitionObjects] = await Promise.all([
      bucket.get(LEGACY_SNAPSHOT_OBJECT_KEY),
      ...PARTITION_SNAPSHOT_KEYS.map(key => bucket.get(key))
    ]);
    const snapshots = await Promise.all(
      [legacyObject, ...partitionObjects]
        .filter(Boolean)
        .map(snapshot => snapshot.json())
    );
    if (!snapshots.length) {
      return Response.json({ error: "News snapshot is not available yet" }, { status: 503 });
    }

    const fallbackSnapshot = {
      generatedAt: snapshots
        .map(snapshot => snapshot.generatedAt)
        .filter(Boolean)
        .sort()
        .at(-1),
      feeds: Object.assign({}, ...snapshots.map(snapshot => snapshot.feeds || {})),
      errors: Object.assign({}, ...snapshots.map(snapshot => snapshot.errors || {}))
    };
    return Response.json(fallbackSnapshot, {
      headers: { "Cache-Control": SNAPSHOT_CACHE_CONTROL }
    });
  } catch (error) {
    console.error("Could not read the news snapshot from R2:", error);
    return Response.json({ error: "News snapshot is temporarily unavailable" }, { status: 502 });
  }
}
