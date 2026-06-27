// Projects pipeline: every project (even ones still in planning/discussion with
// Claude) tracked as a card that moves across stages. Each card can deep-link to
// its Claude chat and launch Claude Code in its local folder on this Mac.
import { html, useState, useMemo, useStore, uid, fmtDate, matchesQuery } from '../core.js';
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
    { name: 'chatUrl', label: 'Claude chat link', type: 'url', placeholder: 'https://claude.ai/chat/…',
      help: 'Paste the URL from the address bar of the Claude conversation. Clicking reopens it.' },
    { name: 'folder', label: 'Local folder', placeholder: '~/Claude/my-project', mono: true,
      help: 'Path on this Mac. Powers the "Open in Claude Code" button.' },
    { name: 'repoUrl', label: 'GitHub repo', type: 'url', placeholder: 'https://github.com/…' },
    { name: 'liveUrl', label: 'Live URL', type: 'url', placeholder: 'https://…' },
    { name: 'nextStep', label: 'Next step', placeholder: 'The next concrete thing to do' },
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

  const card = (p) => html`<div
    class="app-card project-pipe-card" key=${p.id} draggable=${view === 'pipeline'}
    onDragStart=${() => setDragId(p.id)} onDragEnd=${() => setDragId(null)}
    onClick=${() => setModal({ editing: p })}
  >
    <div class="app-card-head">
      <strong>${p.name}</strong>
      <button class="icon-btn danger" title="Delete" onClick=${(e) => { e.stopPropagation(); remove(p); }}>×</button>
    </div>
    ${view === 'list' && html`<${Badge} color=${stageColor[p.stage]}>${p.stage || 'Idea'}<//>`}
    ${p.nextStep && html`<div class="project-next"><span class="next-label">Next</span> ${p.nextStep}</div>`}
    ${p.notes && html`<p class="muted-text project-pipe-notes">${p.notes}</p>`}
    <div class="project-links" onClick=${(e) => e.stopPropagation()}>
      ${p.chatUrl && html`<a class="proj-link chat" href=${p.chatUrl} target="_blank" rel="noreferrer">
        <${Icon} name="ideas" size=${13} /> Chat<//>`}
      ${p.folder && html`<${LaunchControls} folder=${p.folder} />`}
      ${p.repoUrl && html`<a class="proj-link" href=${p.repoUrl} target="_blank" rel="noreferrer">
        <${Icon} name="github" size=${13} /> Repo<//>`}
      ${p.liveUrl && html`<a class="proj-link" href=${p.liveUrl} target="_blank" rel="noreferrer">
        <${Icon} name="external" size=${13} /> Live<//>`}
    </div>
    ${p._created && html`<div class="app-foot"><span class="muted-text">Added ${fmtDate(p._created)}</span></div>`}
  </div>`;

  return html`<div class="collection" style=${{ '--accent': accent }}>
    <div class="toolbar">
      <${SearchBox} value=${query} onChange=${setQuery} placeholder="Search projects..." />
      <${Segmented} options=${[{ value: 'pipeline', label: 'Pipeline' }, { value: 'list', label: 'List' }]}
        value=${view} onChange=${setView} />
      <div class="toolbar-spacer"></div>
      <${Button} variant="primary" icon="plus" onClick=${() => setModal({ editing: null })}>Add project<//>
    </div>

    ${projects.length === 0 &&
    html`<${EmptyState} icon="projects" text="No projects yet."
      hint="Add a project at any stage — even one that's just an idea or a Claude chat. Drag cards across the pipeline as they progress." />`}

    ${projects.length > 0 && view === 'pipeline' &&
    html`<div class="kanban">
      ${STAGES.map((stage) => {
        const col = filtered.filter((p) => (p.stage || 'Idea') === stage);
        return html`<div class=${`kanban-col ${dragId ? 'droppable' : ''}`} key=${stage}
          onDragOver=${(e) => e.preventDefault()}
          onDrop=${() => { if (dragId) moveTo(dragId, stage); setDragId(null); }}>
          <div class="kanban-head" style=${{ '--col': stageColor[stage] }}>
            <span class="kanban-dot"></span>${stage}<span class="kanban-count">${col.length}</span>
          </div>
          <div class="kanban-cards">${col.map(card)}</div>
        </div>`;
      })}
    </div>`}

    ${projects.length > 0 && view === 'list' &&
    html`<div class="cards-grid">${filtered.map(card)}</div>`}

    ${modal &&
    html`<${Modal} title=${modal.editing ? 'Edit project' : 'New project'} accent=${accent} onClose=${() => setModal(null)}>
      <${Form} fields=${fields} initial=${modal.editing} onSubmit=${save} onCancel=${() => setModal(null)} />
    <//>`}
  </div>`;
}

// "Open in Claude Code" (one-click via the local launcher) + a copy-command
// fallback that works anywhere, even without the launcher installed.
function LaunchControls({ folder }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shellCommand(folder));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) { /* clipboard blocked; the launch link still works */ }
  };
  return html`<span class="launch-group">
    <a class="proj-link launch" href=${launchUrl(folder)} title=${`Open ${folder} in Claude Code`}>
      <${Icon} name="shortcuts" size=${13} /> Open in Claude Code<//>
    <button class="icon-btn" title="Copy terminal command" onClick=${copy}>
      <${Icon} name=${copied ? 'check' : 'edit'} size=${13} />
    </button>
  </span>`;
}
