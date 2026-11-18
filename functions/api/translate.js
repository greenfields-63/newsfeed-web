const CACHE_KEY = "newsfeed/translations-cache.json";
const AI_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";
const TARGET = "en";
const MAX_BATCH = 40;
const MAX_ITEMS = 300;
const MAX_CACHE_ENTRIES = 30000;
const TARGET_NAME = "English";

export async function onRequestPost({ request, env }) {
  if (!env.NEWS_SNAPSHOT_BUCKET) {
    return Response.json({ error: "Storage is not configured" }, { status: 503 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const target = String(payload?.target || TARGET).toLowerCase().split("-")[0];
  if (target !== TARGET) {
    return Response.json({ error: "Only English translation is supported" }, { status: 400 });
  }

  const items = Array.isArray(payload?.items) ? payload.items.slice(0, MAX_ITEMS) : [];
  const cleaned = items
    .filter(item => item && typeof item.id === "string" && typeof item.text === "string" && item.text.trim())
    .map(item => ({
      id: item.id,
      text: item.text,
      lang: typeof item.lang === "string" && item.lang ? item.lang : "auto"
    }));

  if (!cleaned.length) {
    return Response.json({ translations: {} }, { headers: { "Cache-Control": "no-store" } });
  }

  const bucket = env.NEWS_SNAPSHOT_BUCKET;
  const cacheObject = await bucket.get(CACHE_KEY);
  const cache = cacheObject ? await cacheObject.json().catch(() => ({})) : {};

  const translations = {};
  const pending = [];
  for (const item of cleaned) {
    const key = hashKey(`${item.lang}|${item.text}`);
    if (typeof cache[key] === "string" && cache[key]) {
      translations[item.id] = cache[key];
    } else {
      pending.push(item);
    }
  }

  let added = 0;
  if (pending.length && env.AI) {
    const chunks = [];
    for (let i = 0; i < pending.length; i += MAX_BATCH) {
      chunks.push(pending.slice(i, i + MAX_BATCH));
    }
    const results = await mapWithLimit(chunks, 3, chunk => translateChunk(env, chunk));
    for (let c = 0; c < chunks.length; c++) {
      const chunk = chunks[c];
      const out = results[c];
      if (!Array.isArray(out) || out.length !== chunk.length) continue;
      for (let i = 0; i < chunk.length; i++) {
        const translated = typeof out[i] === "string" ? out[i].trim() : "";
        if (!translated) continue;
        const key = hashKey(`${chunk[i].lang}|${chunk[i].text}`);
        cache[key] = translated;
        translations[chunk[i].id] = translated;
        added++;
      }
    }
  }

  if (added > 0) {
    const pruned = pruneCache(cache);
    await bucket.put(CACHE_KEY, JSON.stringify(pruned), {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
      customMetadata: { updatedAt: new Date().toISOString() }
    });
  }

  return Response.json({ translations }, {
    headers: { "Cache-Control": "no-store" }
  });
}

async function translateChunk(env, chunk) {
  const texts = chunk.map(item => item.text);
  const system = [
    `You are a precise translation engine for news headlines.`,
    `Translate each input string to ${TARGET_NAME}.`,
    `Keep it concise, like a headline. Preserve names, places, and meaning.`,
    `Do not add commentary, quotes, or explanations.`,
    `If a string is already in ${TARGET_NAME}, return it unchanged.`,
    `Respond with ONLY a JSON array of strings, same length and order as the input.`
  ].join(" ");

  try {
    const result = await env.AI.run(AI_MODEL, {
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(texts) }
      ],
      temperature: 0,
      max_tokens: 2048
    });
    const text = typeof result?.response === "string"
      ? result.response
      : typeof result?.response?.response === "string"
        ? result.response.response
        : typeof result?.choices?.[0]?.message?.content === "string"
          ? result.choices[0].message.content
          : "";
    const parsed = extractJsonArray(text);
    if (!Array.isArray(parsed) || parsed.length !== texts.length) {
      console.warn(`Translation batch length mismatch: expected ${texts.length}, got ${Array.isArray(parsed) ? parsed.length : "none"}`);
      return null;
    }
    return parsed.map(value => typeof value === "string" ? value : "");
  } catch (error) {
    console.error("Workers AI translation failed:", error.message);
    return null;
  }
}

function extractJsonArray(text) {
  if (!text) return null;
  let cleaned = text.trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) cleaned = fence[1].trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function pruneCache(cache) {
  const keys = Object.keys(cache);
  if (keys.length <= MAX_CACHE_ENTRIES) return cache;
  const keep = keys.slice(keys.length - Math.floor(MAX_CACHE_ENTRIES / 2));
  const pruned = {};
  for (const key of keep) pruned[key] = cache[key];
  return pruned;
}

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
