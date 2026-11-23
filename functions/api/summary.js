const PARTITION_SNAPSHOT_KEYS = [
  "newsfeed/cloudflare-news-snapshot-core.json",
  "newsfeed/cloudflare-news-snapshot-google.json",
  "newsfeed/cloudflare-news-snapshot-regional.json"
];
const AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
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
const MAX_TITLES_PER_REGION = 12;

const SOURCE_WEIGHTS = {
  reuters: 3, ap: 3, bbc: 3, cnn: 3, bloomberg: 3,
  al_arabiya: 2, al_akhbar: 2, an_nahar: 2, jpost: 2, ynet: 2, israel_hayom: 2, times_of_israel: 2, inn: 2,
  france24: 2, sky: 2, rtve: 2, ria: 2, tass: 2,
  scmp: 2, caixin: 2, xinhua: 2, the_paper: 2, nhk: 2, amar_ujala: 2,
  abc: 2, cbs: 2, cnbc: 2, fox: 2, nbc: 2,
  infobae: 2, abc_australia: 2, sbs: 2, mercopress: 2
};

const KEYWORD_BOOST = [
  "attack", "strike", "missile", "drone", "war", "military", "troops", "forces",
  "election", "vote", "parliament", "congress", "senate", "minister", "president", "prime minister",
  "policy", "sanction", "treaty", "deal", "agreement", "summit", "talks", "ceasefire",
  "disaster", "earthquake", "flood", "fire", "explosion", "crash", "killed", "dead", "casualties", "injured",
  "resign", "resignation", "impeach", "arrest", "indict", "convict", "sentence",
  "bank", "rate", "inflation", "market", "crash", "record", "surge", "plunge",
  "court", "ruling", "verdict", "lawsuit", "trial"
];

const KEYWORD_PENALTY = [
  "weather", "forecast", "temperature", "rain", "snow",
  "sports", "match", "game", "tournament", "league", "cup", "score", "goal",
  "entertainment", "celebrity", "movie", "music", "concert", "festival",
  "traffic", "commute"
];

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
  cnbc: "North America",
  cnn: "North America",
  fox: "North America",
  nbc: "North America",
  abc_australia: "Asia-Pacific",
  sbs: "Asia-Pacific",
  reuters: "Global",
  mercopress: "Global"
};

export async function onRequestGet(context) {
  const { env, request } = context;
  const bucket = env.NEWS_SNAPSHOT_BUCKET;
  if (!bucket) {
    return Response.json({ error: "Storage is not configured" }, { status: 503 });
  }
  const slot = getSlotInfo();
  const cacheKey = `newsfeed/summaries/v9/${slot.key}.json`;

  try {
    const cachedObject = await bucket.get(cacheKey);
    if (cachedObject) {
      const cached = await cachedObject.json().catch(() => null);
      if (cached && Array.isArray(cached.regions) && cached.regions.length) {
        return Response.json(
          { status: "ready", slotKey: slot.key, slotName: slot.name, slotStart: slot.start.toISOString(), generatedAt: cached.generatedAt, regions: cached.regions, cached: true },
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

    const results = await mapWithLimit(targets, 2, target => summarizeRegion(env, target.region, target.titles));
    const regions = results.filter(Boolean);
    const failedRegions = targets.filter((_, index) => !results[index]).map(target => target.region);
    if (!regions.length) {
      return Response.json({ error: "Could not generate a summary", failedRegions }, { status: 502 });
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
      { status: "ready", slotKey: slot.key, slotName: slot.name, slotStart: slot.start.toISOString(), generatedAt: payload.generatedAt, regions, failedRegions, cached: false },
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
  if (hour < 5) slotHour = 21;
  else if (hour < 13) slotHour = 5;
  else if (hour < 21) slotHour = 13;
  else slotHour = 21;

  const start = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    slotHour
  ));
  if (hour < 5) start.setUTCDate(start.getUTCDate() - 1);

  const name = slotHour === 5 ? "Morning" : slotHour === 13 ? "Afternoon" : "Evening";

  return { key: start.toISOString().slice(0, 13), start, name };
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
    const items = extractFeedItems(feed.xml, sourceId);
    if (!items.length) continue;
    const bucketForRegion = grouped[region] || (grouped[region] = []);
    for (const item of items) bucketForRegion.push(item);
  }

  for (const region of Object.keys(grouped)) {
    grouped[region] = dedupeAndTake(grouped[region], MAX_TITLES_PER_REGION);
  }
  return grouped;
}

function extractFeedItems(xml, sourceId) {
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
    items.push({ title, time: Number.isFinite(time) ? time : 0, sourceId });
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

  for (const item of unique) {
    let score = 0;
    const lower = item.title.toLowerCase();

    const sourceWeight = SOURCE_WEIGHTS[item.sourceId] || 1;
    score += sourceWeight * 10;

    for (const kw of KEYWORD_BOOST) {
      if (lower.includes(kw)) score += 5;
    }
    for (const kw of KEYWORD_PENALTY) {
      if (lower.includes(kw)) score -= 3;
    }

    if (/\d/.test(item.title)) score += 2;
    if (item.title.length > 80) score += 1;

    item._score = score;
    item._time = item.time || 0;
  }

  unique.sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    return b._time - a._time;
  });

  return unique.slice(0, limit).map(item => item.title);
}

