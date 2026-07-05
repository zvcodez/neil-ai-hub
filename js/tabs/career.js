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
const splitLines = (s) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean);

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
      ${(a.skills?.length > 0 || a.bulletsTD || a.bulletsBloomberg || a.bulletsBC) && html`<details class="net-msg" onClick=${(e) => e.stopPropagation()}>
        <summary>Skills & resume bullets (for Workday)</summary>
        ${a.skills?.length > 0 && html`<div class="net-msg-block">
          <div class="net-msg-head"><span class="net-label">Skills — best fit first, then reach skills</span><${CopyBtn} text=${a.skills.join(', ')} /></div>
          <div class="project-tags">${a.skills.map((s, i) => html`<span class="chip" key=${i}>${s}</span>`)}</div>
        </div>`}
        ${a.bulletsTD && html`<div class="net-msg-block">
          <div class="net-msg-head"><span class="net-label">TD Bank bullets</span><${CopyBtn} text=${a.bulletsTD} /></div>
          <ul class="bullet-list">${splitLines(a.bulletsTD).map((b, i) => html`<li key=${i}>${b}</li>`)}</ul>
        </div>`}
        ${a.bulletsBloomberg && html`<div class="net-msg-block">
          <div class="net-msg-head"><span class="net-label">Bloomberg bullets</span><${CopyBtn} text=${a.bulletsBloomberg} /></div>
          <ul class="bullet-list">${splitLines(a.bulletsBloomberg).map((b, i) => html`<li key=${i}>${b}</li>`)}</ul>
        </div>`}
        ${a.bulletsBC && html`<div class="net-msg-block">
          <div class="net-msg-head"><span class="net-label">B&C Enterprise bullets</span><${CopyBtn} text=${a.bulletsBC} /></div>
          <ul class="bullet-list">${splitLines(a.bulletsBC).map((b, i) => html`<li key=${i}>${b}</li>`)}</ul>
        </div>`}
      </details>`}
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
    { name: 'skills', label: 'Skills for Workday (best fit first, then reach skills)', type: 'tags', placeholder: 'Add a skill, press Enter', full: true },
    { name: 'bulletsTD', label: 'TD Bank resume bullets (one per line)', type: 'textarea', rows: 5, full: true },
    { name: 'bulletsBloomberg', label: 'Bloomberg resume bullets (one per line)', type: 'textarea', rows: 5, full: true },
    { name: 'bulletsBC', label: 'B&C Enterprise resume bullets (one per line)', type: 'textarea', rows: 2, full: true },
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

// ---- Networking (one outreach target per application) -----------------------
const NET_STATUSES = ['To Contact', 'Contacted', 'Did Not Contact'];
const netStatusColor = { 'To Contact': '#f97316', Contacted: '#10b981', 'Did Not Contact': '#94a3b8' };
const DEFAULT_CADENCE = 'Send Tue to Thu morning. If no reply, one polite bump after 5 to 7 days, then stop. Never attach the resume in the first message.';
const netStatusOf = (c) => (NET_STATUSES.includes(c.status) ? c.status : 'To Contact');
// Applications you're no longer chasing don't need outreach.
const DEAD_APP_STATUSES = ['Did Not Apply', 'Rejected'];
const normco = (s) => (s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '');

function CopyBtn({ text }) {
  const [done, setDone] = useState(false);
  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(text).then(() => {
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    });
  };
  return html`<button class=${`net-copy ${done ? 'done' : ''}`} onClick=${copy}>${done ? 'Copied' : 'Copy'}</button>`;
}

