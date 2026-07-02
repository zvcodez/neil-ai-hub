import { html, useState, useMemo, useStore, uid, fmtDate, loadStore, matchesQuery } from '../core.js';
import {
  Button, Badge, Icon, IconButton, SearchBox, Segmented, Modal, Form, EmptyState, useConfirm,
} from '../components.js';
import { CollectionTab } from '../collection.js';

const SUBTABS = [
  { id: 'roles', label: 'Job Roles' },
  { id: 'companies', label: 'Companies' },
  { id: 'applications', label: 'Applications' },
  { id: 'networking', label: 'Networking' },
  { id: 'prep', label: 'Interview Prep' },
];

export function CareerTab({ accent }) {
  const [sub, setSub] = useStore('career-subtab', 'roles');
  const current = SUBTABS.some((s) => s.id === sub) ? sub : 'roles';
  return html`<div class="career">
    <div class="subtabs">
      ${SUBTABS.map(
        (s) => html`<button key=${s.id} class=${`subtab ${s.id === current ? 'active' : ''}`}
          onClick=${() => setSub(s.id)}>${s.label}</button>`
      )}
    </div>
    <div class="subtab-body">
      ${current === 'roles' && html`<${RolesTab} accent=${accent} />`}
      ${current === 'companies' && html`<${CompaniesTab} accent=${accent} />`}
      ${current === 'applications' && html`<${ApplicationsTab} accent=${accent} />`}
      ${current === 'networking' && html`<${NetworkingTab} accent=${accent} />`}
      ${current === 'prep' && html`<${PrepTab} accent=${accent} />`}
    </div>
  </div>`;
}

// ---- Job Roles --------------------------------------------------------------
const FITS = ['Great Fit', 'Stretch', 'Exploring'];
const fitOptions = FITS.map((f) => ({ value: f, label: f }));
const fitColor = { 'Great Fit': '#10b981', Stretch: '#f59e0b', Exploring: '#2563eb' };

function RolesTab({ accent }) {
  return html`<${CollectionTab}
    storeKey="career-roles"
    accent=${accent}
    newLabel="Add role"
    modalTitle="job role"
    searchKeys=${['title', 'why']}
    fields=${[
      { name: 'title', label: 'Role / job title', required: true },
      { name: 'description', label: 'What the role does', type: 'textarea' },
      { name: 'salary', label: 'Average salary range', placeholder: 'e.g. $90k–$120k' },
      { name: 'requiredSkills', label: 'Required skills', type: 'tags', placeholder: 'Add a skill, press Enter' },
      { name: 'fit', label: 'Your fit', type: 'select', options: fitOptions },
      { name: 'why', label: 'Why you want this role', type: 'textarea' },
      { name: 'dateAdded', label: 'Date added', type: 'date', default: 'today' },
    ]}
    sortOptions=${[
      { value: 'fit', label: 'Best fit', cmp: (a, b) => FITS.indexOf(a.fit) - FITS.indexOf(b.fit) },
      { value: 'az', label: 'A → Z', cmp: (a, b) => a.title.localeCompare(b.title) },
    ]}
    filters=${[{ key: 'fit', label: 'Fit', options: fitOptions }]}
    emptyText="No target roles yet."
    emptyHint="Define the roles you're aiming for."
    renderCard=${(it) => html`<div>
      <div class="card-head">
        <h3>${it.title}</h3>
        <${Badge} color=${fitColor[it.fit]}>${it.fit}<//>
      </div>
      ${it.salary && html`<div class="role-salary">${it.salary}</div>`}
      ${it.description && html`<p class="muted-text">${it.description}</p>`}
      ${it.requiredSkills?.length > 0 && html`<div class="project-tags">
        ${it.requiredSkills.map((s) => html`<span class="chip" key=${s}>${s}</span>`)}
      </div>`}
      ${it.why && html`<p class="muted-text"><em>${it.why}</em></p>`}
    </div>`}
  />`;
}

// ---- Companies --------------------------------------------------------------
const SIZES = ['Small', 'Medium', 'Large', 'Enterprise'];
const COMPANY_TYPES = [
  'Bulge-Bracket Bank', 'Boutique / Mid-Market Bank', 'Custody & Asset Servicing',
  'Asset Manager', 'Alternatives / Hedge Fund', 'Insurer', 'Exchange & Market Infrastructure',
  'Data & Ratings', 'Fintech / SMA Platforms', 'Broker-Dealer / Wealth',
];
const COMPANY_STATUSES = ['Researching', 'Applied', 'Interviewing', 'Offer', 'Passed', 'Rejected'];
const compStatusColor = {
  Researching: '#2563eb', Applied: '#f59e0b', Interviewing: '#a855f7',
  Offer: '#10b981', Passed: '#94a3b8', Rejected: '#94a3b8',
};

