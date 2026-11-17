// Seth's Signals routes & Source Health Monitor. Paste above app.listen().
const { GetObjectCommand: GetObjCmd, PutObjectCommand: PutObjCmd } = require("@aws-sdk/client-s3");
const { randomUUID: randUuid, timingSafeEqual: timeSafeEq } = require("node:crypto");

const SIGNALS_BUCKET = process.env.R2_BUCKET_NAME;
const SIGNALS_KEY = "newsfeed/signals.json";
const SIGNALS_TOKEN = process.env.SIGNALS_ADMIN_TOKEN;

app.use(express.json({ limit: "16kb" }));

function authorizeSignalsAdmin(req, res, next) {
  if (!SIGNALS_TOKEN || SIGNALS_TOKEN.length < 32) {
    return res.status(503).json({ error: "Signals admin is not configured" });
  }

  const match = (req.get("authorization") || "").match(/^Bearer ([^\s]+)$/);
  if (!match) return res.status(401).json({ error: "Unauthorized" });

  const expected = Buffer.from(SIGNALS_TOKEN);
  const provided = Buffer.from(match[1]);

  if (expected.length !== provided.length || !timeSafeEq(expected, provided)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

async function readSignals() {
  if (!SIGNALS_BUCKET) throw new Error("R2_BUCKET_NAME is not configured");

  try {
    const object = await s3.send(new GetObjCmd({
      Bucket: SIGNALS_BUCKET,
      Key: SIGNALS_KEY
    }));

    const signals = JSON.parse(await object.Body.transformToString());
    if (!Array.isArray(signals)) throw new Error("Stored signals data is invalid");
    return signals;
  } catch (error) {
    if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
      return [];
    }
    throw error;
  }
}

async function saveSignals(signals) {
  if (!SIGNALS_BUCKET) throw new Error("R2_BUCKET_NAME is not configured");

  await s3.send(new PutObjCmd({
    Bucket: SIGNALS_BUCKET,
    Key: SIGNALS_KEY,
    Body: JSON.stringify(signals),
    ContentType: "application/json",
    CacheControl: "no-cache"
  }));
}

function validateSignal(body) {
  if (!body) return { error: "Signal text is required" };
  const rawText = body.text || body.thought || body.content || "";
  const text = String(rawText).trim();

  if (!text) {
    return { error: "Signal text is required" };
  }
  if (text.length > 2000) {
    return { error: "Signal text must be 2,000 characters or fewer" };
  }

  const status = body.status === "published" ? "published" : "draft";

  if (body.links !== undefined && !Array.isArray(body.links)) {
    return { error: "Links must be a list" };
  }

  const rawLinks = body.links || [];
  if (rawLinks.length > 5) {
    return { error: "A signal can have up to five links" };
  }

  const links = [];
  for (const item of rawLinks) {
    if (!item || typeof item.url !== "string") {
      return { error: "Each link needs a URL" };
    }

    let url;
    try {
      url = new URL(item.url);
    } catch {
      return { error: "A link URL is invalid" };
    }

    if (url.protocol !== "https:") {
      return { error: "Links must use HTTPS" };
    }

    links.push({
      title: typeof item.title === "string" ? item.title.trim().slice(0, 160) : "",
      url: url.href
    });
  }

  return { value: { text, links, status } };
}

const SOURCE_METADATA_ADMIN = [
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

const translationProxyCache = new Map();

app.get("/api/translate", async (req, res) => {
  const { q } = req.query;
  return res.json({ translatedText: q || "" });
});

app.get("/api/admin/sources-health", authorizeSignalsAdmin, async (req, res) => {
  try {
    if (!SIGNALS_BUCKET) throw new Error("R2_BUCKET_NAME is not configured");
    let snapshot = { feeds: {} };
    try {
      const obj = await s3.send(new GetObjCmd({
        Bucket: SIGNALS_BUCKET,
        Key: "newsfeed/cloudflare-news-snapshot-published.json"
      }));
      snapshot = JSON.parse(await obj.Body.transformToString());
    } catch (e) {}

    const now = Date.now();
    const fortyEightHoursAgo = now - (48 * 60 * 60 * 1000);
    const health = SOURCE_METADATA_ADMIN.map(source => {
      const feed = snapshot.feeds && snapshot.feeds[source.id] ? snapshot.feeds[source.id] : null;
      const xml = feed && feed.xml ? feed.xml : "";
      const pubDateMatches = [...xml.matchAll(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/gi)];
      const dates = pubDateMatches.map(m => Date.parse(m[1].trim())).filter(t => !isNaN(t));
      const latestDate = dates.length ? Math.max(...dates) : null;
      const isStale = !latestDate || latestDate < fortyEightHoursAgo;

      return {
        id: source.id,
        name: source.name,
        country: source.country,
        latestArticleDate: latestDate ? new Date(latestDate).toISOString() : null,
        isStale
      };
    });

    return res.json({ sources: health });
  } catch (error) {
    console.error("Could not fetch sources health:", error.message);
    return res.status(500).json({ error: "Could not fetch sources health" });
  }
});

// Public endpoint: returns published signals only.
app.get("/api/signals", async (req, res) => {
  try {
    const signals = await readSignals();
    const published = signals
      .filter(signal => signal.status === "published")
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

    return res
      .set("Cache-Control", "public, max-age=30")
      .json({ signals: published });
  } catch (error) {
    console.error("Could not read Seth's Signals:", error.message);
    return res.status(500).json({ error: "Signals are temporarily unavailable" });
  }
});

// Private admin API.
app.get("/api/admin/signals", authorizeSignalsAdmin, async (req, res) => {
  try {
    return res.json({ signals: await readSignals() });
  } catch (error) {
    console.error("Could not read admin signals:", error.message);
    return res.status(500).json({ error: "Signals are temporarily unavailable" });
  }
});

app.post("/api/admin/signals", authorizeSignalsAdmin, async (req, res) => {
  const validated = validateSignal(req.body);
  if (validated.error) return res.status(400).json({ error: validated.error });

  try {
    const now = new Date().toISOString();
    const signal = {
      id: randUuid(),
      ...validated.value,
      createdAt: now,
      updatedAt: now
    };

    const signals = await readSignals();
    signals.push(signal);
    await saveSignals(signals);
    return res.status(201).json({ signal });
  } catch (error) {
    console.error("Could not create signal:", error.message);
    return res.status(500).json({ error: "Could not save signal" });
  }
});

app.put("/api/admin/signals/:id", authorizeSignalsAdmin, async (req, res) => {
  const validated = validateSignal(req.body);
  if (validated.error) return res.status(400).json({ error: validated.error });

  try {
    const signals = await readSignals();
    const index = signals.findIndex(signal => signal.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Signal not found" });

    signals[index] = {
      ...signals[index],
      ...validated.value,
      updatedAt: new Date().toISOString()
    };

    await saveSignals(signals);
    return res.json({ signal: signals[index] });
  } catch (error) {
    console.error("Could not update signal:", error.message);
    return res.status(500).json({ error: "Could not save signal" });
  }
});

app.delete("/api/admin/signals/:id", authorizeSignalsAdmin, async (req, res) => {
  try {
    const signals = await readSignals();
    const updated = signals.filter(signal => signal.id !== req.params.id);
    if (updated.length === signals.length) {
      return res.status(404).json({ error: "Signal not found" });
    }

    await saveSignals(updated);
    return res.sendStatus(204);
  } catch (error) {
    console.error("Could not delete signal:", error.message);
    return res.status(500).json({ error: "Could not delete signal" });
  }
});

// Private page for writing, editing, publishing, and deleting signals & checking source health.
app.get("/signals-admin", (req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Seth's Signals Admin</title>
  <style>
    body{margin:0;padding:24px;background:#0f172a;color:#e2e8f0;font:16px system-ui,sans-serif}
    main{max-width:820px;margin:auto}.card{background:#1e293b;border:1px solid #334155;border-radius:14px;padding:20px;margin:16px 0}
    input,textarea,select,button{box-sizing:border-box;font:inherit;border-radius:8px;padding:10px}
    input,textarea,select{width:100%;margin:6px 0 14px;background:#0f172a;color:#f8fafc;border:1px solid #475569}
    textarea{min-height:120px}button{border:0;background:#0284c7;color:white;font-weight:700;cursor:pointer;margin:4px}
    button.secondary{background:#475569}button.danger{background:#b91c1c}.muted{color:#94a3b8;font-size:13px}
    .row{display:flex;gap:8px;flex-wrap:wrap}.row button{flex:1}
    #status{min-height:1.5em;color:#fbbf24;white-space:pre-wrap}
  </style>
</head>
<body>
<main>
  <h1>Seth's Signals Admin</h1>
  <p class="muted">Private publishing dashboard and source health monitor.</p>

  <section class="card" id="login">
    <label for="token">Admin token</label>
    <input id="token" type="password" autocomplete="current-password">
    <button id="login-button">Unlock</button>
  </section>

  <div id="editor" hidden>
    <section class="card">
      <h2>Source Health & Last Update Monitor</h2>
      <p class="muted">Real-time status of all 32 monitored news feeds. Sources older than 48 hours are flagged in red.</p>
      <div id="sources-health-list" style="margin-top: 14px; overflow-x: auto;">Loading sources health...</div>
    </section>

    <form class="card" id="signal-form">
      <h2 id="form-title">New signal</h2>
      <label for="signal-text">Thought</label>
      <textarea id="signal-text" maxlength="2000" required
        placeholder="A possibility or signal you want to put on the table..."></textarea>

      <label for="signal-links">Related links (one per line: title | https://...)</label>
      <textarea id="signal-links" placeholder="Optional; up to five HTTPS links"></textarea>

      <label for="signal-status">Status</label>
      <select id="signal-status">
        <option value="draft">Draft (private)</option>
        <option value="published">Publish to feed</option>
      </select>

      <div class="row">
        <button type="submit">Save signal</button>
        <button class="secondary" type="button" id="cancel-edit">Clear form</button>
      </div>
      <p id="status" role="status"></p>
    </form>

    <section class="card"><h2>Saved signals</h2><div id="signals"></div></section>
  </div>
</main>

<script>
let adminToken = "";
let editingId = null;
const byId = id => document.getElementById(id);

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Authorization": "Bearer " + adminToken,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    let message = "HTTP " + response.status;
    try { message = (await response.json()).error || message; } catch {}
    throw new Error(message);
  }

  return response.status === 204 ? null : response.json();
}

function clearForm() {
  editingId = null;
  byId("signal-form").reset();
  byId("form-title").textContent = "New signal";
  byId("status").textContent = "";
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function loadSignals() {
  const result = await api("/api/admin/signals");
  const root = byId("signals");
  root.replaceChildren();

  for (const signal of result.signals || []) {
    const card = document.createElement("article");
    card.className = "card";

    const heading = document.createElement("strong");
    heading.textContent = signal.status === "published" ? "Published" : "Draft";

    const date = document.createElement("p");
    date.className = "muted";
    date.textContent = new Date(signal.updatedAt).toLocaleString();

    const text = document.createElement("p");
    text.textContent = signal.text;
    text.style.whiteSpace = "pre-wrap";

    const actions = document.createElement("div");
    actions.className = "row";

    const edit = document.createElement("button");
    edit.className = "secondary";
    edit.textContent = "Edit";
    edit.onclick = () => {
      editingId = signal.id;
      byId("signal-text").value = signal.text || "";
      byId("signal-links").value = (signal.links || [])
        .map(link => (link.title ? link.title + " | " : "") + link.url)
        .join("\\n");
      byId("signal-status").value = signal.status;
      byId("form-title").textContent = "Edit signal";
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const toggle = document.createElement("button");
    toggle.className = "secondary";
    toggle.textContent = signal.status === "published" ? "Unpublish" : "Publish";
    toggle.onclick = async () => {
      try {
        const newStatus = signal.status === "published" ? "draft" : "published";
        const payload = {
          text: signal.text || "",
          links: signal.links || [],
          status: newStatus
        };
        await api("/api/admin/signals/" + encodeURIComponent(signal.id), {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        await loadSignals();
      } catch (error) {
        alert(error.message);
      }
    };

    const remove = document.createElement("button");
    remove.className = "danger";
    remove.textContent = "Delete";
    remove.onclick = async () => {
      if (!confirm("Delete this signal permanently?")) return;
      try {
        await api("/api/admin/signals/" + encodeURIComponent(signal.id), {
          method: "DELETE"
        });
        await loadSignals();
      } catch (error) {
        alert(error.message);
      }
    };

    actions.append(edit, toggle, remove);
    card.append(heading, date, text, actions);
    root.append(card);
  }
}

async function loadSourcesHealth() {
  try {
    const res = await api('/api/admin/sources-health');
    const container = document.getElementById('sources-health-list');
    if (!container) return;
    container.replaceChildren();

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '14px';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.cssText = 'border-bottom: 1px solid #334155; text-align: left; color: #94a3b8;';
    ['Source Name', 'Country', 'Last Update Time', 'Health Status'].forEach(text => {
      const th = document.createElement('th');
      th.style.padding = '8px';
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const src of (res.sources || [])) {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #1e293b';

      const tdName = document.createElement('td');
      tdName.style.padding = '8px';
      if (src.isStale) {
        tdName.style.fontWeight = 'bold';
        tdName.style.color = '#ef4444';
        tdName.textContent = src.name + ' (' + src.id + ')';
      } else {
        tdName.style.fontWeight = '600';
        tdName.style.color = '#f8fafc';
        tdName.textContent = src.name;
      }

      const tdCountry = document.createElement('td');
      tdCountry.style.padding = '8px';
      tdCountry.style.color = '#94a3b8';
      tdCountry.textContent = src.country;

      const tdDate = document.createElement('td');
      tdDate.style.padding = '8px';
      if (src.isStale) {
        tdDate.style.fontWeight = 'bold';
        tdDate.style.color = '#ef4444';
        tdDate.textContent = src.latestArticleDate ? new Date(src.latestArticleDate).toLocaleString() : 'No recent articles (>48h)';
      } else {
        tdDate.style.color = '#cbd5e1';
        tdDate.textContent = new Date(src.latestArticleDate).toLocaleString();
      }

      const tdStatus = document.createElement('td');
      tdStatus.style.padding = '8px';
      const badge = document.createElement('span');
      badge.textContent = src.isStale ? 'STALE (>48h)' : 'ACTIVE';
      badge.style.cssText = src.isStale
        ? 'background: #b91c1c; color: white; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 11px;'
        : 'background: #15803d; color: white; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 11px;';
      tdStatus.appendChild(badge);

      tr.append(tdName, tdCountry, tdDate, tdStatus);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    container.appendChild(table);
  } catch (e) {
    const container = document.getElementById('sources-health-list');
    if (container) container.textContent = 'Could not load sources health: ' + e.message;
  }
}

byId("login-button").onclick = async () => {
  adminToken = byId("token").value.trim();
  try {
    await loadSignals();
    byId("login").hidden = true;
    byId("editor").hidden = false;
    loadSourcesHealth();
  } catch (error) {
    adminToken = "";
    alert("Could not unlock: " + error.message);
  }
};

byId("signal-form").onsubmit = async event => {
  event.preventDefault();

  try {
    const links = byId("signal-links").value
      .split("\\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split("|");
        return {
          title: parts.length > 1 ? parts[0].trim() : "",
          url: (parts.length > 1 ? parts.slice(1).join("|") : parts[0]).trim()
        };
      });

    const body = JSON.stringify({
      text: byId("signal-text").value,
      links,
      status: byId("signal-status").value
    });

    const path = editingId
      ? "/api/admin/signals/" + encodeURIComponent(editingId)
      : "/api/admin/signals";

    await api(path, { method: editingId ? "PUT" : "POST", body });
    clearForm();
    byId("status").textContent = "Saved.";
    await loadSignals();
  } catch (error) {
    byId("status").textContent = error.message;
  }
};

byId("cancel-edit").onclick = clearForm;
</script>
</body>
</html>`);
});
