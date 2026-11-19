const PARTITION_SNAPSHOT_KEYS = [
  "newsfeed/cloudflare-news-snapshot-core.json",
  "newsfeed/cloudflare-news-snapshot-google.json",
  "newsfeed/cloudflare-news-snapshot-regional.json"
];
const AI_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";
const REGION_ORDER = [
  "Middle East",
  "Europe",
  "Russia & CIS",
  "Asia",
  "Asia-Pacific",
  "North America",
  "Latin America",
  "Global"
];
const MAX_TITLES_PER_REGION = 16;

const REGION_OF_SOURCE = {
  infobae: "Latin America",
  caixin: "Asia",
  scmp: "Asia",
  xinhua: "Asia",
  the_paper: "Asia",
  nhk: "Asia",
  amar_ujala: "Asia",
  israel_hayom: "Middle East",
  inn: "Middle East",
  jpost: "Middle East",
  times_of_israel: "Middle East",
  ynet: "Middle East",
  al_arabiya: "Middle East",
  al_akhbar: "Middle East",
  an_nahar: "Middle East",
  bbc: "Europe",
  sky: "Europe",
  france24: "Europe",
  rtve: "Europe",
  ria: "Russia & CIS",
  tass: "Russia & CIS",
  abc: "North America",
  ap: "North America",
  bloomberg: "North America",
  cbs: "North America",
  cnn: "North America",
  fox: "North America",
  nbc: "North America",
  abc_australia: "Asia-Pacific",
  sbs: "Asia-Pacific",
  reuters: "Global",
  mercopress: "Global"
};

export async function onRequestGet(context) {
  const { env } = context;
  const bucket = env.NEWS_SNAPSHOT_BUCKET;
  if (!bucket) {
    return Response.json({ error: "Storage is not configured" }, { status: 503 });
  }
  const slot = getSlotInfo();
  const cacheKey = `newsfeed/summaries/${slot.key}.json`;

  try {
    const cachedObject = await bucket.get(cacheKey);
    if (cachedObject) {
      const cached = await cachedObject.json().catch(() => null);
      if (cached && Array.isArray(cached.regions) && cached.regions.length) {
        return Response.json(
          { status: "ready", slotKey: slot.key, generatedAt: cached.generatedAt, regions: cached.regions, cached: true },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
    }
  } catch (error) {
    console.warn("Summary cache read failed:", error.message);
  }

  if (!env.AI) {
    return Response.json({ error: "AI is not configured" }, { status: 503 });
  }

  try {
    const feeds = await loadMergedFeeds(bucket);
    const grouped = groupTitlesByRegion(feeds);
    const targets = REGION_ORDER
      .map(region => ({ region, titles: grouped[region] || [] }))
      .filter(entry => entry.titles.length > 0);

    if (!targets.length) {
      return Response.json({ error: "No headlines available to summarize yet" }, { status: 503 });
    }

    const results = await mapWithLimit(targets, 4, target => summarizeRegion(env, target.region, target.titles));
    const regions = results.filter(Boolean);
    if (!regions.length) {
      return Response.json({ error: "Could not generate a summary" }, { status: 502 });
    }

    const payload = {
      slotKey: slot.key,
      generatedAt: new Date().toISOString(),
      regions
    };
    await bucket.put(cacheKey, JSON.stringify(payload), {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
      customMetadata: { generatedAt: payload.generatedAt }
    });

    return Response.json(
      { status: "ready", slotKey: slot.key, generatedAt: payload.generatedAt, regions, cached: false },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Summary generation failed:", error.message);
    return Response.json({ error: "Summary is temporarily unavailable" }, { status: 502 });
  }
}

function getSlotInfo(now = new Date()) {
  const hour = now.getUTCHours();
  let slotHour;
  if (hour < 6) slotHour = 18;
  else if (hour < 12) slotHour = 6;
  else if (hour < 18) slotHour = 12;
  else slotHour = 18;

  const start = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    slotHour
  ));
  if (hour < 6) start.setUTCDate(start.getUTCDate() - 1);

  return { key: start.toISOString().slice(0, 13), start };
}

async function loadMergedFeeds(bucket) {
  const objects = await Promise.all(PARTITION_SNAPSHOT_KEYS.map(key => bucket.get(key)));
  const partitions = (await Promise.all(objects.filter(Boolean).map(obj => obj.json().catch(() => null)))).filter(Boolean);
  const feeds = {};
  for (const partition of partitions) {
    Object.assign(feeds, partition.feeds || {});
  }
  return feeds;
}

function regionForSource(sourceId) {
  return REGION_OF_SOURCE[sourceId] || null;
}

function groupTitlesByRegion(feeds) {
  const grouped = {};
  for (const [sourceId, feed] of Object.entries(feeds)) {
    const region = regionForSource(sourceId);
    if (!region || !feed || typeof feed.xml !== "string") continue;
    const items = extractFeedItems(feed.xml);
    if (!items.length) continue;
    const bucketForRegion = grouped[region] || (grouped[region] = []);
    for (const item of items) bucketForRegion.push(item);
  }

  for (const region of Object.keys(grouped)) {
    grouped[region] = dedupeAndTake(grouped[region], MAX_TITLES_PER_REGION);
  }
  return grouped;
}

function extractFeedItems(xml) {
  const items = [];
  const blockPattern = /<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = blockPattern.exec(xml)) !== null) {
    const block = match[2];
    const titleMatch = block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    if (!titleMatch) continue;
    const title = decodeEntities(stripCdata(titleMatch[1])).replace(/\s+/g, " ").trim();
    if (title.length < 8) continue;
    const dateMatch = block.match(/<(pubDate|published|updated)\b[^>]*>([\s\S]*?)<\/\1>/i);
    const time = dateMatch ? Date.parse(dateMatch[2].trim()) : NaN;
    items.push({ title, time: Number.isFinite(time) ? time : 0 });
  }
  return items;
}