function CompaniesTab({ accent }) {
  return html`<${CollectionTab}
    storeKey="career-companies"
    accent=${accent}
    newLabel="Add company"
    modalTitle="company"
    searchKeys=${['name', 'industry', 'why']}
    fields=${[
      { name: 'name', label: 'Company name', required: true },
      { name: 'industry', label: 'Type', type: 'select', options: COMPANY_TYPES.map((t) => ({ value: t, label: t })) },
      { name: 'size', label: 'Company size', type: 'select', options: SIZES.map((s) => ({ value: s, label: s })) },
      { name: 'location', label: 'Location' },
      { name: 'website', label: 'Website', type: 'url', placeholder: 'https://...' },
      { name: 'why', label: 'Why you like them', type: 'textarea' },
      { name: 'status', label: 'Status', type: 'select', options: COMPANY_STATUSES.map((s) => ({ value: s, label: s })) },
      { name: 'dateAdded', label: 'Date added', type: 'date', default: 'today' },
    ]}
    sortOptions=${[
      { value: 'type', label: 'By type', cmp: (a, b) => (COMPANY_TYPES.indexOf(a.industry) - COMPANY_TYPES.indexOf(b.industry)) || a.name.localeCompare(b.name) },
      { value: 'az', label: 'A → Z', cmp: (a, b) => a.name.localeCompare(b.name) },
      { value: 'status', label: 'By status', cmp: (a, b) => COMPANY_STATUSES.indexOf(a.status) - COMPANY_STATUSES.indexOf(b.status) },
    ]}
    filters=${[
      { key: 'industry', label: 'Type', options: COMPANY_TYPES.map((t) => ({ value: t, label: t })) },
      { key: 'status', label: 'Status', options: COMPANY_STATUSES.map((s) => ({ value: s, label: s })) },
    ]}
    emptyText="No companies tracked yet."
    emptyHint="Add companies you'd love to work for."
    renderCard=${(it) => html`<div>
      <div class="card-head">
        ${it.website
          ? html`<a class="card-link" href=${it.website} target="_blank" rel="noreferrer">${it.name}<${Icon} name="external" size=${13} /></a>`
          : html`<h3>${it.name}</h3>`}
        <${Badge} color=${compStatusColor[it.status]}>${it.status}<//>
      </div>
      <div class="company-meta">
        ${it.industry && html`<span class="chip">${it.industry}</span>`}
        ${it.size && html`<span class="chip">${it.size}</span>`}
        ${it.location && html`<span class="chip">${it.location}</span>`}
      </div>
      ${it.why && html`<p class="muted-text">${it.why}</p>`}
    </div>`}
  />`;
}

// ---- Applications (status accordion, one section open at a time) -----------
const APP_STATUSES = ['To Apply', 'Applied', 'Did Not Apply', 'Followed Up', 'Interview Scheduled', 'Interview Completed', 'Offer', 'Rejected'];
const appStatusColor = {
  'To Apply': '#f97316', Applied: '#2563eb', 'Did Not Apply': '#64748b', 'Followed Up': '#06b6d4',
  'Interview Scheduled': '#a855f7', 'Interview Completed': '#f59e0b', Offer: '#10b981', Rejected: '#94a3b8',
};

// Batch = the day the posting landed in the hub (daily digest runs stamp _created).
const batchOf = (a) => a.batch || (a._created || '').slice(0, 10);

