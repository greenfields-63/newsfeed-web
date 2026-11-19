const CACHE_KEY = "newsfeed/translations-cache.json";
const AI_MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8-fast";
const DEBUG_MODELS = new Set([
  "@cf/meta/llama-3.1-8b-instruct-fp8-fast",
  "@cf/meta/llama-3.2-3b-instruct",
  "@cf/meta/llama-3.2-1b-instruct"
]);
const TARGET = "en";
const MAX_BATCH = 40;
const MAX_ITEMS = 300;
const MAX_CACHE_ENTRIES = 30000;
const TARGET_NAME = "English";

export async function onRequestGet({ env }) {
  if (!env.NEWS_SNAPSHOT_BUCKET) {
    return Response.json({ error: "Storage is not configured" }, { status: 503 });
  }
  const head = await env.NEWS_SNAPSHOT_BUCKET.head(CACHE_KEY);
  if (!head) {
    return Response.json({ exists: false });
  }
  const body = await env.NEWS_SNAPSHOT_BUCKET.get(CACHE_KEY);
  const data = body ? await body.json().catch(() => ({})) : {};
  return Response.json({
    exists: true,
    sizeBytes: head.size,
    updatedAt: head.customMetadata?.updatedAt || null,
    entries: Object.keys(data).length
  });
}

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
  const groups = new Map();
  for (const item of items) {
    if (!item || typeof item.id !== "string" || typeof item.text !== "string") continue;
    const text = normalizeText(item.text);
    if (!text) continue;
    let group = groups.get(text);
    if (!group) {
      group = { text, ids: [], langs: new Set() };
      groups.set(text, group);
    }
    group.ids.push(item.id);
    if (typeof item.lang === "string" && item.lang) group.langs.add(item.lang);
  }

  if (!groups.size) {
    return Response.json({ translations: {} }, { headers: { "Cache-Control": "no-store" } });
  }

  const bucket = env.NEWS_SNAPSHOT_BUCKET;
  const cacheObject = await bucket.get(CACHE_KEY);
  const cache = cacheObject ? await cacheObject.json().catch(() => ({})) : {};

  const translations = {};
  const pending = [];
  let newlyAliased = false;
  for (const group of groups.values()) {
    const key = hashKey(group.text);
    let value = typeof cache[key] === "string" ? cache[key] : "";
    if (!value) {
      // Reuse legacy lang|text entries so already-paid translations aren't billed again.
      for (const lang of group.langs) {
        const legacyKey = hashKey(`${lang}|${group.text}`);
        if (typeof cache[legacyKey] === "string" && cache[legacyKey]) {
          value = cache[legacyKey];
          cache[key] = value;
          newlyAliased = true;
          break;
        }
      }
    }
    if (value) {
      for (const id of group.ids) translations[id] = value;
    } else {
      pending.push(group);
    }
  }

  let added = 0;
  let neurons = 0;
  let firstError = null;
  if (pending.length && env.AI) {
    const chunks = [];
    for (let i = 0; i < pending.length; i += MAX_BATCH) {
      chunks.push(pending.slice(i, i + MAX_BATCH));
    }
    const activeModel = payload?.debug === true && DEBUG_MODELS.has(payload.model) ? payload.model : AI_MODEL;
    const results = await mapWithLimit(chunks, 3, chunk => translateChunk(env, chunk, activeModel));
    for (let c = 0; c < chunks.length; c++) {
      const chunk = chunks[c];
      const res = results[c];
      if (res && typeof res.neurons === "number") neurons += res.neurons;
      if (res && res.error && !firstError) firstError = res.error;
      const out = res ? res.out : null;
      if (!Array.isArray(out) || out.length !== chunk.length) continue;
      for (let i = 0; i < chunk.length; i++) {
        const translated = typeof out[i] === "string" ? out[i].trim() : "";
        if (!translated) continue;
        cache[hashKey(chunk[i].text)] = translated;
        for (const id of chunk[i].ids) translations[id] = translated;
        added++;
      }
    }
  }

  if (added > 0 || newlyAliased) {
    const pruned = pruneCache(cache);
    await bucket.put(CACHE_KEY, JSON.stringify(pruned), {
      httpMetadata: { contentType: "application/json; charset=utf-8" },
      customMetadata: { updatedAt: new Date().toISOString() }
    });
  }

  const body = { translations };
  if (payload && payload.debug === true) {
    body.debug = {
      uniqueTexts: groups.size,
      pending: pending.length,
      added,
      neurons: Number(neurons.toFixed(4)),
      hasAI: Boolean(env.AI),
      error: firstError
    };
  }
  return Response.json(body, {
    headers: { "Cache-Control": "no-store" }
  });
}

async function translateChunk(env, chunk, model = AI_MODEL) {
  const texts = chunk.map(item => item.text);
  const system = [
    `Translate each headline to ${TARGET_NAME}.`,
    `Keep it concise; preserve names and meaning.`,
    `No commentary or quotes.`,
    `If already ${TARGET_NAME}, return it unchanged.`,
    `Output ONLY a JSON array of strings, same length and order as the input.`
  ].join(" ");

  try {
    const result = await env.AI.run(model, {
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
    const neurons = Number(result?.usage?.neurons ?? 0) || 0;
    const parsed = extractJsonArray(text);
    if (!Array.isArray(parsed) || parsed.length !== texts.length) {
      console.warn(`Translation batch length mismatch: expected ${texts.length}, got ${Array.isArray(parsed) ? parsed.length : "none"}`);
      const snippet = text ? text.slice(0, 120) : `empty output (${JSON.stringify(result).slice(0, 120)})`;
      return { out: null, neurons, error: `parse_mismatch: ${snippet}` };
    }
    return { out: parsed.map(value => typeof value === "string" ? value : ""), neurons };
  } catch (error) {
    const detail = {
      name: error?.name ?? null,
      code: error?.code ?? null,
      status: error?.status ?? null,
      cause: error?.cause?.message ?? null,
      message: error?.message ?? String(error)
    };
    console.error("Workers AI translation failed:", detail);
    return { out: null, neurons: 0, error: `ai_error: ${JSON.stringify(detail)}` };
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

function normalizeText(value) {
  return String(value).replace(/\s+/g, " ").trim();
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