function stripCdata(value) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function decodeEntities(value) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

function dedupeAndTake(items, limit) {
  const seen = new Set();
  const unique = [];
  for (const item of items) {
    const key = item.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  unique.sort((a, b) => (b.time || 0) - (a.time || 0));
  return unique.slice(0, limit).map(item => item.title);
}

async function summarizeRegion(env, region, titles) {
  const system = [
    "You are a concise world-news editor.",
    `Write a short English briefing for the "${region}" region from the headlines provided.`,
    "Keep it neutral and factual. Do not invent details. Preserve names and places.",
    'Respond ONLY with compact JSON: {"lead":"one or two sentence overview","bullets":["point 1","point 2","point 3"]}.',
    "Use 2 to 4 bullets, each a short sentence. No markdown, no commentary."
  ].join(" ");

  const user = [
    `Region: ${region}`,
    "Headlines:",
    ...titles.map((title, index) => `${index + 1}. ${title}`)
  ].join("\n");

  try {
    const result = await env.AI.run(AI_MODEL, {
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
      temperature: 0.2,
      max_tokens: 600
    });
    const text = extractResponseText(result);
    const parsed = extractJsonObject(text);
    if (!parsed) {
      console.warn(`Summary for ${region} returned unparseable output`);
      return null;
    }
    const lead = typeof parsed.lead === "string" ? parsed.lead.trim() : "";
    const bullets = Array.isArray(parsed.bullets)
      ? parsed.bullets
          .map(bullet => (typeof bullet === "string" ? bullet.trim() : ""))
          .filter(Boolean)
          .slice(0, 4)
      : [];
    if (!lead && !bullets.length) return null;
    return {
      region,
      lead: lead || bullets[0] || "",
      bullets: lead ? bullets : bullets.slice(1),
      sourceCount: titles.length
    };
  } catch (error) {
    console.error(`Summary generation for ${region} failed:`, error.message);
    return null;
  }
}

function extractResponseText(result) {
  if (typeof result?.response === "string") return result.response;
  if (typeof result?.response?.response === "string") return result.response.response;
  if (typeof result?.choices?.[0]?.message?.content === "string") return result.choices[0].message.content;
  return "";
}

function extractJsonObject(text) {
  if (!text) return null;
  let cleaned = text.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) cleaned = fence[1].trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function mapWithLimit(items, limit, callback) {
  const results = new Array(items.length);
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex++;
        results[index] = await callback(items[index], index);
      }
    })
  );
  return results;
}