function NetRow({ contact: c, onOpen, onRemove, onMove, onDecline }) {
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const status = netStatusOf(c);
  const hasContact = Boolean((c.contactName || '').trim());
  const contactHref = c.contactUrl && (c.contactUrl.includes('@') ? `mailto:${c.contactUrl}` : c.contactUrl);

  return html`<div class="app-row" onClick=${() => onOpen(c)}>
    <div class="app-row-main">
      <div class="app-row-title">
        <strong>${c.role || c.jobTitle || 'Outreach'}</strong><span class="app-row-sep"> · </span>${c.company}
      </div>
      <div class="app-row-meta" onClick=${(e) => e.stopPropagation()}>
        ${hasContact
          ? html`Contact: ${contactHref
              ? html`<a href=${contactHref} target="_blank" rel="noreferrer">${c.contactName}</a>`
              : c.contactName}`
          : html`No contact yet${c.whoToFind ? ` · look for: ${c.whoToFind}` : ''}
            ${c.findUrl && html` · <a href=${c.findUrl} target="_blank" rel="noreferrer">find on LinkedIn</a>`}`}
      </div>
      <div class="company-meta">
        <span class="chip">Tue to Thu morning</span>
        <span class="chip">bump once after 5 to 7 days</span>
        ${status === 'Contacted' && c.contactedAt && html`<span class="chip">contacted ${fmtDate(c.contactedAt)}</span>`}
      </div>
      ${status === 'Did Not Contact' && c.noContactReason && html`<div class="app-row-reason">“${c.noContactReason}”</div>`}
      ${(c.message || c.messageLong) && html`<details class="net-msg" onClick=${(e) => e.stopPropagation()}>
        <summary>Outreach message</summary>
        ${c.message && html`<div class="net-msg-block">
          <div class="net-msg-head"><span class="net-label">Connection note · send with the request</span><${CopyBtn} text=${c.message} /></div>
          <p>${c.message}</p>
        </div>`}
        ${c.messageLong && html`<div class="net-msg-block">
          <div class="net-msg-head"><span class="net-label">Longer version · InMail or email</span><${CopyBtn} text=${c.messageLong} /></div>
          <p>${c.messageLong}</p>
        </div>`}
        <div class="net-msg-block">
          <div class="net-msg-head"><span class="net-label">Cadence</span></div>
          <p>${c.cadence || DEFAULT_CADENCE}</p>
        </div>
      </details>`}
    </div>
    <div class="app-row-actions" onClick=${(e) => e.stopPropagation()}>
      ${c.appLink && html`<a class="icon-btn" title="Open job posting" href=${c.appLink} target="_blank" rel="noreferrer"><${Icon} name="external" size=${14} /></a>`}
      ${status !== 'To Contact' && html`<select class="app-status-select" value=${status}
        onChange=${(e) => onMove(c, e.target.value)}>
        ${NET_STATUSES.map((s) => html`<option key=${s} value=${s}>${s}</option>`)}
      </select>`}
      ${status === 'To Contact' && !declining && html`<span class="app-applied-q">
        <span class="app-applied-label">Contacted?</span>
        <button class="app-btn yes" onClick=${() => onMove(c, 'Contacted')}>Yes</button>
        <button class="app-btn no" onClick=${() => setDeclining(true)}>No</button>
      </span>`}
      <button class="icon-btn danger" title="Delete" onClick=${() => onRemove(c)}>×</button>
    </div>
    ${declining && html`<div class="app-decline" onClick=${(e) => e.stopPropagation()}>
      <textarea rows="2" placeholder="Why no outreach? (no good contact, applied without it, role closed…)"
        value=${reason} onInput=${(e) => setReason(e.target.value)} />
      <div class="app-decline-actions">
        <${Button} variant="primary" onClick=${() => { onDecline(c, reason.trim()); setDeclining(false); }}>Move to Did Not Contact<//>
        <${Button} onClick=${() => setDeclining(false)}>Cancel<//>
      </div>
    </div>`}
  </div>`;
}

