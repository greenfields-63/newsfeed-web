// Seth's Signals routes. Paste into the Render backend's index.js above app.listen().
// Requires the existing `app`, `s3`, and `PutObjectCommand` definitions.
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { randomUUID, timingSafeEqual } = require("node:crypto");

const SIGNALS_BUCKET = process.env.R2_BUCKET_NAME;
const SIGNALS_OBJECT_KEY = "newsfeed/signals.json";
const SIGNALS_TOKEN = process.env.SIGNALS_ADMIN_TOKEN;

app.use(express.json({ limit: "16kb" }));

function signalsAdminAuthorized(req, res, next) {
  if (!SIGNALS_TOKEN || SIGNALS_TOKEN.length < 32) {
    return res.status(503).json({ error: "Signals admin is not configured" });
  }

  const provided = req.get("authorization") || "";
  const match = provided.match(/^Bearer ([^\s]+)$/);
  if (!match) return res.status(401).json({ error: "Unauthorized" });

  const expectedBuffer = Buffer.from(SIGNALS_TOKEN);
  const providedBuffer = Buffer.from(match[1]);
  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

async function readSignals() {
  if (!SIGNALS_BUCKET) throw new Error("R2_BUCKET_NAME is not configured");

  try {
    const object = await s3.send(new GetObjectCommand({
      Bucket: SIGNALS_BUCKET,
      Key: SIGNALS_OBJECT_KEY,
    }));
    const contents = await object.Body.transformToString();
    const parsed = JSON.parse(contents);
    if (!Array.isArray(parsed)) throw new Error("Stored signals data is invalid");
    return parsed;
  } catch (error) {
    if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
      return [];
    }
    throw error;
  }
}

