// Projects pipeline: every project (even ones still in planning/discussion with
// Claude) tracked as a card that flows left→right across stages. Each card can
// deep-link to its Claude chat and launch Claude Code in its local folder.
import { html, useState, useMemo, useEffect, useRef, useStore, uid, fmtDate, relativeDate, matchesQuery, externalLinkProps, IS_STANDALONE, ReactDOM } from '../core.js';
import {
  Button, Badge, Icon, IconButton, SearchBox, Segmented, Modal, Form, EmptyState, useConfirm, StatTile, Sparkline,
} from '../components.js';

const STAGES = ['Idea', 'Building', 'Live'];
const stageColor = { Idea: '#f59e0b', Building: '#2563eb', Live: '#10b981' };
const stageOptions = STAGES.map((s) => ({ value: s, label: s }));

// Discussing/Planning were removed from the board; fold any legacy cards into
// the remaining stages so nothing disappears.
const LEGACY_STAGE = { Discussing: 'Idea', Planning: 'Building' };
const normStage = (p) => {
  const s = p.stage || 'Idea';
  return STAGES.includes(s) ? s : (LEGACY_STAGE[s] || 'Idea');
};

// Build the claudecode:// link the local launcher app handles. Keep the path
// readable (slashes intact); only spaces need encoding.
function launchUrl(folder) {
  return 'claudecode://' + (folder || '').trim().replace(/ /g, '%20');
}
function shellCommand(folder) {
  return `cd "${(folder || '').trim()}" && claude`;
}

// Strip the scheme (and trailing slash) off a URL for compact display, e.g.
// "https://zvcodez.github.io/jot/" -> "zvcodez.github.io/jot".
function prettyUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname === '/' ? '' : u.pathname.replace(/\/$/, '');
    return u.host + path;
  } catch (e) {
    return url;
  }
}

// Age / activity facts for the detail view's stat tiles — derived from data
// that's already there (_created, _stagedAt, log) rather than tracked
// separately, so there's nothing new to keep in sync.
function computeStats(p) {
  const day = 86400000;
  const now = Date.now();
  const log = Array.isArray(p.log) ? p.log : [];
  const created = p._created ? new Date(p._created).getTime() : null;
  const staged = p._stagedAt ? new Date(p._stagedAt).getTime() : created;
  const daysOld = created != null && !isNaN(created) ? Math.max(0, Math.floor((now - created) / day)) : '—';
  const daysInStage = staged != null && !isNaN(staged) ? Math.max(0, Math.floor((now - staged) / day)) : '—';
  const lastTs = log[0]?.ts || p._stagedAt || p._created;
  const lastTouched = lastTs ? relativeDate(lastTs) : '—';

  // Weekly journal-entry counts, last 8 weeks — only shown once there's
  // enough history to look like a real trend rather than one lonely bar.
  let sparkline = null;
  if (log.length >= 2) {
    const weeks = new Array(8).fill(0);
    let any = false;
    log.forEach((e) => {
      const t = new Date(e.ts).getTime();
      if (isNaN(t)) return;
      const weeksAgo = Math.floor((now - t) / (7 * day));
      if (weeksAgo >= 0 && weeksAgo < 8) { weeks[7 - weeksAgo] += 1; any = true; }
    });
    if (any) sparkline = weeks;
  }
  return { daysOld, daysInStage, lastTouched, sparkline };
}

// "New with Claude": open Claude Code in the hub repo, pre-seeded to interview
// you about a project and write it into data/projects.json (sync surfaces it).
const HUB_FOLDER = '~/Claude/neil-ai-hub';
const NEW_PROJECT_PROMPT =
  "I've got a new project idea I want to talk through with you — I might not have the full scope yet, " +
  'so help me think it through as a conversation and tell me how you and Claude Code can help me build it. ' +
  'As soon as you understand the basics, create an entry for it in the Neil AI Hub (data/projects.json) ' +
  'with whatever we know so far, and keep it updated as we talk — especially the description, ' +
  'what’s next, and what we just did — following the "Adding & updating a project" instructions in CLAUDE.md. ' +
  'Start by asking me what the idea is.';
function discussUrl() {
  return launchUrl(HUB_FOLDER) + '?prompt=' + encodeURIComponent(NEW_PROJECT_PROMPT);
}

