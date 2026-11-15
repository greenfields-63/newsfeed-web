const SNAPSHOT_BUCKET_NAME = "worldcup-data";
const PARTITION_KEYS = [
  "newsfeed/cloudflare-news-snapshot-core.json",
  "newsfeed/cloudflare-news-snapshot-google.json",
  "newsfeed/cloudflare-news-snapshot-regional.json"
];
const PUBLISHED_KEY = "newsfeed/cloudflare-news-snapshot-published.json";
const LEGACY_KEY = "newsfeed/cloudflare-news-snapshot.json";
const SIGNALS_KEY = "newsfeed/signals.json";

export default {
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(publishSnapshot(env, controller.scheduledTime));
  },

  async fetch() {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
};

async function publishSnapshot(env, scheduledTime) {
  const bucket = env.NEWS_SNAPSHOT_BUCKET;
  if (!bucket) throw new Error("News snapshot storage is not configured");

  const expectedCycle = new Date(
    Math.floor(scheduledTime / 300_000) * 300_000
  ).toISOString();
  const [objects, publishedObject] = await Promise.all([
    Promise.all(PARTITION_KEYS.map(key => bucket.get(key))),
    bucket.get(PUBLISHED_KEY)
  ]);
  const snapshots = await Promise.all(
    objects.map(object => object ? object.json() : null)
  );
  const legacyObject = publishedObject ? null : await bucket.get(LEGACY_KEY);
  const previous = publishedObject
    ? await publishedObject.json()
    : legacyObject
      ? await legacyObject.json()
      : { feeds: {}, errors: {} };

  const feeds = { ...(previous.feeds || {}) };
  const errors = { ...(previous.errors || {}) };
  let signals = previous.signals || [];
  try {
    const signalsObject = await bucket.get(SIGNALS_KEY);
    if (signalsObject) {
      const savedSignals = await signalsObject.json();
      if (!Array.isArray(savedSignals)) throw new Error("Stored signals data is invalid");
      signals = savedSignals
        .filter(signal => signal.status === "published")
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    } else {
      signals = [];
    }
  } catch (error) {
    console.error("Could not load Signals while publishing snapshot:", error.message);
  }
  let updatedPartitions = 0;

  for (const snapshot of snapshots) {
    if (!snapshot) continue;
    const snapshotTime = Date.parse(snapshot.generatedAt);
    const isCurrentCycle = Number.isFinite(snapshotTime) &&
      Math.abs(snapshotTime - scheduledTime) <= 150_000;
    const isInitialPublish = !publishedObject && !legacyObject;
    if (!isCurrentCycle && !isInitialPublish) continue;

    Object.assign(feeds, snapshot.feeds || {});
    Object.assign(errors, snapshot.errors || {});
    updatedPartitions++;
  }

  const published = {
    generatedAt: expectedCycle,
    feeds,
    errors,
    signals
  };
  await bucket.put(PUBLISHED_KEY, JSON.stringify(published), {
    httpMetadata: {
      contentType: "application/json; charset=utf-8",
      cacheControl: "public, max-age=0, s-maxage=20"
    },
    customMetadata: { generatedAt: expectedCycle }
  });

  console.log(
    `Published ${updatedPartitions}/${PARTITION_KEYS.length} current partitions with ${Object.keys(feeds).length} feeds`
  );
}