async function writeSignals(signals) {
  if (!SIGNALS_BUCKET) throw new Error("R2_BUCKET_NAME is not configured");
  await s3.send(new PutObjectCommand({
    Bucket: SIGNALS_BUCKET,
    Key: SIGNALS_OBJECT_KEY,
    Body: JSON.stringify(signals),
    ContentType: "application/json",
    CacheControl: "no-cache",
  }));
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

app.get("/api/admin/sources-health", signalsAdminAuthorized, async (req, res) => {
  try {
    if (!SIGNALS_BUCKET) throw new Error("R2_BUCKET_NAME is not configured");
    let snapshot = { feeds: {} };
    try {
      const obj = await s3.send(new GetObjectCommand({
        Bucket: SIGNALS_BUCKET,
        Key: "newsfeed/cloudflare-news-snapshot-published.json"
      }));
      snapshot = JSON.parse(await obj.Body.transformToString());
    } catch (e) {}

    const now = Date.now();
    const fortyEightHoursAgo = now - (48 * 60 * 60 * 1000);
    const health = SOURCE_METADATA_ADMIN.map(source => {
      const feed = snapshot.feeds?.[source.id];
      const xml = feed?.xml || "";
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

function validateSignalInput(body) {
  if (!body || typeof body.text !== "string" || !body.text.trim()) {
    return { error: "Signal text is required" };
  }
  const text = body.text.trim();
  if (text.length > 2000) return { error: "Signal text must be 2,000 characters or fewer" };

  if (body.status !== "draft" && body.status !== "published") {
    return { error: "Status must be draft or published" };
  }

  if (body.links !== undefined && !Array.isArray(body.links)) {
    return { error: "Links must be an array" };
  }
  const rawLinks = body.links || [];
  if (rawLinks.length > 5) return { error: "A signal can include up to five links" };

  const links = [];
  for (const rawLink of rawLinks) {
    if (!rawLink || typeof rawLink.url !== "string") {
      return { error: "Each link needs a URL" };
    }
    let url;
    try {
      url = new URL(rawLink.url);
    } catch {
      return { error: "A link URL is invalid" };
    }
    if (url.protocol !== "https:") return { error: "Links must use HTTPS" };

    const title = typeof rawLink.title === "string" ? rawLink.title.trim().slice(0, 160) : "";
    links.push({ title, url: url.href });
  }

  return { value: { text, links, status: body.status } };
}

app.get("/api/signals", async (req, res) => {
  try {
    const signals = await readSignals();
    const published = signals
      .filter(signal => signal.status === "published" && !signal.id?.startsWith("audit-"))
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    return res
      .set("Cache-Control", "public, max-age=30")
      .json({ signals: published });
  } catch (error) {
    console.error("Could not read Seth's Signals:", error.message);
    return res.status(500).json({ error: "Signals are temporarily unavailable" });
  }
});

app.get("/api/admin/signals", signalsAdminAuthorized, async (req, res) => {
  try {
    const signals = await readSignals();
    const cleanSignals = signals.filter(signal => !signal.id?.startsWith("audit-"));
    return res.json({ signals: cleanSignals });
  } catch (error) {
    console.error("Could not read admin signals:", error.message);
    return res.status(500).json({ error: "Signals are temporarily unavailable" });
  }
});

app.post("/api/admin/signals", signalsAdminAuthorized, async (req, res) => {
  const validated = validateSignalInput(req.body);
  if (validated.error) return res.status(400).json({ error: validated.error });

  try {
    const now = new Date().toISOString();
    const signal = {
      id: randomUUID(),
      ...validated.value,
      createdAt: now,
      updatedAt: now,
    };
    const signals = await readSignals();
    const cleanSignals = signals.filter(signal => !signal.id?.startsWith("audit-"));
    cleanSignals.push(signal);
    await writeSignals(cleanSignals);
    return res.status(201).json({ signal });
  } catch (error) {
    console.error("Could not create signal:", error.message);
    return res.status(500).json({ error: "Could not save signal" });
  }
});

app.put("/api/admin/signals/:id", signalsAdminAuthorized, async (req, res) => {
  const validated = validateSignalInput(req.body);
  if (validated.error) return res.status(400).json({ error: validated.error });

  try {
    const signals = await readSignals();
    const cleanSignals = signals.filter(signal => !signal.id?.startsWith("audit-"));
    const index = cleanSignals.findIndex(signal => signal.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Signal not found" });

    cleanSignals[index] = {
      ...cleanSignals[index],
      ...validated.value,
      updatedAt: new Date().toISOString(),
    };
    await writeSignals(cleanSignals);
    return res.json({ signal: cleanSignals[index] });
  } catch (error) {
    console.error("Could not update signal:", error.message);
    return res.status(500).json({ error: "Could not save signal" });
  }
});

app.delete("/api/admin/signals/:id", signalsAdminAuthorized, async (req, res) => {
  try {
    const signals = await readSignals();
    const cleanSignals = signals.filter(signal => !signal.id?.startsWith("audit-"));
    const updated = cleanSignals.filter(signal => signal.id !== req.params.id);
    if (updated.length === cleanSignals.length) {
      return res.status(404).json({ error: "Signal not found" });
    }
    await writeSignals(updated);
    return res.sendStatus(204);
  } catch (error) {
    console.error("Could not delete signal:", error.message);
    return res.status(500).json({ error: "Could not delete signal" });
  }
});

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
      <textarea id="signal-text" maxlength="2000" required placeholder="A possibility or signal you want to put on the table..."></textarea>
      <label for="signal-links">Related links (one per line: title | https://...)</label>
      <textarea id="signal-links" placeholder="Optional; up to five HTTPS links"></textarea>
      <label for="signal-status">Status</label>
      <select id="signal-status"><option value="draft">Draft (private)</option><option value="published">Publish to feed</option></select>
      <div class="row"><button type="submit">Save signal</button><button class="secondary" type="button" id="cancel-edit">Clear form</button></div>
      <p id="status" role="status"></p>
    </form>
    <section class="card"><h2>Saved signals</h2><div id="signals"></div></section>
  </div>
</main>
<script>
let adminToken = '';
let editingId = null;
const $ = id => document.getElementById(id);
function showStatus(message){$('status').textContent=message;}
async function api(path, options={}) {
  const response = await fetch(path, {
    ...options,
    headers: {'Authorization': 'Bearer '+adminToken, 'Content-Type':'application/json', ...(options.headers||{})}
  });
  if (!response.ok) {
    let detail='HTTP '+response.status;
    try { detail=(await response.json()).error||detail; } catch {}
    throw new Error(detail);
  }
  return response.status===204 ? null : response.json();
}
function clearForm(){
  editingId=null;$('signal-form').reset();$('form-title').textContent='New signal';showStatus('');
}
function escapeHtml(str){return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function renderSignals(items){
  const root=$('signals');root.replaceChildren();
  for(const signal of items){
    const article=document.createElement('article');article.className='card';
    const heading=document.createElement('strong');heading.textContent=signal.status==='published'?'Published':'Draft';
    const body=document.createElement('p');body.textContent=signal.text;body.style.whiteSpace='pre-wrap';body.style.lineHeight='1.5';
    const date=document.createElement('p');date.className='muted';date.textContent=new Date(signal.updatedAt).toLocaleString();
    const actions=document.createElement('div');actions.className='row';
    const edit=document.createElement('button');edit.className='secondary';edit.textContent='Edit';
    edit.onclick=()=>{editingId=signal.id;$('signal-text').value=signal.text;$('signal-links').value=(signal.links||[]).map(x=>(x.title?x.title+' | ':'')+x.url).join('\\n');$('signal-status').value=signal.status;$('form-title').textContent='Edit signal';window.scrollTo({top:0,behavior:'smooth'});};
    const toggle=document.createElement('button');toggle.className='secondary';toggle.textContent=signal.status==='published'?'Unpublish':'Publish';
    toggle.onclick=async()=>{try{await api('/api/admin/signals/'+encodeURIComponent(signal.id),{method:'PUT',body:JSON.stringify({...signal,status:signal.status==='published'?'draft':'published'})});await loadSignals();}catch(e){alert(e.message);}};
    const remove=document.createElement('button');remove.className='danger';remove.textContent='Delete';
    remove.onclick=async()=>{if(!confirm('Delete this signal permanently?'))return;try{await api('/api/admin/signals/'+encodeURIComponent(signal.id),{method:'DELETE'});await loadSignals();}catch(e){alert(e.message);}};
    actions.append(edit,toggle,remove);article.append(heading,date,body,actions);root.append(article);
  }
}
async function loadSignals(){const result=await api('/api/admin/signals');renderSignals(result.signals||[]);}
async function loadSourcesHealth(){
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
    ['Source', 'Country', 'Last Update', 'Status'].forEach(text => {
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
      tdName.style.cssText = 'padding: 8px; font-weight: 600; color: #f8fafc;';
      tdName.textContent = src.name;

      const tdCountry = document.createElement('td');
      tdCountry.style.cssText = 'padding: 8px; color: #94a3b8;';
      tdCountry.textContent = src.country;

      const tdDate = document.createElement('td');
      tdDate.style.cssText = 'padding: 8px; color: #cbd5e1;';
      tdDate.textContent = src.latestArticleDate ? new Date(src.latestArticleDate).toLocaleString() : 'No articles';

      const tdStatus = document.createElement('td');
      tdStatus.style.padding = '8px';
      const badge = document.createElement('span');
      badge.textContent = src.isStale ? 'Stale >48h' : 'Active';
      badge.style.cssText = src.isStale
        ? 'background: #b91c1c; color: white; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 12px;'
        : 'background: #15803d; color: white; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 12px;';
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
$('login-button').onclick=async()=>{
  adminToken=$('token').value.trim();
  try{
    await Promise.all([loadSignals(), loadSourcesHealth()]);
    $('login').hidden=true;
    $('editor').hidden=false;
  }
  catch(e){adminToken='';alert('Could not unlock: '+e.message);}
};
$('signal-form').onsubmit=async event=>{
  event.preventDefault();
  try{
    const links=$('signal-links').value.split('\\n').map(line=>line.trim()).filter(Boolean).map(line=>{
      const parts=line.split('|');return {title:parts.length>1?parts[0].trim():'',url:(parts.length>1?parts.slice(1).join('|'):parts[0]).trim()};
    });
    const body=JSON.stringify({text:$('signal-text').value,links,status:$('signal-status').value});
    await api(editingId?'/api/admin/signals/'+encodeURIComponent(editingId):'/api/admin/signals',{method:editingId?'PUT':'POST',body});
    clearForm();showStatus('Saved.');await loadSignals();
  }catch(e){showStatus(e.message);}
};
$('cancel-edit').onclick=clearForm;
</script>
</body>
</html>`);
});