function AppCard({ app: a, statusOptions, onOpen, onRemove, onMove, onDecline }) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const meta = [
    a.salary,
    a.resume,
    a.deadline && a.status === 'To Apply' ? `due ${fmtDate(a.deadline)}` : '',
    a.status !== 'To Apply' && a.dateApplied ? `applied ${fmtDate(a.dateApplied)}` : '',
  ].filter(Boolean);

  return html`<div class="app-row" onClick=${() => onOpen(a)}>
    <div class="app-row-main">
      <div class="app-row-title">
        <strong>${a.company}</strong><span class="app-row-sep"> — </span>${a.jobTitle}
      </div>
      ${meta.length > 0 && html`<div class="app-row-meta">${meta.join(' · ')}</div>`}
      ${a.status === 'Did Not Apply' && a.noApplyReason && html`<div class="app-row-reason">“${a.noApplyReason}”</div>`}
    </div>
    <div class="app-row-actions" onClick=${(e) => e.stopPropagation()}>
      ${a.link && html`<a class="icon-btn" title="Open posting" href=${a.link} target="_blank" rel="noreferrer"><${Icon} name="external" size=${14} /></a>`}
      ${a.status !== 'To Apply' && html`<select class="app-status-select" value=${a.status}
        onChange=${(e) => onMove(a, e.target.value)}>
        ${statusOptions.map((s) => html`<option key=${s} value=${s}>${s}</option>`)}
      </select>`}
      ${a.status === 'To Apply' && !declining && html`<span class="app-applied-q">
        <span class="app-applied-label">Applied?</span>
        <button class="app-btn yes" onClick=${() => onMove(a, 'Applied')}>Yes</button>
        <button class="app-btn no" onClick=${() => setDeclining(true)}>No</button>
      </span>`}
      <button class="icon-btn danger" title="Delete" onClick=${() => onRemove(a)}>×</button>
    </div>
    ${declining && html`<div class="app-decline" onClick=${(e) => e.stopPropagation()}>
      <textarea rows="2" placeholder="Why not? (wrong fit, pay, location, bad posting…) — used to tune future postings"
        value=${reason} onInput=${(e) => setReason(e.target.value)} />
      <div class="app-decline-actions">
        <${Button} variant="primary" onClick=${() => { onDecline(a, reason.trim()); setDeclining(false); }}>Move to Did Not Apply<//>
        <${Button} onClick=${() => setDeclining(false)}>Cancel<//>
      </div>
    </div>`}
  </div>`;
}