async function summarizeRegion(env, region, titles) {
  const system = [
    `You are a wire-service news editor writing an executive briefing for the "${region}" region based ONLY on the provided headlines.`,
    "",
    "STRICT GROUNDING RULES:",
    "- Use ONLY facts explicitly stated in the headlines. Do not add titles, roles, first names, background context, or speculation not present in the text.",
    "- Refer to people, places, and organizations exactly as named in the headlines.",
    "- Write entirely in English. Translate all foreign-language names, organizations, and terms into English. CRITICAL: never output Arabic, Hebrew, Cyrillic, Chinese, Japanese, Korean, Hindi, or any other non-Latin script. If a headline is in a non-Latin script, render it fully in English.",
    "",
    "EDITORIAL & FORMATTING RULES:",
    "- Group and merge headlines covering the same event into a single point. Do not repeat information.",
    "- Prioritize major developments (conflicts, policy shifts, economic moves, disasters) over minor or routine news.",
    "- Avoid all introductory fluff, meta-commentary, or vague thematic summaries (e.g., never write \"The region saw various developments today\").",
    "- Write in punchy, active-voice wire style.",
    "- You may note the apparent significance of a development if it is directly implied by the headline text (e.g., \"policy shift\", \"record high\", \"first time in years\") but do not add external facts.",
    "",
    "Respond in EXACTLY this plain-text format, with nothing before or after it:",
    "LEAD: <1-2 sentences stating the single most significant development from the headlines>",
    "- <2nd most important distinct development>",
    "- <3rd most important distinct development>",
    "- <4th most important distinct development, if applicable>",
    "",
    "Use 2 to 4 bullets. Every bullet must cover a distinct story not already covered in the LEAD. Plain text only: no markdown, no bolding, no JSON."
  ].join("\n");

  const user = [
    `Region: ${region}`,
    "Headlines:",
    ...titles.map((title, index) => `${index + 1}. ${title}`)
  ].join("\n");

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await env.AI.run(AI_MODEL, {
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: attempt === 0 ? 0.2 : 0,
        max_tokens: 900
      });
      const parsed = parseSummaryText(extractResponseText(result));
      if (parsed) {
        if (hasNonLatinText(parsed)) {
          console.warn(`Summary for ${region} attempt ${attempt + 1} contained non-Latin text; retrying`);
          if (attempt < 2) continue;
          const cleaned = stripNonLatin(parsed);
          if (cleaned.lead || cleaned.bullets.length) {
            return {
              region,
              lead: cleaned.lead || cleaned.bullets[0] || "",
              bullets: cleaned.lead ? cleaned.bullets : cleaned.bullets.slice(1),
              sourceCount: titles.length
            };
          }
          continue;
        }
        return {
          region,
          lead: parsed.lead || parsed.bullets[0] || "",
          bullets: parsed.lead ? parsed.bullets : parsed.bullets.slice(1),
          sourceCount: titles.length
        };
      }
      console.warn(`Summary for ${region} attempt ${attempt + 1} was unparseable`);
    } catch (error) {
      console.error(`Summary generation for ${region} attempt ${attempt + 1} failed:`, error.message);
    }
  }
  return null;
}

const NON_LATIN_PATTERN = /[\u0370-\u03FF\u0400-\u052F\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u0900-\u097F\u0E00-\u0E7F\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/;

function hasNonLatinText(parsed) {
  const text = [parsed.lead, ...(parsed.bullets || [])].join(" ");
  return NON_LATIN_PATTERN.test(text);
}

function stripNonLatin(parsed) {
  const clean = (text) => String(text || "")
    .replace(new RegExp(NON_LATIN_PATTERN.source, "g"), "")
    .replace(/\s+/g, " ")
    .trim();
  const lead = clean(parsed.lead);
  const bullets = (parsed.bullets || [])
    .map(b => clean(b))
    .filter(b => b.length > 3);
  return { lead, bullets };
}

function parseSummaryText(text) {
  if (!text) return null;
  let cleaned = text.trim();
  const fence = cleaned.match(/```(?:[a-z]*)\s*([\s\S]*?)```/i);
  if (fence) cleaned = fence[1].trim();

  let lead = "";
  const bullets = [];
  for (const rawLine of cleaned.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const leadMatch = line.match(/^LEAD\s*:\s*(.+)$/i);
    if (leadMatch) {
      lead = leadMatch[1].trim();
      continue;
    }
    const bulletMatch = line.match(/^[-•*]\s+(.+)$/);
    if (bulletMatch) bullets.push(bulletMatch[1].trim());
  }
  if (!lead && !bullets.length) return null;
  return { lead, bullets: bullets.slice(0, 4) };
}

function extractResponseText(result) {
  if (typeof result?.response === "string") return result.response;
  if (typeof result?.response?.response === "string") return result.response.response;
  if (typeof result?.choices?.[0]?.message?.content === "string") return result.choices[0].message.content;
  return "";
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
