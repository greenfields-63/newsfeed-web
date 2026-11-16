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

app.get("/api/admin/signals", signalsAdminAuthorized, async (req, res) => {
  try {
    return res.json({ signals: await readSignals() });
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
    signals.push(signal);
    await writeSignals(signals);
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
    const index = signals.findIndex(signal => signal.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: "Signal not found" });

    signals[index] = {
      ...signals[index],
      ...validated.value,
      updatedAt: new Date().toISOString(),
    };
    await writeSignals(signals);
    return res.json({ signal: signals[index] });
  } catch (error) {
    console.error("Could not update signal:", error.message);
    return res.status(500).json({ error: "Could not save signal" });
  }
});

app.delete("/api/admin/signals/:id", signalsAdminAuthorized, async (req, res) => {
  try {
    const signals = await readSignals();
    const updated = signals.filter(signal => signal.id !== req.params.id);
    if (updated.length === signals.length) {
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
    main{max-width:760px;margin:auto}.card{background:#1e293b;border:1px solid #334155;border-radius:14px;padding:20px;margin:16px 0}
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
  <h1>Seth's Signals</h1>
  <p class="muted">Private publishing dashboard. Published notes appear separately from reported news.</p>
  <section class="card" id="login">
    <label for="token">Admin token</label>
    <input id="token" type="password" autocomplete="current-password">
    <button id="login-button">Unlock</button>
  </section>
  <div id="editor" hidden>
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
function renderSignals(items){
  const root=$('signals');root.replaceChildren();
  for(const signal of items){
    const article=document.createElement('article');article.className='card';
    const heading=document.createElement('strong');heading.textContent=signal.status==='published'?'Published':'Draft';
    const body=document.createElement('p');body.textContent=signal.text;
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
$('login-button').onclick=async()=>{
  adminToken=$('token').value.trim();
  try{await loadSignals();$('login').hidden=true;$('editor').hidden=false;}
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
