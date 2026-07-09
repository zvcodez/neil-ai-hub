// Cross-device sync: stores each dataset as data/<key>.json in the GitHub repo
// via the Contents API. Pull on start + on focus, push on change (debounced),
// last-write-wins by per-file timestamp. Local localStorage stays the live
// cache so the app works instantly and offline.
import {
  React, html, useState, useEffect, loadStore, saveStore, onStoreChange, applyExternalChange,
} from './core.js';
import { getToken, setToken } from './github.js';
import { Modal, Button, Icon, IconButton } from './components.js';

const OWNER = 'zvcodez';
const REPO = 'neil-ai-hub';
const BRANCH = 'main';

// Data stores that sync (UI prefs like theme/active tab stay local).
export const SYNC_KEYS = [
  'timeline', 'glossary', 'resources', 'projects',
  'career-roles', 'career-companies', 'career-applications', 'career-networking',
  'career-interview-prep', 'skills', 'business-ventures',
];

const ENABLED_KEY = 'nah:sync-enabled';
const META_KEY = 'nah:sync-meta'; // { [key]: { updatedAt, sha } }

// ---- small reactive status store -------------------------------------------
let status = { state: 'off', lastSync: loadStore('sync-last', null), error: '' };
const statusSubs = new Set();
function setStatus(patch) {
  status = { ...status, ...patch };
  statusSubs.forEach((fn) => fn(status));
}
export function useSyncStatus() {
  const [s, setS] = useState(status);
  useEffect(() => {
    statusSubs.add(setS);
    return () => statusSubs.delete(setS);
  }, []);
  return s;
}

// ---- config helpers ---------------------------------------------------------
export function isEnabled() { return loadStore('sync-enabled', false) === true; }
function setEnabled(v) { saveStore('sync-enabled', v); }
function getMeta() { return loadStore('sync-meta', {}); }
function setMeta(m) { saveStore('sync-meta', m); }
function touch(key) {
  const m = getMeta();
  m[key] = { ...(m[key] || {}), updatedAt: new Date().toISOString() };
  setMeta(m);
}

// ---- base64 (UTF-8 safe) ----------------------------------------------------
const enc = (str) => btoa(unescape(encodeURIComponent(str)));
const dec = (b64) => decodeURIComponent(escape(atob((b64 || '').replace(/\s/g, ''))));

// ---- GitHub Contents API ----------------------------------------------------
function headers() {
  const token = getToken();
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
const pathFor = (key) =>
  `https://api.github.com/repos/${OWNER}/${REPO}/contents/data/${key}.json`;

async function getFile(key) {
  const res = await fetch(`${pathFor(key)}?ref=${BRANCH}`, { headers: headers() });
  if (res.status === 404) return null;
  if (res.status === 401) throw new Error('Token rejected — make sure it has Contents read/write access.');
  if (!res.ok) throw new Error(`GitHub read failed (${res.status}).`);
  const json = await res.json();
  let parsed = { updatedAt: '', data: null };
  try { parsed = JSON.parse(dec(json.content)); } catch {}
  return { sha: json.sha, updatedAt: parsed.updatedAt || '', data: parsed.data };
}

async function putFile(key, value, updatedAt, sha, keepalive = false) {
  const body = {
    message: `sync: update ${key}.json`,
    content: enc(JSON.stringify({ updatedAt, data: value }, null, 2)),
    branch: BRANCH,
    ...(sha ? { sha } : {}),
  };
  const res = await fetch(pathFor(key), {
    method: 'PUT', headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body), keepalive,
  });
  if (res.status === 409 || res.status === 422) {
    // sha is stale — re-read and retry once with the latest sha (last write wins).
    const cur = await getFile(key);
    if (cur && cur.sha !== sha) return putFile(key, value, updatedAt, cur.sha, keepalive);
  }
  if (res.status === 401 || res.status === 403)
    throw new Error('Token lacks write access (needs Contents: read/write).');
  if (!res.ok) throw new Error(`GitHub write failed (${res.status}).`);
  const json = await res.json();
  return json.content && json.content.sha;
}

