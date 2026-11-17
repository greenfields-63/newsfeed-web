const SNAPSHOT_BUCKET_NAME = "worldcup-data";
const PARTITION_KEYS = [
  "newsfeed/cloudflare-news-snapshot-core.json",
  "newsfeed/cloudflare-news-snapshot-google.json",
  "newsfeed/cloudflare-news-snapshot-regional.json"
];
const PUBLISHED_KEY = "newsfeed/cloudflare-news-snapshot-published.json";
const LEGACY_KEY = "newsfeed/cloudflare-news-snapshot.json";
const SIGNALS_KEY = "newsfeed/signals.json";

const SOURCE_METADATA = [
  { id: "infobae", name: "Infobae", country: "Argentina" },
  { id: "caixin", name: "Caixin Global", country: "China" },
  { id: "the_paper", name: "The Paper (澎湃新闻)", country: "China" },
  { id: "rtve", name: "RTVE", country: "Spain" },
  { id: "scmp", name: "South China Morning Post", country: "China" },
  { id: "xinhua", name: "Xinhua News", country: "China" },
  { id: "abc_australia", name: "ABC News Australia", country: "Australia" },
  { id: "sbs", name: "SBS News", country: "Australia" },
  { id: "mercopress", name: "MercoPress", country: "Global" },
  { id: "reuters", name: "Reuters", country: "Global" },
  { id: "france24", name: "France 24", country: "France" },
  { id: "israel_hayom", name: "Israel Hayom", country: "Israel" },
  { id: "inn", name: "Israel National News", country: "Israel" },
  { id: "jpost", name: "Jerusalem Post", country: "Israel" },
  { id: "times_of_israel", name: "Times of Israel", country: "Israel" },
  { id: "ynet", name: "Ynet", country: "Israel" },
  { id: "nhk", name: "NHK News", country: "Japan" },
  { id: "ria", name: "RIA Novosti", country: "Russia" },
  { id: "tass", name: "TASS", country: "Russia" },
  { id: "al_arabiya", name: "Al Arabiya", country: "Saudi Arabia" },
  { id: "al_akhbar", name: "Al-Akhbar", country: "Lebanon" },
  { id: "an_nahar", name: "An-Nahar", country: "Lebanon" },
  { id: "bbc", name: "BBC News", country: "United Kingdom" },
  { id: "sky", name: "Sky News", country: "United Kingdom" },
  { id: "abc", name: "ABC News", country: "United States" },
  { id: "ap", name: "Associated Press", country: "United States" },
  { id: "bloomberg", name: "Bloomberg", country: "United States" },
  { id: "cbs", name: "CBS News", country: "United States" },
  { id: "cnn", name: "CNN", country: "United States" },
  { id: "fox", name: "Fox News", country: "United States" },
  { id: "amar_ujala", name: "Amar Ujala", country: "India" },
  { id: "nbc", name: "NBC News", country: "United States" }
].sort((a, b) => a.name.localeCompare(b.name));

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
    Math.floor(scheduledTime / 600_000) * 600_000
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

  let updatedPartitions = 0;
  for (const snapshot of snapshots) {
    if (!snapshot) continue;
    const snapshotTime = Date.parse(snapshot.generatedAt);
    const isCurrentCycle = Number.isFinite(snapshotTime) &&
      Math.abs(snapshotTime - scheduledTime) <= 600_000;
    const isInitialPublish = !publishedObject && !legacyObject;
    if (!isCurrentCycle && !isInitialPublish) continue;

    Object.assign(feeds, snapshot.feeds || {});
    Object.assign(errors, snapshot.errors || {});
    updatedPartitions++;
  }

  await checkAndRunWeeklyAudit(bucket, feeds, scheduledTime, false);

  let signals = [];
  try {
    const signalsObject = await bucket.get(SIGNALS_KEY);
    if (signalsObject) {
      const savedSignals = await signalsObject.json();
      if (!Array.isArray(savedSignals)) throw new Error("Stored signals data is invalid");
      signals = savedSignals
        .filter(signal => signal.status === "published")
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    }
  } catch (error) {
    console.error("Could not load Signals while publishing snapshot:", error.message);
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

async function checkAndRunWeeklyAudit(bucket, feeds, scheduledTime, forceRun = false) {
  const date = new Date(scheduledTime || Date.now());
  const isWeeklySchedule = date.getUTCDay() === 0 && date.getUTCHours() === 0 && date.getUTCMinutes() < 5;
  if (!isWeeklySchedule && !forceRun) return;

  const fortyEightHoursAgo = date.getTime() - (48 * 60 * 60 * 1000);
  const auditDateStr = date.toISOString().split("T")[0];
  const auditTag = `[Weekly Audit ${auditDateStr}]`;

  let rawSignals = [];
  try {
    const obj = await bucket.get(SIGNALS_KEY);
    if (obj) rawSignals = await obj.json();
  } catch (e) {
    rawSignals = [];
  }
  if (!Array.isArray(rawSignals)) rawSignals = [];

  const alreadyAudited = !forceRun && rawSignals.some(s => typeof s.text === "string" && s.text.includes(auditTag));
  if (alreadyAudited) return;

  const lines = [
    `📊 Weekly Source Health Audit Report ${auditTag}`,
    `Date: ${date.toUTCString()}`,
    `Total Monitored Sources: ${SOURCE_METADATA.length}`,
    ""
  ];

  let staleCount = 0;
  SOURCE_METADATA.forEach((source, index) => {
    const feed = feeds[source.id];
    const xml = feed?.xml || "";
    const pubDateMatches = [...xml.matchAll(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/gi)];
    const dates = pubDateMatches.map(m => Date.parse(m[1].trim())).filter(t => !isNaN(t));
    const latestDate = dates.length ? Math.max(...dates) : null;
    const isStale = !latestDate || latestDate < fortyEightHoursAgo;

    let dateStr = "No articles / Invalid date";
    if (latestDate) {
      const d = new Date(latestDate);
      dateStr = `${d.toISOString().replace("T", " ").slice(0, 16)} UTC`;
    }

    const numStr = String(index + 1).padStart(2, " ");
    if (isStale) {
      staleCount++;
      lines.push(`**${numStr}. ${source.name} (${source.id}) - ${source.country} | ${dateStr} (STALE >48h)**`);
    } else {
      lines.push(`${numStr}. ${source.name} (${source.id}) - ${source.country} | ${dateStr}`);
    }
  });

  lines.push("");
  lines.push(`Summary: ${SOURCE_METADATA.length - staleCount} Active, ${staleCount} Stale (>48h).`);

  const auditSignal = {
    id: `audit-${Date.now()}`,
    text: lines.join("\n"),
    links: [],
    status: "draft",
    createdAt: date.toISOString(),
    updatedAt: date.toISOString()
  };

  const updatedSignals = [auditSignal, ...rawSignals];
  await bucket.put(SIGNALS_KEY, JSON.stringify(updatedSignals), {
    httpMetadata: { contentType: "application/json" },
    customMetadata: { lastAudit: auditDateStr }
  });

  console.log(`Weekly Health Audit generated (${staleCount} stale sources flagged).`);
}