function NetworkingTab({ accent }) {
  const [contacts, setContacts] = useStore('career-networking', []);
  const [query, setQuery] = useState('');
  const [openSection, setOpenSection] = useState('To Contact');
  const [modal, setModal] = useState(null); // { editing } | { prefill }
  const confirm = useConfirm();

  // Coverage: every application you're still chasing should have an outreach
  // entry (Neil's standing mandate). Read applications once, then flag any that
  // no contact covers yet — matched by posting link or company. Recomputes when
  // contacts change, so adding one here clears it from the list immediately.
  const apps = useMemo(() => loadStore('career-applications', []), []);
  const uncovered = useMemo(() => {
    const active = apps.filter((a) => a.company && !DEAD_APP_STATUSES.includes(a.status));
    return active.filter((a) => !contacts.some((c) =>
      (a.link && c.appLink && a.link === c.appLink) || normco(c.company) === normco(a.company)
    ));
  }, [apps, contacts]);
  const activeCount = useMemo(
    () => apps.filter((a) => a.company && !DEAD_APP_STATUSES.includes(a.status)).length,
    [apps]
  );

  const fields = [
    { name: 'company', label: 'Company', required: true },
    { name: 'role', label: 'Job role this outreach is for' },
    { name: 'appLink', label: 'Job posting link', type: 'url', placeholder: 'https://...' },
    { name: 'contactName', label: 'Contact name (blank if none yet)' },
    { name: 'contactUrl', label: 'Contact LinkedIn URL or email' },
    { name: 'whoToFind', label: 'Who to look for (if no contact yet)' },
    { name: 'findUrl', label: 'Where to find them (LinkedIn search link)', type: 'url' },
    { name: 'message', label: 'Connection note (under 300 chars)', type: 'textarea', rows: 3 },
    { name: 'messageLong', label: 'Longer version (InMail or email)', type: 'textarea', rows: 5 },
    { name: 'cadence', label: 'Cadence', type: 'textarea', rows: 2 },
    { name: 'status', label: 'Status', type: 'select', options: NET_STATUSES.map((s) => ({ value: s, label: s })) },
    { name: 'noContactReason', label: 'Why no outreach (if you passed)', type: 'textarea', rows: 2 },
  ];

  const save = (values) => {
    const v = { ...values, cadence: values.cadence || DEFAULT_CADENCE, status: values.status || 'To Contact' };
    if (modal.editing) {
      setContacts(contacts.map((c) => (c.id === modal.editing.id ? { ...modal.editing, ...v } : c)));
    } else {
      setContacts([{ id: uid(), _created: new Date().toISOString(), ...v }, ...contacts]);
    }
    setModal(null);
  };

  const stamp = (c, status, extra = {}) => ({
    ...c, ...extra, status,
    // Marking "Contacted" stamps the date so the 5 to 7 day bump can be timed.
    contactedAt: status === 'Contacted' && !c.contactedAt ? new Date().toISOString().slice(0, 10) : c.contactedAt,
  });
  const moveTo = (c, status) => {
    if (netStatusOf(c) === status && c.status === status) return;
    setContacts(contacts.map((x) => (x.id === c.id ? stamp(x, status) : x)));
  };
  const decline = (c, reason) => setContacts(contacts.map((x) => (
    x.id === c.id ? stamp(x, 'Did Not Contact', { noContactReason: reason }) : x
  )));
  const remove = (c) => confirm('Delete this outreach entry?', () => setContacts(contacts.filter((x) => x.id !== c.id)));

  const filtered = useMemo(
    () => contacts.filter((c) => matchesQuery(query, c.company, c.role, c.jobTitle, c.contactName)),
    [contacts, query]
  );

  return html`<div class="collection" style=${{ '--accent': accent }}>
    <div class="toolbar">
      <${SearchBox} value=${query} onChange=${setQuery} placeholder="Search outreach..." />
      <div class="toolbar-spacer"></div>
      <${Button} variant="primary" icon="plus" onClick=${() => setModal({ editing: null })}>Add outreach<//>
    </div>

    ${uncovered.length > 0 && html`<div class="net-coverage">
      <div class="net-coverage-head">
        <strong>${uncovered.length} application${uncovered.length > 1 ? 's' : ''} without outreach yet</strong>
        <span>Every role you're chasing should have a contact plan. Add one in a tap.</span>
      </div>
      <div class="net-coverage-list">
        ${uncovered.map((a) => html`<div class="net-coverage-item" key=${a.id || a.link}>
          <div class="net-coverage-role"><strong>${a.company}</strong>${a.jobTitle ? html`<span class="app-row-sep"> · </span>${a.jobTitle}` : ''}</div>
          <${Button} onClick=${() => setModal({ editing: null, prefill: {
            company: a.company, role: a.jobTitle || '', appLink: a.link || '', status: 'To Contact',
          } })}>Add outreach<//>
        </div>`)}
      </div>
    </div>`}
    ${uncovered.length === 0 && activeCount > 0 && html`<div class="net-coverage all-clear">
      <span>✓ All ${activeCount} active application${activeCount > 1 ? 's have' : ' has'} an outreach entry.</span>
    </div>`}

    ${contacts.length === 0 && html`<${EmptyState} icon="career" text="No outreach targets yet."
      hint="Every application gets a matching outreach entry here — answer Contacted? Yes/No on each one." />`}

    ${contacts.length > 0 && html`<div class="app-sections">
      ${NET_STATUSES.map((status) => {
        const col = filtered.filter((c) => netStatusOf(c) === status);
        const isOpen = openSection === status;
        return html`<div class=${`app-section ${isOpen ? 'open' : ''}`} key=${status}>
          <button class="app-section-head" style=${{ '--col': netStatusColor[status] }}
            onClick=${() => setOpenSection(isOpen ? '' : status)}>
            <span class="kanban-dot"></span>${status}
            <span class="kanban-count">${col.length}</span>
            <span class=${`app-chevron ${isOpen ? 'open' : ''}`}>›</span>
          </button>
          ${isOpen && html`<div class="app-section-body">
            ${col.length === 0 && html`<p class="muted-text app-section-empty">Nothing here yet.</p>`}
            ${col.map((c) => html`<${NetRow} key=${c.id} contact=${c}
              onOpen=${(x) => setModal({ editing: x })} onRemove=${remove} onMove=${moveTo} onDecline=${decline} />`)}
          </div>`}
        </div>`;
      })}
    </div>`}

    ${modal && html`<${Modal} title=${modal.editing ? 'Edit outreach' : 'New outreach'} accent=${accent} onClose=${() => setModal(null)}>
      <${Form} fields=${fields} initial=${modal.editing || modal.prefill} onSubmit=${save} onCancel=${() => setModal(null)} />
    <//>`}
  </div>`;
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