// ---- pull / push ------------------------------------------------------------
async function pushKey(key, keepalive = false) {
  const meta = getMeta();
  const updatedAt = (meta[key] && meta[key].updatedAt) || new Date().toISOString();
  const value = loadStore(key, []);
  const newSha = await putFile(key, value, updatedAt, meta[key] && meta[key].sha, keepalive);
  const m = getMeta();
  m[key] = { updatedAt, sha: newSha };
  setMeta(m);
}

// Reconcile one key between local and remote (last write wins by timestamp).
async function reconcile(key) {
  const remote = await getFile(key);
  const meta = getMeta();
  const localUpdatedAt = (meta[key] && meta[key].updatedAt) || '';

  if (!remote) {
    // No remote file yet — create it from local (only if we have local edits).
    if (localUpdatedAt) await pushKey(key);
    return;
  }
  if (remote.updatedAt > localUpdatedAt) {
    // Remote is newer — adopt it locally.
    applyExternalChange(key, remote.data);
    const m = getMeta();
    m[key] = { updatedAt: remote.updatedAt, sha: remote.sha };
    setMeta(m);
  } else if (localUpdatedAt && localUpdatedAt > remote.updatedAt) {
    // Local is newer — push it (remember the latest sha first).
    const m = getMeta();
    m[key] = { ...(m[key] || {}), sha: remote.sha };
    setMeta(m);
    await pushKey(key);
  } else {
    // In sync — just record the sha.
    const m = getMeta();
    m[key] = { updatedAt: remote.updatedAt, sha: remote.sha };
    setMeta(m);
  }
}

let running = false;
export async function syncAll() {
  if (!isEnabled() || !getToken() || running) return;
  running = true;
  setStatus({ state: 'syncing', error: '' });
  try {
    for (const key of SYNC_KEYS) {
      // eslint-disable-next-line no-await-in-loop
      await reconcile(key);
    }
    const now = new Date().toISOString();
    saveStore('sync-last', now);
    setStatus({ state: 'idle', lastSync: now, error: '' });
  } catch (e) {
    setStatus({ state: 'error', error: e.message || 'Sync failed.' });
  } finally {
    running = false;
  }
}

// ---- debounced push on local change ----------------------------------------
const dirty = new Set();
let timer = null;
async function flush(keepalive = false) {
  if (!isEnabled() || !getToken() || dirty.size === 0) return;
  const keys = [...dirty];
  dirty.clear();
  setStatus({ state: 'syncing', error: '' });
  try {
    for (const key of keys) {
      // eslint-disable-next-line no-await-in-loop
      await pushKey(key, keepalive);
    }
    const now = new Date().toISOString();
    saveStore('sync-last', now);
    setStatus({ state: 'idle', lastSync: now, error: '' });
  } catch (e) {
    keys.forEach((k) => dirty.add(k)); // retry later
    setStatus({ state: 'error', error: e.message || 'Sync failed.' });
  }
}

// ---- public controls --------------------------------------------------------
// Stamp any non-empty local store that has no timestamp yet, so existing data
// (entered before sync was turned on) gets uploaded on the first sync.
function stampExistingLocal() {
  const m = getMeta();
  for (const key of SYNC_KEYS) {
    const v = loadStore(key, null);
    const nonEmpty = Array.isArray(v) ? v.length > 0 : v && Object.keys(v).length > 0;
    if (nonEmpty && !(m[key] && m[key].updatedAt)) {
      m[key] = { ...(m[key] || {}), updatedAt: new Date().toISOString() };
    }
  }
  setMeta(m);
}

export async function enableSync(token) {
  if (token) setToken(token);
  if (!getToken()) throw new Error('A GitHub token is required.');
  // Validate token + repo access before flipping on.
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}`, { headers: headers() });
  if (res.status === 401) throw new Error('Token is invalid.');
  if (res.status === 404) throw new Error(`Can't see ${OWNER}/${REPO}. Give the token access to that repo.`);
  if (!res.ok) throw new Error(`GitHub error (${res.status}).`);
  setEnabled(true);
  stampExistingLocal();
  setStatus({ state: 'idle' });
  await syncAll();
}

export function disableSync() {
  setEnabled(false);
  setStatus({ state: 'off', error: '' });
}

