// Scheduled news snapshot publisher. Paste above the Render backend's boot sequence.
// Requires existing app, axios, s3, PutObjectCommand, GetObjectCommand,
// fetchAllowlistedRss, mapWithLimit, and PORT definitions.
const NEWS_SNAPSHOT_GIST_URL =
  "https://gist.githubusercontent.com/greenfields-63/8382753efbedb6e5f1b812aad04233d4/raw/sources.json";
const NEWS_SNAPSHOT_OBJECT_KEY = "newsfeed/news-snapshot.json";
const NEWS_SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
const TASS_SNAPSHOT_FEED_URL =
  "https://news.google.com/rss/search?q=when%3A3h%20site%3Atass.com&hl=en-US&gl=US&ceid=US%3Aen";

// Required by the current Gist source list; all snapshot URLs still pass through the allowlist.
ALLOWED_RSS_HOSTS.add("feeds.nbcnews.com");

let latestNewsSnapshot = null;
let newsSnapshotRefreshPromise = null;

async function loadNewsSnapshotFromR2() {
  try {
    const object = await s3.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: NEWS_SNAPSHOT_OBJECT_KEY
    }));
    const savedSnapshot = JSON.parse(await object.Body.transformToString());
    if (!savedSnapshot || !savedSnapshot.feeds || typeof savedSnapshot.feeds !== "object") {
      throw new Error("Stored news snapshot has an invalid format");
    }
    latestNewsSnapshot = savedSnapshot;
  } catch (error) {
    if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) return;
    throw error;
  }
}

async function refreshNewsSnapshot() {
  const response = await axios.get(NEWS_SNAPSHOT_GIST_URL, {
    timeout: 15000,
    headers: { Accept: "application/json" }
  });
  const sources = response.data;
  if (!Array.isArray(sources)) {
    throw new Error("Gist source list must be an array");
  }

  const validSources = sources.filter(source =>
    source &&
    typeof source.id === "string" &&
    /^[a-z0-9_-]+$/i.test(source.id) &&
    typeof source.feedUrl === "string"
  );
  if (!validSources.length) {
    throw new Error("Gist source list contains no valid sources");
  }
  if (new Set(validSources.map(source => source.id)).size !== validSources.length) {
    throw new Error("Gist source list contains duplicate source IDs");
  }

  const results = await mapWithLimit(validSources, 4, async source => {
    try {
      let xml;
      if (source.id === "cnn") {
        const cnnResponse = await axios.get(`http://127.0.0.1:${PORT}/api/cnn-scraped`, {
          responseType: "text",
          timeout: 60000
        });
        xml = cnnResponse.data;
      } else {
        const feedUrl = source.id === "tass" ? TASS_SNAPSHOT_FEED_URL : source.feedUrl;
        xml = await fetchAllowlistedRss(feedUrl);
      }

      return { id: source.id, xml };
    } catch (error) {
      console.error(`News snapshot fetch failed for ${source.id}:`, error.message);
      return { id: source.id, error: error.message };
    }
  });

  const previousFeeds = latestNewsSnapshot?.feeds || {};
  const feeds = {};
  const errors = {};
  for (const result of results) {
    if (result.xml) {
      feeds[result.id] = {
        xml: result.xml,
        fetchedAt: new Date().toISOString()
      };
    } else {
      if (previousFeeds[result.id]) feeds[result.id] = previousFeeds[result.id];
      errors[result.id] = "Feed fetch failed; retaining the previous successful copy when available";
    }
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    feeds,
    errors
  };
  const body = JSON.stringify(snapshot);

  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: NEWS_SNAPSHOT_OBJECT_KEY,
    Body: body,
    ContentType: "application/json",
    CacheControl: "public, max-age=0, s-maxage=60, stale-while-revalidate=240"
  }));

  latestNewsSnapshot = snapshot;
  const successfulCount = results.filter(result => result.xml).length;
  console.log(`News snapshot published to R2: ${successfulCount}/${validSources.length} feeds successful`);
}

function runNewsSnapshotRefresh() {
  if (newsSnapshotRefreshPromise) return newsSnapshotRefreshPromise;

  newsSnapshotRefreshPromise = refreshNewsSnapshot()
    .catch(error => {
      console.error("News snapshot refresh failed:", error.message);
    })
    .finally(() => {
      newsSnapshotRefreshPromise = null;
    });

  return newsSnapshotRefreshPromise;
}

async function startNewsSnapshotService() {
  try {
    await loadNewsSnapshotFromR2();
    if (latestNewsSnapshot) {
      console.log(`Loaded existing news snapshot from R2 (${latestNewsSnapshot.generatedAt}).`);
    }
  } catch (error) {
    console.error("Could not load the previous news snapshot from R2:", error.message);
  }

  runNewsSnapshotRefresh();
  setInterval(runNewsSnapshotRefresh, NEWS_SNAPSHOT_INTERVAL_MS);
}
