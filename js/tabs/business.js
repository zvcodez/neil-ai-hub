// Business: side-venture tracker. Broader than the Projects pipeline — this is
// about the money side (revenue/cost/customers per venture), separated by
// business idea, with an Overview that rolls everything up. Modeled on
// projects.js's pipeline + journal pattern, kept leaner (metrics instead of
// code-launch integration) since the two tabs serve different jobs.
import { html, useState, useMemo, useRef, useEffect, useStore, uid, fmtDate, matchesQuery, externalLinkProps } from '../core.js';
import {
  Button, Badge, Icon, IconButton, SearchBox, Segmented, Modal, Form, EmptyState, useConfirm,
} from '../components.js';

const STAGES = ['Idea', 'Building', 'Live'];
const stageColor = { Idea: '#f59e0b', Building: '#2563eb', Live: '#10b981' };
const stageOptions = STAGES.map((s) => ({ value: s, label: s }));
const normStage = (v) => (STAGES.includes(v.stage) ? v.stage : 'Idea');

const fmtMoney = (n) => (n || n === 0) && !isNaN(n) ? `$${Number(n).toLocaleString()}` : '—';
const fmtNum = (n) => (n || n === 0) && !isNaN(n) ? Number(n).toLocaleString() : '—';

const FIELDS = [
  { name: 'name', label: 'Business / venture name', required: true },
  { name: 'description', label: 'Short description', placeholder: 'One line: what it is / how it makes money' },
  { name: 'stage', label: 'Stage', type: 'select', options: stageOptions },
  { name: 'monthlyRevenue', label: 'Monthly revenue', type: 'number', placeholder: '0' },
  { name: 'monthlyCost', label: 'Monthly cost', type: 'number', placeholder: '0' },
  { name: 'customers', label: 'Customers / users', type: 'number', placeholder: '0' },
  { name: 'nextStep', label: 'Next step', placeholder: 'The next concrete thing to do' },
  { name: 'lastDid', label: 'What we just did', placeholder: 'Most recent progress' },
  { name: 'liveUrl', label: 'Live URL', type: 'url', placeholder: 'https://...' },
  { name: 'notes', label: 'Notes', type: 'textarea', rows: 4 },
];

const SUBTABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'ventures', label: 'Ventures' },
];

export function BusinessTab({ accent }) {
  const [sub, setSub] = useStore('business-subtab', 'overview');
  const current = SUBTABS.some((s) => s.id === sub) ? sub : 'overview';
  return html`<div class="business">
    <div class="subtabs">
      ${SUBTABS.map(
        (s) => html`<button key=${s.id} class=${`subtab ${s.id === current ? 'active' : ''}`}
          onClick=${() => setSub(s.id)}>${s.label}</button>`
      )}
    </div>
    <div class="subtab-body">
      ${current === 'overview' && html`<${OverviewTab} accent=${accent} onOpenVentures=${() => setSub('ventures')} />`}
      ${current === 'ventures' && html`<${VenturesTab} accent=${accent} />`}
    </div>
  </div>`;
}

