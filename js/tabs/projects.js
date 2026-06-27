// Projects pipeline: every project (even ones still in planning/discussion with
// Claude) tracked as a card that flows left→right across stages. Each card can
// deep-link to its Claude chat and launch Claude Code in its local folder.
import { html, useState, useMemo, useEffect, useRef, useStore, uid, fmtDate, matchesQuery } from '../core.js';
import {
  Button, Badge, Icon, IconButton, SearchBox, Segmented, Modal, Form, EmptyState, useConfirm,
} from '../components.js';

const STAGES = ['Idea', 'Discussing', 'Planning', 'Building', 'Live'];
const stageColor = {
  Idea: '#f59e0b', Discussing: '#06b6d4', Planning: '#a855f7', Building: '#2563eb', Live: '#10b981',
};
const stageOptions = STAGES.map((s) => ({ value: s, label: s }));

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
  "Let's add a new project to the Neil AI Hub. Interview me one question at a time to collect: " +
  'the project name, a one-line description, its stage (Idea, Discussing, Planning, Building, or Live), ' +
  'the local folder path, the GitHub repo URL, the live URL, and the immediate next step — I can skip any. ' +
  'Then add it to data/projects.json and commit & push, following the ' +
  '"Adding a project from a Claude Code session" instructions in CLAUDE.md.';
function discussUrl() {
  return launchUrl(HUB_FOLDER) + '?prompt=' + encodeURIComponent(NEW_PROJECT_PROMPT);
}

export function ProjectsTab({ accent }) {
  const [projects, setProjects] = useStore('projects', []);
  const [query, setQuery] = useState('');
  const [view, setView] = useState('pipeline');
  const [modal, setModal] = useState(null); // { editing }
  const [dragId, setDragId] = useState(null);
  const confirm = useConfirm();

  const fields = [
    { name: 'name', label: 'Project name', required: true },
    { name: 'description', label: 'Short description', placeholder: 'One line: what this project is',
      help: 'Shown prominently on the card so it’s easy to identify at a glance.' },
    { name: 'stage', label: 'Stage', type: 'select', options: stageOptions },
    { name: 'nextStep', label: 'Next step', placeholder: 'The next concrete thing to do' },
    { name: 'chatUrl', label: 'Claude chat link', type: 'url', placeholder: 'https://claude.ai/chat/…',
      help: 'Paste the URL from the address bar of the Claude conversation. Clicking reopens it.' },
    { name: 'folder', label: 'Local folder', placeholder: '~/Claude/my-project', mono: true,
      help: 'Path on this Mac. Powers the "Open in Claude Code" button.' },
    { name: 'repoUrl', label: 'GitHub repo', type: 'url', placeholder: 'https://github.com/…' },
    { name: 'liveUrl', label: 'Live URL', type: 'url', placeholder: 'https://…' },
    { name: 'notes', label: 'Notes', type: 'textarea', rows: 4 },
  ];

  const save = (values) => {
    if (modal.editing) {
      setProjects(projects.map((p) => (p.id === modal.editing.id ? { ...p, ...values } : p)));
    } else {
      setProjects([{ id: uid(), _created: new Date().toISOString(), ...values }, ...projects]);
    }
    setModal(null);
  };

  const moveTo = (id, stage) =>
    setProjects(projects.map((p) => (p.id === id && p.stage !== stage ? { ...p, stage } : p)));

  const patchProject = (id, patch) =>
    setProjects(projects.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const remove = (p) => confirm(`Delete "${p.name}"?`, () => setProjects(projects.filter((x) => x.id !== p.id)));

  const filtered = useMemo(
    () => projects.filter((p) => matchesQuery(query, p.name, p.notes, p.nextStep)),
    [projects, query]
  );

  const card = (p, showStage) => {
    const stage = p.stage || 'Idea';
    const menuItems = [
      p.repoUrl && { label: 'Open repo on GitHub', icon: 'github', onClick: () => window.open(p.repoUrl, '_blank', 'noreferrer') },
      p.folder && { label: 'Copy terminal command', icon: 'shortcuts', onClick: () => navigator.clipboard?.writeText(shellCommand(p.folder)) },
      { label: 'Edit', icon: 'edit', onClick: () => setModal({ editing: p }) },
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
        <h3 class="ppl-title">${p.name}</h3>
        <${CardMenu} items=${menuItems} />
      </div>

      ${showStage && html`<div><${Badge} color=${stageColor[stage]}>${stage}<//></div>`}

      <${InlineText} variant="desc" value=${p.description}
        placeholder="One line: what this project is" addLabel="+ Add description"
        onSave=${(v) => patchProject(p.id, { description: v })} />
      <${InlineText} variant="next" label="Next" value=${p.nextStep}
        placeholder="What's the next step?" addLabel="+ Add next step"
        onSave=${(v) => patchProject(p.id, { nextStep: v })} />
      ${p.notes && html`<p class="ppl-notes">${p.notes}</p>`}

      ${p.folder && html`<a class="ppl-launch" href=${launchUrl(p.folder)} title=${`Open ${p.folder} in Claude Code`}>
        <${Icon} name="shortcuts" size=${16} /> Open in Claude Code
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

    ${projects.length === 0 &&
    html`<${EmptyState} icon="projects" text="No projects yet."
      hint="Add a project at any stage — even one that's just an idea or a Claude chat. Drag cards left→right as they progress." />`}

    ${projects.length > 0 && view === 'pipeline' &&
    html`<div class=${`projects-pipeline ${dragId ? 'dragging' : ''}`}>
      ${STAGES.map((stage) => {
        const col = filtered.filter((p) => (p.stage || 'Idea') === stage);
        const empty = col.length === 0;
        return html`<div class=${`ppl-col ${empty ? 'empty' : ''}`} key=${stage}
          style=${{ '--stage': stageColor[stage] }}
          onDragOver=${(e) => e.preventDefault()}
          onDrop=${() => { if (dragId) moveTo(dragId, stage); setDragId(null); }}>
          <div class="ppl-col-head">
            <span class="dot"></span>${stage}<span class="ppl-col-count">${col.length || ''}</span>
          </div>
          <div class="ppl-col-cards">${col.map((p) => card(p, false))}</div>
        </div>`;
      })}
    </div>`}

    ${projects.length > 0 && view === 'grid' &&
    html`<div class="cards-grid ppl-grid">${filtered.map((p) => card(p, true))}</div>`}

    ${modal &&
    html`<${Modal} title=${modal.editing ? 'Edit project' : 'New project'} accent=${accent} onClose=${() => setModal(null)}>
      <${Form} fields=${fields} initial=${modal.editing} onSubmit=${save} onCancel=${() => setModal(null)} />
    <//>`}
  </div>`;
}

// Click-to-edit text right on the card (no menu digging). Used for both the
// description and the Next step. Empty fields show a subtle "+ Add …" prompt.
function InlineText({ value, onSave, label, placeholder, addLabel, variant }) {
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
    return html`<button class=${`ppl-add ${variant}`} onClick=${() => setEditing(true)}>${addLabel}</button>`;
  }
  return html`<div class=${`ppl-inline ${variant}`} title="Click to edit" onClick=${() => setEditing(true)}>
    ${label && html`<span class="ppl-next-label">${label}</span>`}${value}
  </div>`;
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
        : html`<button key=${it.label} class=${`menu-item ${it.danger ? 'danger' : ''}`}
            onClick=${() => { setOpen(false); it.onClick(); }}>
            <${Icon} name=${it.icon} size=${14} /> ${it.label}
          </button>`
      )}
    </div>`}
  </div>`;
}
