import { html, useState, useEffect, useMemo, useStore, fmtDate, relativeDate, matchesQuery } from '../core.js';
import {
  Button, Badge, Icon, IconButton, SearchBox, Segmented, Modal, Form, EmptyState,
} from '../components.js';
import { fetchRepos, getToken, setToken, USERNAME } from '../github.js';
import { addTimelineEntry } from './timeline.js';

const STATUSES = ['In Progress', 'Live', 'Paused'];
const statusOptions = STATUSES.map((s) => ({ value: s, label: s }));
const statusColor = { 'In Progress': '#2563eb', Live: '#10b981', Paused: '#94a3b8' };

// Turn a GitHub repo slug into a readable title: dashes/underscores -> spaces,
// then title-case each word. e.g. "neil-portfolio" -> "Neil Portfolio".
function prettify(slug) {
  return (slug || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ProjectsTab({ accent }) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [meta, setMeta] = useStore('projects-metadata', {});
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('updated');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editing, setEditing] = useState(null); // repo being edited
  const [showToken, setShowToken] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchRepos();
      setRepos(data);
    } catch (e) {
      setError(e.message || 'Failed to load repositories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const metaFor = (repo) => meta[repo.name] || {};
  const statusOf = (repo) => metaFor(repo).status || (repo.homepage ? 'Live' : 'In Progress');
  // Display name: manual override if set, otherwise the prettified repo slug.
  const displayNameOf = (repo) => (metaFor(repo).displayName || '').trim() || prettify(repo.name);

  const saveMeta = (values) => {
    setMeta({ ...meta, [editing.name]: { ...metaFor(editing), ...values } });
    setEditing(null);
  };

  const logLaunch = (repo) => {
    const added = addTimelineEntry({
      title: `Launched ${repo.name}`,
      description: repo.description || 'Project launched.',
      date: (repo.createdAt || '').slice(0, 10),
      category: 'Project Launch',
    });
    alert(added ? `Added "${repo.name}" to your Timeline.` : `"${repo.name}" is already on your Timeline.`);
  };

  const visible = useMemo(() => {
    let list = repos.filter((r) =>
      matchesQuery(query, displayNameOf(r), r.name, r.description, (metaFor(r).notes || ''))
    );
    if (statusFilter !== 'all') list = list.filter((r) => statusOf(r) === statusFilter);
    if (sort === 'name') list = [...list].sort((a, b) => displayNameOf(a).localeCompare(displayNameOf(b)));
    else list = [...list].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    return list;
  }, [repos, query, sort, statusFilter, meta]);

  return html`<div class="collection" style=${{ '--accent': accent }}>
    <div class="toolbar">
      <${SearchBox} value=${query} onChange=${setQuery} placeholder="Search projects..." />
      <label class="sort">Sort
        <select value=${sort} onChange=${(e) => setSort(e.target.value)}>
          <option value="updated">Recently updated</option>
          <option value="name">A → Z</option>
        </select>
      </label>
      <div class="toolbar-spacer"></div>
      <${IconButton} name="refresh" title="Refresh from GitHub" onClick=${load} />
      <${Button} variant="ghost" icon="github" onClick=${() => setShowToken(true)}>Token<//>
    </div>

    <div class="filters">
      <div class="filter-group">
        <span class="filter-label">Status</span>
        <${Segmented}
          options=${[{ value: 'all', label: 'All' }, ...statusOptions]}
          value=${statusFilter}
          onChange=${setStatusFilter}
        />
      </div>
      <div class="gh-account">
        <${Icon} name="github" size=${15} /> ${USERNAME}
      </div>
    </div>

    ${loading && html`<div class="loading"><span class="spinner"></span> Fetching repositories from GitHub…</div>`}

    ${error &&
    html`<div class="error-banner">
      <${Icon} name="alert" size=${18} />
      <div>
        <strong>${error}</strong>
        <p>Public repos work without a token. For higher rate limits or private repos, add a token.</p>
      </div>
      <${Button} variant="ghost" onClick=${load}>Retry<//>
      <${Button} variant="ghost" onClick=${() => setShowToken(true)}>Add token<//>
    </div>`}

    ${!loading && !error && repos.length === 0 &&
    html`<${EmptyState} icon="projects" text=${`No repositories found for ${USERNAME}.`} />`}

    ${visible.length > 0 &&
    html`<div class="cards-grid">
      ${visible.map((repo) => {
        const m = metaFor(repo);
        const status = statusOf(repo);
        return html`<div class="card project-card" key=${repo.id}>
          <div class="card-actions">
            <${IconButton} name="timeline" title="Add launch to Timeline" onClick=${() => logLaunch(repo)} />
            <${IconButton} name="edit" title="Edit URL, status & notes" onClick=${() => setEditing(repo)} />
          </div>
          <div class="card-head">
            <div class="project-title">
              <a class="card-link" href=${repo.htmlUrl} target="_blank" rel="noreferrer">
                ${displayNameOf(repo)}<${Icon} name="external" size=${14} />
              </a>
              ${displayNameOf(repo) !== repo.name &&
              html`<span class="repo-slug mono">${repo.name}</span>`}
            </div>
            <${Badge} color=${statusColor[status]}>${status}<//>
          </div>
          <p class="muted-text">${repo.description || 'No description on GitHub.'}</p>
          <div class="project-tags">
            ${repo.language && html`<span class="chip">${repo.language}</span>`}
            ${repo.stars > 0 && html`<span class="chip">★ ${repo.stars}</span>`}
            ${repo.isPrivate && html`<span class="chip">private</span>`}
            ${repo.isFork && html`<span class="chip">fork</span>`}
          </div>
          ${(m.liveUrl) &&
          html`<a class="live-url" href=${m.liveUrl} target="_blank" rel="noreferrer">
            <${Icon} name="external" size=${13} /> ${m.liveUrl.replace(/^https?:\/\//, '')}
          </a>`}
          ${m.notes && html`<p class="project-notes">${m.notes}</p>`}
          <div class="card-foot">
            <span>Updated ${relativeDate(repo.updatedAt)}</span>
            <a class="gh-btn" href=${repo.htmlUrl} target="_blank" rel="noreferrer">
              <${Icon} name="github" size=${14} /> GitHub
            </a>
          </div>
        </div>`;
      })}
    </div>`}

    ${editing &&
    html`<${Modal} title=${`${displayNameOf(editing)} — details`} accent=${accent} onClose=${() => setEditing(null)}>
      <${Form}
        fields=${[
          { name: 'displayName', label: 'Display name', full: true,
            placeholder: prettify(editing.name),
            help: `Shown on the card. Leave blank to use "${prettify(editing.name)}". The GitHub repo (${editing.name}) is never renamed.` },
          { name: 'liveUrl', label: 'Live URL', type: 'url', placeholder: 'https://...' },
          { name: 'status', label: 'Status', type: 'select', options: statusOptions, default: statusOf(editing) },
          { name: 'notes', label: 'Personal notes', type: 'textarea', rows: 4 },
        ]}
        initial=${metaFor(editing)}
        onSubmit=${saveMeta}
        onCancel=${() => setEditing(null)}
      />
    <//>`}

    ${showToken && html`<${TokenModal} accent=${accent} onClose=${() => setShowToken(false)} onSaved=${load} />`}
  </div>`;
}

function TokenModal({ onClose, onSaved, accent }) {
  const [val, setVal] = useState(getToken());
  return html`<${Modal} title="GitHub access token" accent=${accent} onClose=${onClose}>
    <div class="token-help">
      <p>Optional. Stored only in this browser (localStorage). Lets the app see private repos and raises the API rate limit.</p>
      <p>Create one at <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noreferrer">github.com/settings/tokens</a> with read-only repo access.</p>
    </div>
    <div class="field field-full">
      <label>Personal access token</label>
      <input type="password" value=${val} placeholder="github_pat_…" class="mono"
        onInput=${(e) => setVal(e.target.value)} />
    </div>
    <div class="form-actions">
      <${Button} variant="ghost" onClick=${() => { setToken(''); onClose(); onSaved(); }}>Clear<//>
      <${Button} variant="primary" icon="check" onClick=${() => { setToken(val); onClose(); onSaved(); }}>Save & reload<//>
    </div>
  <//>`;
}