function ApplicationsTab({ accent }) {
  const [apps, setApps] = useStore('career-applications', []);
  const [query, setQuery] = useState('');
  const [view, setView] = useState('sections');
  const [openSection, setOpenSection] = useState('To Apply');
  const [modal, setModal] = useState(null); // { editing }
  const confirm = useConfirm();

  const fields = [
    { name: 'company', label: 'Company name', required: true },
    { name: 'jobTitle', label: 'Job title', required: true },
    { name: 'link', label: 'Application link', type: 'url', placeholder: 'https://...' },
    { name: 'resume', label: 'Resume version (file in ~/Downloads)', placeholder: 'Neil_Patel_Resume_….docx' },
    { name: 'salary', label: 'Salary range', placeholder: 'e.g. $80k–$110k' },
    { name: 'deadline', label: 'Application deadline', type: 'date' },
    { name: 'dateApplied', label: 'Date applied', type: 'date', default: 'today' },
    { name: 'status', label: 'Status', type: 'select', options: APP_STATUSES.map((s) => ({ value: s, label: s })) },
    { name: 'noApplyReason', label: "Why you didn't apply (if you passed)", type: 'textarea', rows: 2 },
    { name: 'notes', label: 'Notes (who you spoke to, next steps)', type: 'textarea', rows: 4 },
  ];

  const save = (values) => {
    if (modal.editing) {
      const prev = modal.editing;
      const history = prev.statusHistory || [];
      const next = { ...prev, ...values };
      if (prev.status !== values.status) history.push({ status: values.status, at: new Date().toISOString() });
      next.statusHistory = history;
      setApps(apps.map((a) => (a.id === prev.id ? next : a)));
    } else {
      setApps([{ id: uid(), _created: new Date().toISOString(),
        statusHistory: [{ status: values.status, at: new Date().toISOString() }], ...values }, ...apps]);
    }
    setModal(null);
  };

  const stamp = (a, status, extra = {}) => ({
    ...a, ...extra, status,
    // Marking "Applied" stamps the applied date automatically.
    dateApplied: status === 'Applied' && !a.dateApplied ? new Date().toISOString().slice(0, 10) : a.dateApplied,
    statusHistory: [...(a.statusHistory || []), { status, at: new Date().toISOString() }],
  });
  const moveTo = (app, status) => {
    if (app.status === status) return;
    setApps(apps.map((a) => (a.id === app.id ? stamp(a, status) : a)));
  };
  const decline = (app, reason) => setApps(apps.map((a) => (
    a.id === app.id ? stamp(a, 'Did Not Apply', { noApplyReason: reason, noApplyAt: new Date().toISOString() }) : a
  )));

  const remove = (app) => confirm('Delete this application?', () => setApps(apps.filter((a) => a.id !== app.id)));

  const filtered = useMemo(
    () => apps.filter((a) => matchesQuery(query, a.company, a.jobTitle)),
    [apps, query]
  );

  const card = (a) => html`<${AppCard} key=${a.id} app=${a} statusOptions=${APP_STATUSES}
    onOpen=${(app) => setModal({ editing: app })} onRemove=${remove} onMove=${moveTo} onDecline=${decline} />`;

  // "To Apply" groups by the day the batch arrived; a date disappears once every
  // posting in it has been answered yes/no (nothing left with that batch date).
  const toApplyBatches = (col) => {
    const groups = new Map();
    for (const a of col) {
      const b = batchOf(a) || 'undated';
      if (!groups.has(b)) groups.set(b, []);
      groups.get(b).push(a);
    }
    return [...groups.entries()].sort((x, y) => y[0].localeCompare(x[0]));
  };

  return html`<div class="collection" style=${{ '--accent': accent }}>
    <div class="toolbar">
      <${SearchBox} value=${query} onChange=${setQuery} placeholder="Search applications..." />
      <${Segmented} options=${[{ value: 'sections', label: 'Pipeline' }, { value: 'list', label: 'List' }]}
        value=${view} onChange=${setView} />
      <div class="toolbar-spacer"></div>
      <${Button} variant="primary" icon="plus" onClick=${() => setModal({ editing: null })}>Add application<//>
    </div>

    ${apps.length === 0 && html`<${EmptyState} icon="career" text="No applications yet." hint="New postings land here each morning — answer Applied? Yes/No on each one." />`}

    ${apps.length > 0 && view === 'sections' &&
    html`<div class="app-sections">
      ${APP_STATUSES.map((status) => {
        const col = filtered.filter((a) => a.status === status);
        const isOpen = openSection === status;
        return html`<div class=${`app-section ${isOpen ? 'open' : ''}`} key=${status}>
          <button class="app-section-head" style=${{ '--col': appStatusColor[status] }}
            onClick=${() => setOpenSection(isOpen ? '' : status)}>
            <span class="kanban-dot"></span>${status}
            <span class="kanban-count">${col.length}</span>
            <span class=${`app-chevron ${isOpen ? 'open' : ''}`}>›</span>
          </button>
          ${isOpen && html`<div class="app-section-body">
            ${col.length === 0 && html`<p class="muted-text app-section-empty">Nothing here yet.</p>`}
            ${status === 'To Apply'
              ? toApplyBatches(col).map(([date, items]) => html`<div class="app-batch" key=${date}>
                  <div class="app-batch-head">${date === 'undated' ? 'Undated' : fmtDate(date)}
                    <span class="kanban-count">${items.length}</span></div>
                  ${items.map(card)}
                </div>`)
              : col.map(card)}
          </div>`}
        </div>`;
      })}
    </div>`}

    ${apps.length > 0 && view === 'list' &&
    html`<div class="table-wrap"><table class="data-table">
      <thead><tr><th>Company</th><th>Role</th><th>Applied</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${filtered.map((a) => html`<tr key=${a.id} onClick=${() => setModal({ editing: a })} class="clickable">
          <td class="cell-title">${a.company}</td>
          <td>${a.jobTitle}</td>
          <td class="muted-text">${fmtDate(a.dateApplied)}</td>
          <td><${Badge} color=${appStatusColor[a.status]}>${a.status}<//></td>
          <td class="row-actions"><button class="icon-btn danger" title="Delete"
            onClick=${(e) => { e.stopPropagation(); remove(a); }}>×</button></td>
        </tr>`)}
      </tbody>
    </table></div>`}

    ${modal &&
    html`<${Modal} title=${modal.editing ? 'Edit application' : 'New application'} accent=${accent} onClose=${() => setModal(null)}>
      <${Form} fields=${fields} initial=${modal.editing} onSubmit=${save} onCancel=${() => setModal(null)} />
    <//>`}
  </div>`;
}

// ---- Networking -------------------------------------------------------------
const MET_WAYS = ['LinkedIn', 'Referral', 'Event', 'Cold outreach', 'Other'];

function NetworkingTab({ accent }) {
  return html`<${CollectionTab}
    storeKey="career-networking"
    accent=${accent}
    newLabel="Add contact"
    modalTitle="contact"
    searchKeys=${['name', 'company', 'jobTitle']}
    fields=${[
      { name: 'name', label: "Person's name", required: true },
      { name: 'company', label: 'Company' },
      { name: 'jobTitle', label: 'Job title' },
      { name: 'howMet', label: 'How you met', type: 'select', options: MET_WAYS.map((m) => ({ value: m, label: m })) },
      { name: 'contact', label: 'Email or LinkedIn URL' },
      { name: 'lastContacted', label: 'Last contacted', type: 'date', default: 'today' },
      { name: 'notes', label: 'Relationship notes', type: 'textarea' },
      { name: 'followUp', label: 'Needs follow-up', type: 'checkbox', checkboxLabel: 'Flag for follow-up' },
    ]}
    sortOptions=${[
      { value: 'recent', label: 'Recently contacted', cmp: (a, b) => (b.lastContacted || '').localeCompare(a.lastContacted || '') },
      { value: 'az', label: 'A → Z', cmp: (a, b) => a.name.localeCompare(b.name) },
    ]}
    filters=${[
      { key: 'howMet', label: 'How met', options: MET_WAYS.map((m) => ({ value: m, label: m })) },
      { key: 'followUp', label: 'Follow-up', allLabel: 'Everyone', options: [{ value: true, label: 'Needs follow-up' }] },
    ]}
    emptyText="No contacts yet."
    emptyHint="Track the people in your professional network."
    renderCard=${(it) => html`<div class=${it.followUp ? 'needs-followup' : ''}>
      <div class="card-head">
        <h3>${it.name}</h3>
        ${it.followUp && html`<${Badge} color="#f97316"><${Icon} name="flag" size=${12} /> Follow up<//>`}
      </div>
      <div class="muted-text">${[it.jobTitle, it.company].filter(Boolean).join(' · ')}</div>
      <div class="company-meta">
        ${it.howMet && html`<span class="chip">${it.howMet}</span>`}
        ${it.lastContacted && html`<span class="chip">last: ${fmtDate(it.lastContacted)}</span>`}
      </div>
      ${it.contact && html`<a class="card-link" href=${it.contact.includes('@') ? 'mailto:' + it.contact : it.contact} target="_blank" rel="noreferrer">${it.contact}</a>`}
      ${it.notes && html`<p class="muted-text">${it.notes}</p>`}
    </div>`}
  />`;
}

// ---- Interview Prep ---------------------------------------------------------
const Q_TYPES = ['Behavioral', 'Technical', 'Situational', 'Culture Fit', 'Other'];
const qTypeColor = { Behavioral: '#f97316', Technical: '#2563eb', Situational: '#a855f7', 'Culture Fit': '#10b981', Other: '#94a3b8' };

function PrepTab({ accent }) {
  const [study, setStudy] = useState(false);
  // Source target-role options from the Job Roles store (read once on mount).
  const roleOptions = useMemo(() => {
    const roles = loadStore('career-roles', []);
    return [{ value: '', label: '— Any / general —' }, ...roles.map((r) => ({ value: r.title, label: r.title }))];
  }, []);

  return html`<${CollectionTab}
    storeKey="career-interview-prep"
    accent=${accent}
    newLabel="Add question"
    modalTitle="question"
    searchKeys=${['question', 'answer']}
    fields=${[
      { name: 'question', label: 'Question', type: 'textarea', required: true, rows: 2 },
      { name: 'qType', label: 'Question type', type: 'select', options: Q_TYPES.map((t) => ({ value: t, label: t })) },
      { name: 'answer', label: 'Your prepared answer', type: 'textarea', rows: 5 },
      { name: 'targetRole', label: 'Target role', type: 'select', options: roleOptions },
      { name: 'dateAdded', label: 'Date added', type: 'date', default: 'today' },
    ]}
    filters=${[
      { key: 'qType', label: 'Type', options: Q_TYPES.map((t) => ({ value: t, label: t })) },
      ...(roleOptions.length > 1 ? [{ key: 'targetRole', label: 'Role', options: roleOptions.filter((o) => o.value) }] : []),
    ]}
    toolbarExtra=${html`<${Segmented}
      options=${[{ value: false, label: 'Browse' }, { value: true, label: 'Study mode' }]}
      value=${study} onChange=${setStudy} />`}
    emptyText="No interview questions yet."
    emptyHint="Prep answers for the questions you expect."
    renderCard=${(it) => html`<${PrepCard} item=${it} study=${study} />`}
  />`;
}

function PrepCard({ item, study }) {
  const [revealed, setRevealed] = useState(false);
  const showAnswer = !study || revealed;
  return html`<div onClick=${() => study && setRevealed((r) => !r)} class=${study ? 'flip' : ''}>
    <div class="card-head">
      <h3 class="q-text">${item.question}</h3>
    </div>
    <div class="badge-row">
      <${Badge} color=${qTypeColor[item.qType]}>${item.qType}<//>
      ${item.targetRole && html`<${Badge}>${item.targetRole}<//>`}
    </div>
    ${study && !revealed && html`<p class="muted-text reveal-hint">Click to reveal your answer →</p>`}
    ${showAnswer && item.answer && html`<p class="answer-text">${item.answer}</p>`}
  </div>`;
}