// "Open in Claude Code" on a card: launch a fresh session pre-seeded to catch
// itself up from the project's own files before doing anything, so picking a
// project back up lands you in a session that already knows where things stand.
const RESUME_PROMPT =
  'This is a fresh Claude Code session for a project tracked in the Neil AI Hub. ' +
  "Before anything else, read this project's CLAUDE.md (and README if present) to catch up on " +
  'what’s been built and the current state. Then give me a short summary of where things stand and ' +
  'what the next step is, and we’ll continue from there. Keep the project’s CLAUDE.md and its Hub ' +
  'card (lastDid / nextStep) up to date as we work, per the instructions in CLAUDE.md.';
function resumeUrl(folder) {
  return launchUrl(folder) + '?prompt=' + encodeURIComponent(RESUME_PROMPT);
}

// "Start in Claude Code" for a project that has no folder yet (e.g. an idea):
// launch in the hub repo, seeded with what we already jotted down, so we can
// start building it right away and file/scaffold it as we go.
function startUrl(p) {
  const prompt =
    `I want to start working on this idea from my Neil AI Hub: "${p.name || 'Untitled'}".\n` +
    (p.description ? `What it is: ${p.description}\n` : '') +
    (p.notes ? `My notes so far:\n${p.notes}\n` : '') +
    'Help me think it through and start building it — talk through the approach with me first. ' +
    'When we’re ready, set up its project folder and update its card in the Neil AI Hub ' +
    '(data/projects.json): add the folder, move it from Idea to Building when it makes sense, ' +
    'and keep nextStep / lastDid and the journal (log) updated as we work, per CLAUDE.md. ' +
    'Start by asking me how I want to approach it.';
  return launchUrl(HUB_FOLDER) + '?prompt=' + encodeURIComponent(prompt);
}