// ---- Overview: rolled-up metrics across every venture ----------------------
function OverviewTab({ accent, onOpenVentures }) {
  const [ventures] = useStore('business-ventures', []);

  const totals = useMemo(() => {
    const revenue = ventures.reduce((s, v) => s + (Number(v.monthlyRevenue) || 0), 0);
    const cost = ventures.reduce((s, v) => s + (Number(v.monthlyCost) || 0), 0);
    return { count: ventures.length, revenue, cost, profit: revenue - cost };
  }, [ventures]);

  const ranked = useMemo(
    () => [...ventures].sort((a, b) => (Number(b.monthlyRevenue) || 0) - (Number(a.monthlyRevenue) || 0)),
    [ventures]
  );

  if (ventures.length === 0) {
    return html`<${EmptyState} icon="business" text="No businesses tracked yet."
      hint="Add your first venture in the Ventures tab — even one that's just an idea." />`;
  }

  return html`<div class="biz-overview">
    <div class="biz-stats">
      <div class="biz-stat-total"><strong>${totals.count}</strong> venture${totals.count === 1 ? '' : 's'}</div>
      <div class="biz-stat-row">
        <span class="biz-stat" style=${{ '--col': '#10b981' }}><strong>${fmtMoney(totals.revenue)}</strong>/mo revenue</span>
        <span class="biz-stat" style=${{ '--col': '#f97316' }}><strong>${fmtMoney(totals.cost)}</strong>/mo cost</span>
        <span class="biz-stat" style=${{ '--col': totals.profit >= 0 ? '#10b981' : '#ef4444' }}>
          <strong>${totals.profit >= 0 ? fmtMoney(totals.profit) : `-${fmtMoney(Math.abs(totals.profit))}`}</strong>/mo profit
        </span>
      </div>
    </div>

    <div class="biz-rank">
      ${ranked.map((v) => {
        const stage = normStage(v);
        return html`<button key=${v.id} class="biz-rank-row" style=${{ '--stage': stageColor[stage] }} onClick=${onOpenVentures}>
          <span class="kanban-dot"></span>
          <span class="biz-rank-name">${v.name}</span>
          <${Badge} color=${stageColor[stage]}>${stage}<//>
          <span class="biz-rank-rev">${fmtMoney(v.monthlyRevenue)}/mo</span>
        </button>`;
      })}
    </div>
  </div>`;
}