// Start the engine: listen for local changes, pull periodically + on focus.
export function initSync() {
  if (isEnabled()) setStatus({ state: 'idle' });

  onStoreChange((key, value, meta) => {
    if (meta.external) return; // came from a pull — don't bounce it back
    if (!SYNC_KEYS.includes(key)) return;
    touch(key);
    if (!isEnabled() || !getToken()) return;
    dirty.add(key);
    clearTimeout(timer);
    timer = setTimeout(() => flush(false), 1500);
  });

  // Pull when the tab regains focus (picks up edits from other devices).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncAll();
    else flush(true); // best-effort push on hide
  });
  window.addEventListener('online', () => syncAll());

  // Periodic background pull while open.
  setInterval(() => { if (document.visibilityState === 'visible') syncAll(); }, 60000);

  if (isEnabled() && getToken()) syncAll();
}

// ---- UI ---------------------------------------------------------------------
function ago(iso) {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} h ago`;
  return new Date(iso).toLocaleString();
}

export function SyncButton({ compact }) {
  const [open, setOpen] = useState(false);
  const s = useSyncStatus();
  const on = s.state !== 'off';
  const icon = on ? 'cloud' : 'cloud-off';
  const label = s.state === 'syncing' ? 'Syncing…'
    : s.state === 'error' ? 'Sync error'
    : on ? 'Synced' : 'Sync off';
  return html`<${React.Fragment}>
    ${compact
      ? html`<button class=${`theme-toggle compact ${s.state === 'error' ? 'sync-err' : ''}`}
          title="Cross-device sync" onClick=${() => setOpen(true)}>
          <${Icon} name=${icon} size=${18} />
        </button>`
      : html`<button class=${`theme-toggle ${s.state === 'syncing' ? 'syncing' : ''} ${s.state === 'error' ? 'sync-err' : ''}`}
          title="Cross-device sync" onClick=${() => setOpen(true)}>
          <${Icon} name=${icon} size=${17} />
          <span>${label}</span>
        </button>`}
    ${open && html`<${SyncPanel} onClose=${() => setOpen(false)} />`}
  </>`;
}

function SyncPanel({ onClose }) {
  const s = useSyncStatus();
  const [token, setTok] = useState(getToken());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const on = isEnabled();

  const enable = async () => {
    setBusy(true); setErr('');
    try { await enableSync(token); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const turnOff = () => { disableSync(); onClose(); };
  const now = async () => { setBusy(true); setErr(''); await syncAll(); setBusy(false); };

  return html`<${Modal} title="Cross-device sync" accent="#10b981" onClose=${onClose}>
    <div class="token-help">
      <p>Sync your data across devices by storing it in your
        <strong>${OWNER}/${REPO}</strong> repo. Phone edits show up in your browser and vice-versa.</p>
      <p><strong>Keep the repo private</strong> — your notes are stored in it.</p>
      <p>Create a fine-grained token at
        <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">github.com → fine-grained tokens</a>:
        set <em>Resource owner</em> = ${OWNER}, give it access to only the
        <em>${REPO}</em> repo, and under <em>Repository permissions</em> set
        <strong>Contents: Read and write</strong>.</p>
    </div>

    <div class="field field-full">
      <label>GitHub token</label>
      <input type="password" value=${token} placeholder="github_pat_…" class="mono"
        onInput=${(e) => setTok(e.target.value)} />
    </div>

    ${(err || s.error) && html`<div class="sync-error"><${Icon} name="alert" size=${15} /> ${err || s.error}</div>`}

    <div class="sync-status">
      <span class=${`sync-dot ${on ? (s.state === 'error' ? 'err' : 'on') : 'off'}`}></span>
      ${on ? html`Sync is <strong>on</strong> · last synced ${ago(s.lastSync)}` : 'Sync is off'}
    </div>

    <div class="form-actions">
      ${on
        ? html`<${Button} variant="ghost" onClick=${turnOff}>Turn off<//>
               <${Button} variant="primary" icon="refresh" disabled=${busy} onClick=${now}>${busy ? 'Syncing…' : 'Sync now'}<//>`
        : html`<${Button} variant="ghost" onClick=${onClose}>Cancel<//>
               <${Button} variant="primary" icon="cloud" disabled=${busy || !token} onClick=${enable}>${busy ? 'Connecting…' : 'Enable sync'}<//>`}
    </div>
  <//>`;
}
