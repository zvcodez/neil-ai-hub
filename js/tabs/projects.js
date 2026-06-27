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

export function ProjectsTab({ accent }) {
  const [projects, setProjects] = useStore('projects', []);
  const [query, setQuery] = useState('');
  const [view, setView] = useState('pipeline');
  const [modal, setModal] = useState(null); // { editing }
  const [dragId, setDragId] = useState(null);
  const confirm = useConfirm();

  const fields = [
    { name: 'name', label: 'Project name', required: true },
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

      ${p.nextStep && html`<div class="ppl-next"><span class="ppl-next-label">Next</span>${p.nextStep}</div>`}
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
      <${Button} variant="primary" icon="plus" onClick=${() => setModal({ editing: null })}>Add project<//>
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
