// Projects pipeline: every project (even ones still in planning/discussion with
// Claude) tracked as a card that flows left→right across stages. Each card can
// deep-link to its Claude chat and launch Claude Code in its local folder.
import { html, useState, useMemo, useEffect, useRef, useStore, uid, fmtDate, matchesQuery } from '../core.js';
import {
  Button, Badge, Icon, IconButton, SearchBox, Segmented, Modal, Form, EmptyState, useConfirm,
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

export function ProjectsTab({ accent }) {
  const [projects, setProjects] = useStore('projects', []);
  const [query, setQuery] = useState('');
  const [view, setView] = useState('pipeline');
  const [stageFilter, setStageFilter] = useState('All');
  const [modal, setModal] = useState(null); // { editing }
  const [detailId, setDetailId] = useState(null); // project id for the detail view
  const [dragId, setDragId] = useState(null);
  const confirm = useConfirm();

  const fields = [
    { name: 'name', label: 'Project name', required: true },
    { name: 'description', label: 'Short description', placeholder: 'One line: what this project is',
      help: 'Shown prominently on the card so it’s easy to identify at a glance.' },
    { name: 'stage', label: 'Stage', type: 'select', options: stageOptions },
    { name: 'nextStep', label: 'Next step', placeholder: 'The next concrete thing to do' },
    { name: 'lastDid', label: 'What we just did', placeholder: 'Most recent progress',
      help: 'Auto-updated by Claude Code as you work; shown on the card.' },
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

  const card = (p, showStage) => {
    const stage = normStage(p);
    const menuItems = [
      { label: 'Open details', icon: 'external', onClick: () => setDetailId(p.id) },
      p.repoUrl && { label: 'Open repo on GitHub', icon: 'github', onClick: () => window.open(p.repoUrl, '_blank', 'noreferrer') },
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
      draggable=${view === 'pipeline'}
      onDragStart=${() => setDragId(p.id)} onDragEnd=${() => setDragId(null)}
    >
      <div class="ppl-head">
        <h3 class="ppl-title ppl-title-link" title="Open details"
          onClick=${() => setDetailId(p.id)}>${p.name}</h3>
        <${IconButton} name="expand" title="Open details" onClick=${() => setDetailId(p.id)} />
        <${CardMenu} items=${menuItems} />
      </div>

      ${showStage && html`<div><${Badge} color=${stageColor[stage]}>${stage}<//></div>`}

      <${InlineText} variant="desc" value=${p.description}
        placeholder="One line: what this project is" addLabel="+ Add description"
        onSave=${(v) => patchProject(p.id, { description: v })} />
      <${InlineText} variant="next" label="Next" value=${p.nextStep}
        placeholder="What's the next step?" addLabel="+ Add next step"
        onSave=${(v) => patchProject(p.id, { nextStep: v })} />
      <${InlineText} variant="did" label="Just did" value=${p.lastDid} hideWhenEmpty=${true}
        placeholder="Most recent progress"
        onSave=${(v) => patchProject(p.id, { lastDid: v })} />
      ${p.notes && html`<${Notes} text=${p.notes} />`}

      ${p.folder
        ? html`<a class="ppl-launch" href=${resumeUrl(p.folder)} title=${`Open ${p.folder} in Claude Code`}>
            <${Icon} name="shortcuts" size=${16} /> Open in Claude Code
          </a>`
        : html`<a class="ppl-launch" href=${startUrl(p)} title="Start this in Claude Code (opens in the hub)">
            <${Icon} name="shortcuts" size=${16} /> Start in Claude Code
          </a>`}

      ${(p.chatUrl || p.liveUrl) && html`<div class="ppl-secondary">
        ${p.chatUrl && html`<a class="ppl-link chat" href=${p.chatUrl} target="_blank" rel="noreferrer">
          <${Icon} name="ideas" size=${14} /> Chat<//>`}
        ${p.liveUrl && html`<a class="ppl-link" href=${p.liveUrl} target="_blank" rel="noreferrer">
          <${Icon} name="external" size=${14} /> Live<//>`}
      </div>`}
    </div>`;
  };

  return html`<div class="collection" style=${{ '--accent': accent }}>
    <div class="toolbar">
      <${SearchBox} value=${query} onChange=${setQuery} placeholder="Search projects..." />
      <${Segmented} options=${[{ value: 'pipeline', label: 'Pipeline' }, { value: 'grid', label: 'Grid' }]}
        value=${view} onChange=${setView} />
      <div class="toolbar-spacer"></div>
      <${Button} variant="ghost" icon="plus" onClick=${() => setModal({ editing: null })}>Add manually<//>
      <a class="btn btn-primary" href=${discussUrl()} title="Open Claude Code and talk through a new project — it files it for you">
        <${Icon} name="shortcuts" size=${15} /> New with Claude
      </a>
    </div>

    ${projects.length > 0 && html`<div class="filter-group ppl-stage-filter">
      <span class="filter-label">Stage</span>
      <${Segmented} options=${stageFilterOptions} value=${stageFilter} onChange=${setStageFilter} />
    </div>`}

    ${projects.length === 0 &&
    html`<${EmptyState} icon="projects" text="No projects yet."
      hint="Add a project at any stage — even one that's just an idea or a Claude chat. Drag cards left→right as they progress." />`}

    ${projects.length > 0 && view === 'pipeline' &&
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
          <div class="stage-cards">${col.map((p) => card(p, false))}</div>
        </section>`;
      })}
    </div>`}

    ${projects.length > 0 && view === 'grid' &&
    html`<div class="cards-grid ppl-grid">${filtered.map((p) => card(p, true))}</div>`}

    ${modal &&
    html`<${Modal} title=${modal.editing ? 'Edit project' : 'New project'} accent=${accent} onClose=${() => setModal(null)}>
      <${Form} fields=${fields} initial=${modal.editing} onSubmit=${save} onCancel=${() => setModal(null)} />
    <//>`}

    ${detailProject &&
    html`<${DetailModal} project=${detailProject} accent=${accent}
      onClose=${() => setDetailId(null)}
      onEdit=${() => { setModal({ editing: detailProject }); setDetailId(null); }}
      onMove=${(s) => moveTo(detailProject.id, s)}
      patch=${(patch) => patchProject(detailProject.id, patch)} />`}
  </div>`;
}

// Deep "open it up" view for a single project: everything about it in one place,
// plus a running Journal so you can come back weeks later and see exactly what
// you were doing and where you left off.
function DetailModal({ project: p, accent, onClose, onEdit, onMove, patch }) {
  const [draft, setDraft] = useState('');
  const stage = normStage(p);
  const log = Array.isArray(p.log) ? p.log : [];

  const addEntry = () => {
    const text = draft.trim();
    if (!text) return;
    patch({ log: [{ id: uid(), ts: new Date().toISOString(), text }, ...log] });
    setDraft('');
  };
  const delEntry = (id) => patch({ log: log.filter((e) => e.id !== id) });

  const field = (label, value) => value && html`<div class="pd-field">
    <div class="pd-label">${label}</div>
    <div class="pd-value">${value}</div>
  </div>`;

  return html`<${Modal} title=${p.name} accent=${accent} onClose=${onClose}>
    <div class="pd">
      <div class="pd-toprow">
        <${Badge} color=${stageColor[stage]}>${stage}<//>
        <div class="pd-move">
          ${STAGES.map((s) => html`<button key=${s} type="button"
            class=${`pd-move-btn ${s === stage ? 'current' : ''}`}
            style=${{ '--stage': stageColor[s] }}
            disabled=${s === stage}
            onClick=${() => onMove(s)}>${s}</button>`)}
        </div>
        <div class="pd-top-spacer"></div>
        <${Button} variant="ghost" icon="edit" onClick=${onEdit}>Edit<//>
      </div>

      ${field('What it is', p.description)}
      ${field('Next step', p.nextStep)}
      ${field('Just did', p.lastDid)}
      ${p.notes && html`<div class="pd-field">
        <div class="pd-label">Notes</div>
        <${Notes} text=${p.notes} />
      </div>`}

      <div class="pd-links">
        ${p.folder
          ? html`<a class="ppl-launch" href=${resumeUrl(p.folder)} title=${`Open ${p.folder} in Claude Code`}>
              <${Icon} name="shortcuts" size=${16} /> Open in Claude Code<//>`
          : html`<a class="ppl-launch" href=${startUrl(p)} title="Start this in Claude Code (opens in the hub)">
              <${Icon} name="shortcuts" size=${16} /> Start in Claude Code<//>`}
        ${p.chatUrl && html`<a class="ppl-link chat" href=${p.chatUrl} target="_blank" rel="noreferrer">
          <${Icon} name="ideas" size=${14} /> Chat<//>`}
        ${p.repoUrl && html`<a class="ppl-link" href=${p.repoUrl} target="_blank" rel="noreferrer">
          <${Icon} name="github" size=${14} /> Repo<//>`}
        ${p.liveUrl && html`<a class="ppl-link" href=${p.liveUrl} target="_blank" rel="noreferrer">
          <${Icon} name="external" size=${14} /> Live<//>`}
      </div>

      ${p.folder && html`<div class="pd-meta-line">${p.folder}</div>`}
      <div class="pd-meta-line">
        ${p._created ? `Added ${fmtDate(p._created)}` : ''}
        ${p._stagedAt ? ` · In ${stage} since ${fmtDate(p._stagedAt)}` : ''}
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
    </div>
  <//>`;
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

  return html`<div class="card-menu" ref=${ref}>
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