// ---- Ventures: pipeline board, same shape as the Projects tab --------------
function VenturesTab({ accent }) {
  const [ventures, setVentures] = useStore('business-ventures', []);
  const [query, setQuery] = useState('');
  const [view, setView] = useState('pipeline');
  const [stageFilter, setStageFilter] = useState('All');
  const [modal, setModal] = useState(null); // { editing }
  const [detailId, setDetailId] = useState(null);
  const [dragId, setDragId] = useState(null);
  const confirm = useConfirm();

  const save = (values) => {
    const now = new Date().toISOString();
    if (modal.editing) {
      const prev = modal.editing;
      const next = { ...prev, ...values };
      if (values.stage && values.stage !== prev.stage) next._stagedAt = now;
      setVentures(ventures.map((v) => (v.id === prev.id ? next : v)));
    } else {
      setVentures([{ id: uid(), _created: now, _stagedAt: now, ...values }, ...ventures]);
    }
    setModal(null);
  };

  const moveTo = (id, stage) =>
    setVentures(ventures.map((v) => (v.id === id && v.stage !== stage ? { ...v, stage, _stagedAt: new Date().toISOString() } : v)));
  const patchVenture = (id, patch) => setVentures(ventures.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const remove = (v) => confirm(`Delete "${v.name}"?`, () => setVentures(ventures.filter((x) => x.id !== v.id)));

  const detailVenture = detailId ? ventures.find((v) => v.id === detailId) : null;

  const filtered = useMemo(
    () => ventures.filter((v) =>
      (stageFilter === 'All' || normStage(v) === stageFilter) &&
      matchesQuery(query, v.name, v.notes, v.nextStep)),
    [ventures, query, stageFilter]
  );

  const stageCounts = useMemo(() => {
    const counts = { All: 0 };
    STAGES.forEach((s) => { counts[s] = 0; });
    ventures.forEach((v) => {
      if (!matchesQuery(query, v.name, v.notes, v.nextStep)) return;
      counts.All += 1;
      counts[normStage(v)] = (counts[normStage(v)] || 0) + 1;
    });
    return counts;
  }, [ventures, query]);
  const stageFilterOptions = ['All', ...STAGES].map((s) => ({
    value: s, label: stageCounts[s] ? `${s} ${stageCounts[s]}` : s,
  }));

  const inStage = (stage) =>
    filtered.filter((v) => normStage(v) === stage)
      .sort((a, b) => (a._stagedAt || a._created || '').localeCompare(b._stagedAt || b._created || ''));

  const card = (v, showStage) => {
    const stage = normStage(v);
    const menuItems = [
      { label: 'Open details', icon: 'external', onClick: () => setDetailId(v.id) },
      v.liveUrl && { label: 'Open live site', icon: 'external', onClick: () => window.open(v.liveUrl, '_blank', 'noreferrer') },
      { label: 'Edit', icon: 'edit', onClick: () => setModal({ editing: v }) },
      { divider: true },
      { info: 'Move to' },
      ...STAGES.map((s) => ({ label: s, dot: stageColor[s], current: s === stage, onClick: () => moveTo(v.id, s) })),
      { divider: true },
      { label: 'Delete', icon: 'trash', danger: true, onClick: () => remove(v) },
    ].filter(Boolean);

    return html`<div class="ppl-card" key=${v.id} style=${{ '--stage': stageColor[stage] }}
      draggable=${view === 'pipeline'} onDragStart=${() => setDragId(v.id)} onDragEnd=${() => setDragId(null)}>
      <div class="ppl-head">
        <h3 class="ppl-title ppl-title-link" title="Open details" onClick=${() => setDetailId(v.id)}>${v.name}</h3>
        <${IconButton} name="expand" title="Open details" onClick=${() => setDetailId(v.id)} />
        <${CardMenu} items=${menuItems} />
      </div>
      ${showStage && html`<div><${Badge} color=${stageColor[stage]}>${stage}<//></div>`}
      ${v.description && html`<p class="ppl-inline desc" style=${{ cursor: 'default' }}>${v.description}</p>`}
      <div class="biz-metrics">
        <span class="biz-metric" title="Monthly revenue"><${Icon} name="business" size=${13} /> ${fmtMoney(v.monthlyRevenue)}/mo</span>
        <span class="biz-metric muted-text" title="Monthly cost">cost ${fmtMoney(v.monthlyCost)}</span>
        <span class="biz-metric muted-text" title="Customers / users">${fmtNum(v.customers)} customers</span>
      </div>
      ${v.nextStep && html`<div class="ppl-inline next"><span class="ppl-next-label">Next</span>${v.nextStep}</div>`}
      ${v.lastDid && html`<div class="ppl-inline did"><span class="ppl-next-label">Just did</span>${v.lastDid}</div>`}
      ${v.liveUrl && html`<a class="ppl-link" href=${v.liveUrl} ...${externalLinkProps()}>
        <${Icon} name="external" size=${14} /> Live<//>`}
    </div>`;
  };

  return html`<div class="collection" style=${{ '--accent': accent }}>
    <div class="toolbar">
      <${SearchBox} value=${query} onChange=${setQuery} placeholder="Search ventures..." />
      <${Segmented} options=${[{ value: 'pipeline', label: 'Pipeline' }, { value: 'grid', label: 'Grid' }]}
        value=${view} onChange=${setView} />
      <div class="toolbar-spacer"></div>
      <${Button} variant="primary" icon="plus" onClick=${() => setModal({ editing: null })}>Add venture<//>
    </div>

    ${ventures.length > 0 && html`<div class="filter-group ppl-stage-filter">
      <span class="filter-label">Stage</span>
      <${Segmented} options=${stageFilterOptions} value=${stageFilter} onChange=${setStageFilter} />
    </div>`}

    ${ventures.length === 0 &&
    html`<${EmptyState} icon="business" text="No ventures yet."
      hint="Add a business idea at any stage — even one that's just a concept. Drag cards left→right as they progress." />`}

    ${ventures.length > 0 && view === 'pipeline' &&
    html`<div class=${`projects-board ${dragId ? 'dragging' : ''}`}>
      ${STAGES.filter((stage) => stageFilter === 'All' || stage === stageFilter).map((stage) => {
        const col = inStage(stage);
        return html`<section class=${`stage-group ${col.length === 0 ? 'empty' : ''}`} key=${stage}
          style=${{ '--stage': stageColor[stage] }}
          onDragOver=${(e) => e.preventDefault()}
          onDrop=${() => { if (dragId) moveTo(dragId, stage); setDragId(null); }}>
          <div class="stage-head"><span class="dot"></span>${stage}<span class="stage-count">${col.length || ''}</span></div>
          <div class="stage-cards">${col.map((v) => card(v, false))}</div>
        </section>`;
      })}
    </div>`}

    ${ventures.length > 0 && view === 'grid' &&
    html`<div class="cards-grid ppl-grid">${filtered.map((v) => card(v, true))}</div>`}

    ${modal &&
    html`<${Modal} title=${modal.editing ? 'Edit venture' : 'New venture'} accent=${accent} onClose=${() => setModal(null)}>
      <${Form} fields=${FIELDS} initial=${modal.editing} onSubmit=${save} onCancel=${() => setModal(null)} />
    <//>`}

    ${detailVenture &&
    html`<${DetailModal} venture=${detailVenture} accent=${accent}
      onClose=${() => setDetailId(null)}
      onEdit=${() => { setModal({ editing: detailVenture }); setDetailId(null); }}
      onMove=${(s) => moveTo(detailVenture.id, s)}
      patch=${(patch) => patchVenture(detailVenture.id, patch)} />`}
  </div>`;
}

function DetailModal({ venture: v, accent, onClose, onEdit, onMove, patch }) {
  const [draft, setDraft] = useState('');
  const stage = normStage(v);
  const log = Array.isArray(v.log) ? v.log : [];

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

  return html`<${Modal} title=${v.name} accent=${accent} onClose=${onClose}>
    <div class="pd">
      <div class="pd-toprow">
        <${Badge} color=${stageColor[stage]}>${stage}<//>
        <div class="pd-move">
          ${STAGES.map((s) => html`<button key=${s} type="button" class=${`pd-move-btn ${s === stage ? 'current' : ''}`}
            style=${{ '--stage': stageColor[s] }} disabled=${s === stage} onClick=${() => onMove(s)}>${s}</button>`)}
        </div>
        <div class="pd-top-spacer"></div>
        <${Button} variant="ghost" icon="edit" onClick=${onEdit}>Edit<//>
      </div>

      ${field('What it is', v.description)}

      <div class="biz-metrics-detail">
        <div class="pd-field"><div class="pd-label">Monthly revenue</div><div class="pd-value">${fmtMoney(v.monthlyRevenue)}</div></div>
        <div class="pd-field"><div class="pd-label">Monthly cost</div><div class="pd-value">${fmtMoney(v.monthlyCost)}</div></div>
        <div class="pd-field"><div class="pd-label">Customers</div><div class="pd-value">${fmtNum(v.customers)}</div></div>
      </div>

      ${field('Next step', v.nextStep)}
      ${field('Just did', v.lastDid)}
      ${v.notes && html`<div class="pd-field"><div class="pd-label">Notes</div><div class="pd-value">${v.notes}</div></div>`}
      ${v.liveUrl && html`<div class="pd-links">
        <a class="ppl-link" href=${v.liveUrl} target="_blank" rel="noreferrer"><${Icon} name="external" size=${14} /> Live<//>
      </div>`}

      <div class="pd-meta-line">
        ${v._created ? `Added ${fmtDate(v._created)}` : ''}
        ${v._stagedAt ? ` · In ${stage} since ${fmtDate(v._stagedAt)}` : ''}
      </div>

      <div class="pd-journal">
        <div class="pd-label">Journal <span class="pd-count">${log.length || ''}</span></div>
        <p class="pd-hint">Log what you worked on so you can pick it back up later.</p>
        <div class="pd-entry-new">
          <textarea class="pd-textarea" rows=${2} value=${draft}
            placeholder="What did you do / what's going on with this venture?"
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

// Small "⋯" overflow menu — same behavior as the one in projects.js, kept
// local since it isn't exported from there.
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
            disabled=${it.current} onClick=${() => { setOpen(false); it.onClick(); }}>
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