const REDUCE_MOTION = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function ProjectsTab({ accent }) {
  const [projects, setProjects] = useStore('projects', []);
  const [query, setQuery] = useState('');
  const [view, setView] = useState('pipeline'); // 'pipeline' | 'apps'
  const [stageFilter, setStageFilter] = useState('All');
  const [modal, setModal] = useState(null); // { editing }
  const [detailId, setDetailId] = useState(null); // project id for the detail view
  const [transitionId, setTransitionId] = useState(null); // id morphing between card <-> hero
  const [dragId, setDragId] = useState(null);
  const confirm = useConfirm();

  const fields = [
    { name: 'name', label: 'Project name', required: true },
    { name: 'description', label: 'Short description', placeholder: 'One line: what this project is',
      help: 'Shown on the card and at the top of the expanded view.' },
    { name: 'stage', label: 'Stage', type: 'select', options: stageOptions },
    { name: 'version', label: 'Version', placeholder: 'v1.2 or "MVP"',
      help: 'Shown as a small tag on the expanded view. Free text, optional.' },
    { name: 'nextStep', label: 'Next step', placeholder: 'The next concrete thing to do' },
    { name: 'lastDid', label: 'What we just did', placeholder: 'Most recent progress',
      help: 'Auto-updated by Claude Code as you work; shown on the expanded view.' },
    { name: 'chatUrl', label: 'Claude chat link', type: 'url', placeholder: 'https://claude.ai/chat/…',
      help: 'Paste the URL from the address bar of the Claude conversation. Clicking reopens it.' },
    { name: 'folder', label: 'Local folder', placeholder: '~/Claude/my-project', mono: true,
      help: 'Path on this Mac. Powers the "Open in Claude Code" button.' },
    { name: 'repoUrl', label: 'GitHub repo', type: 'url', placeholder: 'https://github.com/…' },
    { name: 'liveUrl', label: 'Live URL', type: 'url', placeholder: 'https://…' },
    { name: 'notes', label: 'Notes', type: 'textarea', rows: 4 },
  ];

  const save = (values) => {
    const now = new Date().toISOString();
    if (modal.editing) {
      const prev = modal.editing;
      const next = { ...prev, ...values };
      if (values.stage && values.stage !== prev.stage) next._stagedAt = now;
      setProjects(projects.map((p) => (p.id === prev.id ? next : p)));
    } else {
      setProjects([{ id: uid(), _created: now, _stagedAt: now, ...values }, ...projects]);
    }
    setModal(null);
  };

  // Record when a project entered its current stage so we can order within it.
  const moveTo = (id, stage) =>
    setProjects(projects.map((p) =>
      (p.id === id && p.stage !== stage ? { ...p, stage, _stagedAt: new Date().toISOString() } : p)));

  const patchProject = (id, patch) =>
    setProjects(projects.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const remove = (p) => confirm(`Delete "${p.name}"?`, () => setProjects(projects.filter((x) => x.id !== p.id)));

  // Expand/collapse a card into the full detail screen with a native "shared
  // element" morph (View Transitions API) — the clicked card's title and the
  // detail hero share a view-transition-name for one frame so the browser
  // animates between them. No-op fallback (instant swap) if unsupported or
  // the user has reduced motion on.
  const runTransition = (fn) => {
    if (!REDUCE_MOTION() && document.startViewTransition) {
      const t = document.startViewTransition(() => ReactDOM.flushSync(fn));
      t.finished.catch(() => {}).finally(() => setTransitionId(null));
    } else {
      fn();
    }
  };
  const openDetail = (id) => { setTransitionId(id); runTransition(() => setDetailId(id)); };
  const closeDetail = () => { setTransitionId(detailId); runTransition(() => setDetailId(null)); };

  const detailProject = detailId ? projects.find((p) => p.id === detailId) : null;

  const filtered = useMemo(
    () => projects.filter((p) =>
      (stageFilter === 'All' || normStage(p) === stageFilter) &&
      matchesQuery(query, p.name, p.notes, p.nextStep)),
    [projects, query, stageFilter]
  );

  // Count per stage (ignores the stage filter, respects the search box) for the
  // little badges on the filter chips.
  const stageCounts = useMemo(() => {
    const counts = { All: 0 };
    STAGES.forEach((s) => { counts[s] = 0; });
    projects.forEach((p) => {
      if (!matchesQuery(query, p.name, p.notes, p.nextStep)) return;
      counts.All += 1;
      counts[normStage(p)] = (counts[normStage(p)] || 0) + 1;
    });
    return counts;
  }, [projects, query]);
  const stageFilterOptions = ['All', ...STAGES].map((s) => ({
    value: s, label: stageCounts[s] ? `${s} ${stageCounts[s]}` : s,
  }));

  // Projects in a stage, ordered by when they entered it (oldest → newest).
  const inStage = (stage) =>
    filtered
      .filter((p) => normStage(p) === stage)
      .sort((a, b) => (a._stagedAt || a._created || '').localeCompare(b._stagedAt || b._created || ''));

  // Everything, alphabetically — the "find this one by name" view once the
  // count grows past what a board scan is good for.
  const allSorted = useMemo(
    () => [...projects]
      .filter((p) => matchesQuery(query, p.name, p.notes, p.nextStep))
      .sort((a, b) => (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())),
    [projects, query]
  );

  // Simplified board card: name + one-line description + (if it has a folder)
  // the one-tap launch button. Everything else — editing, links, stats,
  // journal — lives in the expanded detail view a click away.
  const card = (p) => {
    const stage = normStage(p);
    const menuItems = [
      p.repoUrl && { label: 'Open repo on GitHub', icon: 'github', onClick: () => window.open(p.repoUrl, IS_STANDALONE ? '_self' : '_blank', 'noreferrer') },
      p.folder && { label: 'Copy terminal command', icon: 'shortcuts', onClick: () => navigator.clipboard?.writeText(shellCommand(p.folder)) },
      { label: 'Edit', icon: 'edit', onClick: () => setModal({ editing: p }) },
      { divider: true },
      { info: 'Move to' },
      ...STAGES.map((s) => ({
        label: s, dot: stageColor[s], current: s === stage,
        onClick: () => moveTo(p.id, s),
      })),
      { divider: true },
      { label: 'Delete', icon: 'trash', danger: true, onClick: () => remove(p) },
      p._created && { divider: true },
      p._created && { info: `Added ${fmtDate(p._created)}` },
    ].filter(Boolean);

    return html`<div
      class="ppl-card" key=${p.id} style=${{ '--stage': stageColor[stage] }}
      draggable=${true} tabindex="0"
      onDragStart=${() => setDragId(p.id)} onDragEnd=${() => setDragId(null)}
      onClick=${(e) => { if (e.target.closest('.ppl-launch, .card-menu')) return; openDetail(p.id); }}
      onKeyDown=${(e) => { if (e.key === 'Enter' && !e.target.closest('.ppl-launch, .card-menu')) openDetail(p.id); }}
    >
      <div class="ppl-head">
        <h3 class="ppl-title" style=${transitionId === p.id ? { viewTransitionName: 'project-hero' } : undefined}>${p.name}</h3>
        <${CardMenu} items=${menuItems} />
      </div>

      <p class=${`ppl-card-desc ${p.description ? '' : 'empty'}`}>${p.description || 'No description yet'}</p>

      ${p.folder
        ? html`<a class="ppl-launch" href=${resumeUrl(p.folder)} onClick=${(e) => e.stopPropagation()} title=${`Open ${p.folder} in Claude Code`}>
            <${Icon} name="shortcuts" size=${14} /> Open in Claude Code
          </a>`
        : html`<a class="ppl-launch" href=${startUrl(p)} onClick=${(e) => e.stopPropagation()} title="Start this in Claude Code (opens in the hub)">
            <${Icon} name="shortcuts" size=${14} /> Start in Claude Code
          </a>`}
    </div>`;
  };

  return html`<div class="collection" style=${{ '--accent': accent }}>
    ${!detailProject && html`<div class="toolbar">
      <${SearchBox} value=${query} onChange=${setQuery} placeholder="Search projects..." />
      <${Segmented} options=${[{ value: 'pipeline', label: 'Pipeline' }, { value: 'apps', label: 'All Apps' }]}
        value=${view} onChange=${setView} />
      <div class="toolbar-spacer"></div>
      <${Button} variant="ghost" icon="plus" onClick=${() => setModal({ editing: null })}>Add manually<//>
      <a class="btn btn-primary" href=${discussUrl()} title="Open Claude Code and talk through a new project — it files it for you">
        <${Icon} name="shortcuts" size=${15} /> New with Claude
      </a>
    </div>`}

    ${!detailProject && projects.length > 0 && view === 'pipeline' && html`<div class="filter-group ppl-stage-filter">
      <span class="filter-label">Stage</span>
      <${Segmented} options=${stageFilterOptions} value=${stageFilter} onChange=${setStageFilter} />
    </div>`}

    ${!detailProject && projects.length === 0 &&
    html`<${EmptyState} icon="projects" text="No projects yet."
      hint="Add a project at any stage — even one that's just an idea or a Claude chat. Drag cards up/down to reorder, or use the menu to move stages." />`}

    ${!detailProject && projects.length > 0 && view === 'pipeline' &&
    html`<div class=${`projects-board ${dragId ? 'dragging' : ''}`}>
      ${STAGES.filter((stage) => stageFilter === 'All' || stage === stageFilter).map((stage) => {
        const col = inStage(stage);
        return html`<section class=${`stage-group ${col.length === 0 ? 'empty' : ''}`} key=${stage}
          style=${{ '--stage': stageColor[stage] }}
          onDragOver=${(e) => e.preventDefault()}
          onDrop=${() => { if (dragId) moveTo(dragId, stage); setDragId(null); }}>
          <div class="stage-head">
            <span class="dot"></span>${stage}<span class="stage-count">${col.length || ''}</span>
          </div>
          <div class="stage-cards">${col.map((p) => card(p))}</div>
        </section>`;
      })}
    </div>`}

    ${!detailProject && projects.length > 0 && view === 'apps' &&
    html`<div class="apps-list">
      ${allSorted.map((p) => {
        const stage = normStage(p);
        return html`<div class="apps-row" key=${p.id} tabindex="0"
          onClick=${() => openDetail(p.id)}
          onKeyDown=${(e) => { if (e.key === 'Enter') openDetail(p.id); }}>
          <span class="dot" style=${{ background: stageColor[stage] }}></span>
          <span class="aname">${p.name}</span>
          <span class=${`adesc ${p.description ? '' : 'empty'}`}>${p.description || 'No description yet'}</span>
          <span class="aarrow"><${Icon} name="back" size=${14} /></span>
        </div>`;
      })}
      ${allSorted.length === 0 && html`<p class="app-section-empty muted-text" style=${{ padding: '18px' }}>No projects match “${query}”.</p>`}
    </div>`}

    ${detailProject &&
    html`<${ProjectDetail} project=${detailProject} accent=${accent}
      heroTransitioning=${transitionId === detailProject.id}
      onClose=${closeDetail}
      onEdit=${() => setModal({ editing: detailProject })}
      onMove=${(s) => moveTo(detailProject.id, s)}
      patch=${(patch) => patchProject(detailProject.id, patch)} />`}

    ${modal &&
    html`<${Modal} title=${modal.editing ? 'Edit project' : 'New project'} accent=${accent} onClose=${() => setModal(null)}>
      <${Form} fields=${fields} initial=${modal.editing} onSubmit=${save} onCancel=${() => setModal(null)} />
    <//>`}
  </div>`;
}

// Full drill-in detail screen (not a modal) for a single project: everything
// about it in one place — live link right after the description, version/
// stage at the top, stats/trends, and a running Journal so you can come back
// weeks later and see exactly what you were doing and where you left off.
function ProjectDetail({ project: p, accent, heroTransitioning, onClose, onEdit, onMove, patch }) {
  const [draft, setDraft] = useState('');
  const stage = normStage(p);
  const log = Array.isArray(p.log) ? p.log : [];
  const stats = useMemo(() => computeStats(p), [p]);

  const addEntry = () => {
    const text = draft.trim();
    if (!text) return;
    patch({ log: [{ id: uid(), ts: new Date().toISOString(), text }, ...log] });
    setDraft('');
  };
  const delEntry = (id) => patch({ log: log.filter((e) => e.id !== id) });

  return html`<div class="pd" style=${{ '--stage': stageColor[stage], '--accent': accent }}>
    <button class="pd-back" onClick=${onClose}><${Icon} name="back" size=${15} /> Back to Projects</button>

    <div class="pd-toppills">
      <${Badge} color=${stageColor[stage]}>${stage}<//>
      ${p.version && html`<span class="pd-pill version">${p.version}</span>`}
      <div class="pd-move">
        ${STAGES.map((s) => html`<button key=${s} type="button"
          class=${`pd-move-btn ${s === stage ? 'current' : ''}`}
          style=${{ '--stage': stageColor[s] }}
          disabled=${s === stage}
          onClick=${() => onMove(s)}>${s}</button>`)}
      </div>
    </div>

    <h1 class="pd-hero-name" style=${heroTransitioning ? { viewTransitionName: 'project-hero' } : undefined}>${p.name}</h1>
    ${p.description
      ? html`<p class="pd-hero-desc">${p.description}</p>`
      : html`<p class="pd-hero-desc muted-text">No description yet.</p>`}

    <div class="pd-actions">
      ${p.liveUrl && html`<a class="pd-abtn live" href=${p.liveUrl} ...${externalLinkProps()}>
        <${Icon} name="external" size=${15} /> ${prettyUrl(p.liveUrl)}<//>`}
      ${p.folder
        ? html`<a class="pd-abtn launch" href=${resumeUrl(p.folder)}><${Icon} name="shortcuts" size=${15} /> Open in Claude Code<//>`
        : html`<a class="pd-abtn launch" href=${startUrl(p)}><${Icon} name="shortcuts" size=${15} /> Start in Claude Code<//>`}
      ${p.repoUrl && html`<a class="pd-abtn" href=${p.repoUrl} ...${externalLinkProps()}><${Icon} name="github" size=${15} /> Repo<//>`}
      ${p.chatUrl && html`<a class="pd-abtn" href=${p.chatUrl} ...${externalLinkProps()}><${Icon} name="ideas" size=${15} /> Chat<//>`}
      <button class="pd-abtn" onClick=${onEdit}><${Icon} name="edit" size=${15} /> Edit</button>
    </div>

    <div class="pd-grid">
      <div>
        <div class="pd-field">
          <div class="pd-label">Next step</div>
          <${InlineText} variant="next" value=${p.nextStep}
            placeholder="What's the next step?" addLabel="+ Add next step"
            onSave=${(v) => patch({ nextStep: v })} />
        </div>
        <div class="pd-field">
          <div class="pd-label">Just did</div>
          <${InlineText} variant="did" value=${p.lastDid}
            placeholder="Most recent progress" addLabel="+ Add what you just did"
            onSave=${(v) => patch({ lastDid: v })} />
        </div>
        ${p.notes && html`<div class="pd-field">
          <div class="pd-label">Notes</div>
          <${Notes} text=${p.notes} />
        </div>`}
        ${p.folder && html`<div class="pd-meta-line">${p.folder}</div>`}
        <div class="pd-meta-line">
          ${p._created ? `Added ${fmtDate(p._created)}` : ''}
          ${p._stagedAt ? ` · In ${stage} since ${fmtDate(p._stagedAt)}` : ''}
        </div>
      </div>

      <div class="pd-stats">
        <${StatTile} value=${stats.daysOld} label="Days old" />
        <${StatTile} value=${stats.daysInStage} label=${`Days in ${stage}`} />
        <${StatTile} value=${log.length} label="Journal entries" />
        <${StatTile} value=${stats.lastTouched} label="Last touched" />
        ${stats.sparkline && html`<div class="spark-card">
          <div class="stat-lbl">Activity, last 8 weeks</div>
          <${Sparkline} data=${stats.sparkline} />
        </div>`}
      </div>
    </div>

    <div class="pd-journal">
      <div class="pd-label">Journal <span class="pd-count">${log.length || ''}</span></div>
      <p class="pd-hint">Log what you worked on so you can pick it back up later.</p>
      <div class="pd-entry-new">
        <textarea class="pd-textarea" rows=${2} value=${draft}
          placeholder="What did you do / what's going on with this project?"
          onInput=${(e) => setDraft(e.target.value)}
          onKeyDown=${(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); addEntry(); } }} />
        <${Button} variant="primary" icon="plus" onClick=${addEntry}>Add entry<//>
      </div>
      ${log.length === 0
        ? html`<p class="pd-empty">No entries yet.</p>`
        : html`<ul class="pd-log">
          ${log.map((e) => html`<li class="pd-log-item" key=${e.id}>
            <div class="pd-log-head">
              <span class="pd-log-date">${fmtDate(e.ts)}</span>
              <${IconButton} name="trash" title="Delete entry" danger=${true} onClick=${() => delEntry(e.id)} />
            </div>
            <div class="pd-log-text">${e.text}</div>
          </li>`)}
        </ul>`}
    </div>
  </div>`;
}

// Click-to-edit text right on the card (no menu digging). Used for both the
// description and the Next step. Empty fields show a subtle "+ Add …" prompt.
function InlineText({ value, onSave, label, placeholder, addLabel, variant, hideWhenEmpty }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => { if (!editing) setDraft(value || ''); }, [value, editing]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next !== (value || '')) onSave(next);
  };

  if (editing) {
    return html`<div class=${`ppl-inline ${variant} editing`}>
      ${label && html`<span class="ppl-next-label">${label}</span>`}
      <input ref=${inputRef} class="ppl-inline-input" value=${draft} draggable=${false}
        placeholder=${placeholder}
        onMouseDown=${(e) => e.stopPropagation()}
        onInput=${(e) => setDraft(e.target.value)}
        onBlur=${commit}
        onKeyDown=${(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          else if (e.key === 'Escape') { setDraft(value || ''); setEditing(false); }
        }} />
    </div>`;
  }
  if (!value) {
    if (hideWhenEmpty) return null;
    return html`<button class=${`ppl-add ${variant}`} onClick=${() => setEditing(true)}>${addLabel}</button>`;
  }
  return html`<div class=${`ppl-inline ${variant}`} title="Click to edit" onClick=${() => setEditing(true)}>
    ${label && html`<span class="ppl-next-label">${label}</span>`}${value}
  </div>`;
}

// Notes render as a bulleted list when they're multi-line (each line a point);
// a single line stays a plain paragraph.
function Notes({ text }) {
  const lines = (text || '')
    .split('\n')
    .map((l) => l.replace(/^\s*[•\-*]\s*/, '').trim())
    .filter(Boolean);
  if (lines.length <= 1) return html`<p class="ppl-notes">${text}</p>`;
  return html`<ul class="ppl-notes ppl-notes-list">
    ${lines.map((l, i) => html`<li key=${i}>${l}</li>`)}
  </ul>`;
}

// Small "⋯" overflow menu for the rarely-used / maintenance actions.
function CardMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return html`<div class="card-menu" ref=${ref} onClick=${(e) => e.stopPropagation()}>
    <button class="icon-btn" title="More" onClick=${() => setOpen((o) => !o)}>⋯</button>
    ${open && html`<div class="card-menu-pop">
      ${items.map((it, i) =>
        it.divider ? html`<div class="menu-div" key=${'d' + i}></div>`
        : it.info ? html`<div class="menu-info" key=${'i' + i}>${it.info}</div>`
        : it.dot ? html`<button key=${it.label} class=${`menu-item menu-stage ${it.current ? 'current' : ''}`}
            disabled=${it.current}
            onClick=${() => { setOpen(false); it.onClick(); }}>
            <span class="menu-dot" style=${{ background: it.dot }}></span>${it.label}
            ${it.current && html`<span class="menu-check">✓</span>`}
          </button>`
        : html`<button key=${it.label} class=${`menu-item ${it.danger ? 'danger' : ''}`}
            onClick=${() => { setOpen(false); it.onClick(); }}>
            <${Icon} name=${it.icon} size=${14} /> ${it.label}
          </button>`
      )}
    </div>`}
  </div>`;
}
